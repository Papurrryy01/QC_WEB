from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from redis import Redis
from rq import Queue, Worker

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

JobType = Literal["image", "voice", "scene"]


@dataclass(slots=True)
class QueuedJob:
    id: str
    type: JobType


def _redis() -> Redis:
    return Redis.from_url(settings.redis_url)


def _queue(name: str = "qc-jobs") -> Queue:
    return Queue(name, connection=_redis())


def enqueue_generation_job(job_type: JobType, payload: dict[str, Any]) -> QueuedJob:
    queue = _queue()
    rq_job = queue.enqueue("app.workers.jobs.process_generation_job", job_type, payload)
    logger.info("Queued %s job %s", job_type, rq_job.id)
    return QueuedJob(id=rq_job.id, type=job_type)


def process_generation_job(job_type: JobType, payload: dict[str, Any]) -> dict[str, Any]:
    logger.info("Processing %s job", job_type)
    # Keep this orchestrator pure and easy to extend. CPU/IO heavy work should be delegated
    # to dedicated service methods per job type.
    if job_type == "image":
        return {"status": "done", "type": "image", "payload": payload}
    if job_type == "voice":
        return {"status": "done", "type": "voice", "payload": payload}
    if job_type == "scene":
        return {"status": "done", "type": "scene", "payload": payload}
    return {"status": "failed", "error": f"Unsupported job type: {job_type}"}


def run_worker(queue_name: str = "qc-jobs") -> None:
    worker = Worker([_queue(queue_name)], connection=_redis())
    worker.work(with_scheduler=True)
