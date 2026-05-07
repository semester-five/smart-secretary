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
_diarization_failed = False   # FIX Bug 3: tách biệt "chưa load" vs "load thất bại"


# ---------------------------------------------------------------------------
# Model initialization
# ---------------------------------------------------------------------------
def _initialize_models() -> None:
    global whisper_model, diarization_pipeline, _diarization_failed

    if whisper_model is None:
        print("Loading Faster-Whisper [large-v3-turbo]...")
        whisper_model = WhisperModel(
            "large-v3-turbo",
            device=device,
            compute_type=compute_type,
        )
        print("✅ Whisper loaded.")

    if diarization_pipeline is None and not _diarization_failed:
        try:
            from pyannote.audio import Pipeline

            print("Loading Pyannote Diarization [speaker-diarization-3.1]...")
            diarization_pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                token=settings.HF_TOKEN,
            )
            if device == "cuda":
                diarization_pipeline.to(torch.device("cuda"))
            print("✅ Pyannote loaded.")
        except Exception as exc:
            _diarization_failed = True   # FIX Bug 3: không dùng sentinel False nữa
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

    tmp_filepath: str | None = None

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
        # FIX Bug 1 & 2: Pipeline.__call__ luôn trả về Annotation trực tiếp.
        # Không cần check .speaker_diarization — attribute đó không tồn tại
        # trong pyannote.audio 3.x khi gọi pipeline(audio_path).
        annotation = None
        if diarization_pipeline is not None:
            print("Bắt đầu phân chia giọng nói (Pyannote)...")
            try:
                # Pipeline.__call__ trả về pyannote.core.Annotation trực tiếp
                annotation = await asyncio.to_thread(
                    diarization_pipeline, tmp_filepath
                )
                print(f"✅ Diarization xong. Số speakers: {len(annotation.labels())}")
            except Exception as exc:
                annotation = None
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
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
            word_timestamps=True,
            condition_on_previous_text=False,
        )
        whisper_segments = list(segments_generator)
        print(
            f"✅ Whisper xong. Ngôn ngữ detect: {info.language} "
            f"({info.language_probability:.0%}), {len(whisper_segments)} segments."
        )

        # Xóa file tạm sau khi cả 2 model đã xử lý xong
        os.remove(tmp_filepath)
        tmp_filepath = None

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

        # 7. Merge kết quả & Xác định Speaker
        print("Xác định người nói cho từng đoạn...")
        segment_speaker_assignments = []
        unique_speakers = set()
        
        for segment in whisper_segments:
            start_sec = segment.start
            end_sec = segment.end
            midpoint = start_sec + (end_sec - start_sec) / 2

            assigned_speaker = "UNKNOWN"
            if diarization is not None:
                for turn, _, speaker_label in diarization.itertracks(yield_label=True):
                    if turn.start <= midpoint <= turn.end:
                        assigned_speaker = speaker_label
                        break
            
            unique_speakers.add(assigned_speaker)
            segment_speaker_assignments.append({
                "segment": segment,
                "assigned_speaker": assigned_speaker
            })

        # 8. Lưu danh sách Speaker
        print("Lưu thông tin người nói vào Database...")
        speaker_colors = ["blue", "violet", "emerald", "rose", "amber", "cyan"]
        speaker_map = {}
        for idx, spk_label in enumerate(sorted(unique_speakers)):
            color = speaker_colors[idx % len(speaker_colors)]
            speaker_record = Speaker(
                meeting_id=meeting_id,
                speaker_label=spk_label,
                display_name=spk_label,
                color_label=color,
                is_confirmed=False,
                created_by=current_user_id,
                updated_by=current_user_id
            )
            db.add(speaker_record)
            speaker_map[spk_label] = speaker_record
            
        await db.flush()

        # 9. Lưu từng đoạn Transcript với speaker_id
        print("Ghi nhận transcript vào Database...")
        for item in segment_speaker_assignments:
            segment = item["segment"]
            assigned_speaker = item["assigned_speaker"]
            
            transcript_seg = TranscriptSegment(
                meeting_id=meeting_id,
                version_no=1,
                speaker_id=speaker_map[assigned_speaker].id,
                start_ms=int(segment.start * 1000),
                end_ms=int(segment.end * 1000),
                text=segment.text.strip(),
                source="ai",
                created_by=current_user_id,
                updated_by=current_user_id
            )
            db.add(transcript_seg)

        # 10. Hoàn thành
        job.status = "completed"
        job.progress = 100
        job.finished_at = datetime.now(UTC)
        await db.commit()
        print(f"✅ Xử lý thành công cuộc họp {meeting_id}!")

    except Exception as e:
        print(f"❌ Lỗi khi xử lý AI: {e}")
        # Cleanup file tạm nếu chưa xóa
        if tmp_filepath and os.path.exists(tmp_filepath):
            os.remove(tmp_filepath)
        job = await db.scalar(select(ProcessingJob).where(ProcessingJob.id == job_id))
        if job:
            job.status        = "failed"
            job.error_message = str(e)
            job.finished_at   = datetime.now(UTC)
            await db.commit()