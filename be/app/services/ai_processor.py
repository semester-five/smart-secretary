import tempfile
import os
import asyncio
from datetime import UTC, datetime

from faster_whisper import WhisperModel
import torchaudio
import torch

if not hasattr(torchaudio, "set_audio_backend"):
    torchaudio.set_audio_backend = lambda *args, **kwargs: None

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.project import ProcessingJob, MeetingFile, Speaker, TranscriptSegment, MeetingVersion
from app.core.supabase import get_storage_client

# ---------------------------------------------------------------------------
# Device setup
# ---------------------------------------------------------------------------
device = "cuda" if torch.cuda.is_available() else "cpu"
compute_type = "float16" if device == "cuda" else "int8"

whisper_model: WhisperModel | None = None
diarization_pipeline = None


# ---------------------------------------------------------------------------
# Model initialization 
# ---------------------------------------------------------------------------
def _initialize_models() -> None:
    global whisper_model, diarization_pipeline

    if whisper_model is None:
        print("Loading Faster-Whisper [large-v3-turbo]...")
        whisper_model = WhisperModel(
            "large-v3-turbo",
            device=device,
            compute_type=compute_type,
        )
        print("✅ Whisper loaded.")

    if diarization_pipeline is None:
        try:
            from pyannote.audio import Pipeline

            print("Loading Pyannote Diarization [speaker-diarization-3.1]...")
            diarization_pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                token=settings.HF_TOKEN,          # ← đổi use_auth_token → token
            )
            if device == "cuda":
                diarization_pipeline.to(torch.device("cuda"))
            print("✅ Pyannote loaded.")
        except Exception as exc:
            diarization_pipeline = False
            print(f"⚠️  Pyannote diarization disabled: {exc}")


# ---------------------------------------------------------------------------
# Helper: overlap scoring 
# ---------------------------------------------------------------------------
def _get_best_speaker(annotation, start_sec: float, end_sec: float) -> str:
    """
    Tính tổng thời gian overlap của mỗi speaker với segment Whisper,
    trả về speaker có overlap lớn nhất.
    Chính xác hơn midpoint khi 1 segment kéo dài qua nhiều người nói.
    """
    scores: dict[str, float] = {}
    for turn, _, label in annotation.itertracks(yield_label=True):
        overlap = min(turn.end, end_sec) - max(turn.start, start_sec)
        if overlap > 0:
            scores[label] = scores.get(label, 0) + overlap
    return max(scores, key=scores.get) if scores else "UNKNOWN"


