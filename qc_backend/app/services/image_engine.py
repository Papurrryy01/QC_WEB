from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import JobStatus, JobType
from app.schemas.assets import GenerateBackgroundRequest, GenerateBackgroundResponse
from app.services.openai_client import openai_service
from app.services.repository import create_generation_job


class ImageEngine:
    async def generate_background(
        self,
        db: AsyncSession,
        payload: GenerateBackgroundRequest,
    ) -> GenerateBackgroundResponse:
        job = await create_generation_job(
            db,
            user_id=payload.user_id,
            moment_id=payload.moment_id,
            job_type=JobType.image,
            metadata={"prompt": payload.prompt, "size": payload.size},
        )
        await db.flush()

        job.status = JobStatus.processing
        await db.flush()

        result = await openai_service.generate_image(prompt=payload.prompt, size=payload.size)
        if result.b64_json:
            job.status = JobStatus.done
            job.metadata_json = {
                **job.metadata_json,
                "revised_prompt": result.revised_prompt,
                "mime_type": "image/png",
            }
        else:
            job.status = JobStatus.failed
            job.error_message = "No image data returned"

        await db.commit()

        return GenerateBackgroundResponse(
            job_id=job.id,
            status=job.status.value,
            image_b64=result.b64_json,
            mime_type="image/png" if result.b64_json else None,
            result_url=job.result_url,
        )


image_engine = ImageEngine()
