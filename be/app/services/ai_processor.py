import tempfile
import os
import asyncio
from datetime import UTC, datetime

from faster_whisper import WhisperModel
from pyannote.audio import Pipeline
import torch

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.supabase import get_storage_client
from app.models.project import ProcessingJob, MeetingFile, Speaker, TranscriptSegment, MeetingVersion

# Khởi tạo model ở mức global để không phải load lại từ đầu mỗi khi gọi API
device = "cuda" if torch.cuda.is_available() else "cpu"
compute_type = "float16" if device == "cuda" else "int8"

print("Loading Faster-Whisper...")
whisper_model = WhisperModel("base", device=device, compute_type=compute_type)

print("Loading Pyannote Diarization...")
# Cần auth_token từ HuggingFace để tải model
diarization_pipeline = Pipeline.from_pretrained(
    "pyannote/speaker-diarization-3.1",
    use_auth_token=settings.HF_TOKEN
)
if device == "cuda":
    diarization_pipeline.to(torch.device("cuda"))


async def process_meeting_audio_task(meeting_id: str, job_id: str, current_user_id: str, db: AsyncSession):
    """
    Hàm này sẽ được chạy ngầm (Background Task)
    """
    try:
        # 1. Đổi trạng thái Job thành đang chạy
        job = await db.scalar(select(ProcessingJob).where(ProcessingJob.id == job_id))
        if job:
            job.status = "running"
            await db.commit()

        # 2. Lấy thông tin file audio từ database
        meeting_file = await db.scalar(
            select(MeetingFile).where(
                MeetingFile.meeting_id == meeting_id,
                MeetingFile.deleted_at.is_(None)
            ).order_by(MeetingFile.created_at.desc())
        )
        if not meeting_file:
            raise Exception("Không tìm thấy file ghi âm cho cuộc họp này.")

        # 3. Tải file từ Supabase xuống ổ cứng tạm
        storage_client = get_storage_client()
        file_bytes = await storage_client.from_(settings.SUPABASE_BUCKET).download(meeting_file.storage_key)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            tmp_file.write(file_bytes)
            tmp_filepath = tmp_file.name

        # 4. Chạy Pyannote Diarization
        print("Bắt đầu phân chia giọng nói...")
        # Pyannote chạy đồng bộ (synchronous), ta dùng asyncio.to_thread để không block server
        diarization = await asyncio.to_thread(diarization_pipeline, tmp_filepath)

        # 5. Chạy Faster-Whisper
        print("Bắt đầu chuyển âm thanh thành văn bản...")
        segments_generator, info = await asyncio.to_thread(
            whisper_model.transcribe, tmp_filepath, beam_size=5, language="vi"
        )
        whisper_segments = list(segments_generator) # Convert generator to list

        # Xóa file tạm sau khi xử lý xong
        os.remove(tmp_filepath)

        # 6. Đảm bảo Meeting Version = 1 tồn tại
        now = datetime.now(UTC)
        version = await db.scalar(select(MeetingVersion).where(MeetingVersion.meeting_id == meeting_id, MeetingVersion.version_no == 1))
        if not version:
            version = MeetingVersion(
                meeting_id=meeting_id, version_no=1, change_note="Initial AI Transcript",
                created_by=current_user_id, updated_by=current_user_id
            )
            db.add(version)
            await db.flush()

        # 7. Merge kết quả & Lưu vào Database
        print("Ghi nhận kết quả vào Database...")
        unique_speakers = set()
        
        for segment in whisper_segments:
            start_sec = segment.start
            end_sec = segment.end
            text = segment.text.strip()
            midpoint = start_sec + (end_sec - start_sec) / 2

            # Tìm xem tại thời điểm (midpoint) này, ai đang nói (theo Pyannote)
            assigned_speaker = "UNKNOWN"
            for turn, _, speaker_label in diarization.itertracks(yield_label=True):
                if turn.start <= midpoint <= turn.end:
                    assigned_speaker = speaker_label
                    break
            
            unique_speakers.add(assigned_speaker)

            # Lưu từng đoạn Transcript
            transcript_seg = TranscriptSegment(
                meeting_id=meeting_id,
                version_no=1,
                speaker_label=assigned_speaker,
                start_ms=int(start_sec * 1000),
                end_ms=int(end_sec * 1000),
                text=text,
                source="ai",
                created_by=current_user_id,
                updated_by=current_user_id
            )
            db.add(transcript_seg)

        # 8. Lưu danh sách Speaker
        for spk_label in unique_speakers:
            speaker_record = Speaker(
                meeting_id=meeting_id,
                speaker_label=spk_label,
                display_name=spk_label,
                is_confirmed=False,
                created_by=current_user_id,
                updated_by=current_user_id
            )
            db.add(speaker_record)

        # 9. Hoàn thành
        job.status = "completed"
        job.progress = 100
        job.finished_at = datetime.now(UTC)
        await db.commit()
        print(f"Xử lý thành công cuộc họp {meeting_id}!")

    except Exception as e:
        print(f"Lỗi khi xử lý AI: {str(e)}")
        # Cập nhật trạng thái lỗi
        job = await db.scalar(select(ProcessingJob).where(ProcessingJob.id == job_id))
        if job:
            job.status = "failed"
            job.error_message = str(e)
            job.finished_at = datetime.now(UTC)
            await db.commit()