# ---------------------------------------------------------------------------
# Main background task
# ---------------------------------------------------------------------------
async def process_meeting_audio_task(
    meeting_id: str,
    job_id: str,
    current_user_id: str,
    db: AsyncSession,
) -> None:
    """Chạy ngầm (Background Task): transcribe + diarize → lưu DB."""

    try:
        await asyncio.to_thread(_initialize_models)

        # 1. Đổi trạng thái Job → running
        job = await db.scalar(select(ProcessingJob).where(ProcessingJob.id == job_id))
        if job:
            job.status = "running"
            await db.commit()

        # 2. Lấy thông tin file audio mới nhất
        meeting_file = await db.scalar(
            select(MeetingFile)
            .where(
                MeetingFile.meeting_id == meeting_id,
                MeetingFile.deleted_at.is_(None),
            )
            .order_by(MeetingFile.created_at.desc())
        )
        if not meeting_file:
            raise Exception("Không tìm thấy file ghi âm cho cuộc họp này.")

        # 3. Tải file từ Supabase → ổ cứng tạm
        storage_client = get_storage_client()
        file_bytes = await storage_client.from_(settings.SUPABASE_BUCKET).download(
            meeting_file.storage_key
        )
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            tmp_file.write(file_bytes)
            tmp_filepath = tmp_file.name

        # 4. Diarization (Pyannote)
        annotation = None
        if diarization_pipeline not in (None, False):
            print("Bắt đầu phân chia giọng nói (Pyannote)...")
            try:
                diarization_output = await asyncio.to_thread(
                    diarization_pipeline, tmp_filepath
                )
                # DiarizeOutput (pyannote >= 3.x) chứa Annotation trong .speaker_diarization
                annotation = (
                    diarization_output.speaker_diarization
                    if hasattr(diarization_output, "speaker_diarization")
                    else diarization_output   # fallback nếu trả về Annotation trực tiếp
                )
                print("✅ Diarization xong.")
            except Exception as exc:
                print(f"⚠️  Diarization failed, fallback to UNKNOWN speaker: {exc}")
        else:
            print("⚠️  Skip diarization: model unavailable, fallback to UNKNOWN speaker.")

        # 5. Transcribe (Faster-Whisper large-v3-turbo)
        print("Bắt đầu chuyển âm thanh thành văn bản (Whisper)...")
        segments_generator, info = await asyncio.to_thread(
            whisper_model.transcribe,
            tmp_filepath,
            language="vi",
            beam_size=5,
            vad_filter=True,                    # lọc khoảng lặng → giảm hallucination
            vad_parameters=dict(min_silence_duration_ms=500),
            word_timestamps=True,               # timestamp cấp từ → map diarization chính xác hơn
            condition_on_previous_text=False,   # giảm lặp đoạn text lỗi
        )
        whisper_segments = list(segments_generator)
        print(f"✅ Whisper xong. Ngôn ngữ detect: {info.language} ({info.language_probability:.0%}), {len(whisper_segments)} segments.")

        # Xóa file tạm
        os.remove(tmp_filepath)

        # 6. Đảm bảo MeetingVersion = 1 tồn tại
        version = await db.scalar(
            select(MeetingVersion).where(
                MeetingVersion.meeting_id == meeting_id,
                MeetingVersion.version_no == 1,
            )
        )
        if not version:
            version = MeetingVersion(
                meeting_id=meeting_id,
                version_no=1,
                change_note="Initial AI Transcript",
                created_by=current_user_id,
                updated_by=current_user_id,
            )
            db.add(version)
            await db.flush()

        # 7. Merge Whisper + Diarization → lưu TranscriptSegment
        print("Ghi nhận kết quả vào Database...")
        unique_speakers: set[str] = set()

        for segment in whisper_segments:
            start_sec = segment.start
            end_sec   = segment.end
            text      = segment.text.strip()

            # Overlap scoring thay cho midpoint
            assigned_speaker = (
                _get_best_speaker(annotation, start_sec, end_sec)
                if annotation is not None
                else "UNKNOWN"
            )
            unique_speakers.add(assigned_speaker)

            db.add(TranscriptSegment(
                meeting_id=meeting_id,
                version_no=1,
                speaker_label=assigned_speaker,
                start_ms=int(start_sec * 1000),
                end_ms=int(end_sec * 1000),
                text=text,
                source="ai",
                created_by=current_user_id,
                updated_by=current_user_id,
            ))

        # 8. Lưu danh sách Speaker
        for spk_label in unique_speakers:
            db.add(Speaker(
                meeting_id=meeting_id,
                speaker_label=spk_label,
                display_name=spk_label,
                is_confirmed=False,
                created_by=current_user_id,
                updated_by=current_user_id,
            ))

        # 9. Hoàn thành
        job.status     = "completed"
        job.progress   = 100
        job.finished_at = datetime.now(UTC)
        await db.commit()
        print(f"✅ Xử lý thành công cuộc họp {meeting_id}!")

    except Exception as e:
        print(f"❌ Lỗi khi xử lý AI: {e}")
        job = await db.scalar(select(ProcessingJob).where(ProcessingJob.id == job_id))
        if job:
            job.status        = "failed"
            job.error_message = str(e)
            job.finished_at   = datetime.now(UTC)
            await db.commit()