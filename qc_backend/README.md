# QC Backend

FastAPI backend for QC's multimodal emotional creation engine.

## What is included

- OpenAI Responses API chat + structured builder modes
- SSE streaming endpoint for token-by-token chat
- OpenAI Realtime session provisioning endpoint
- OpenAI image generation endpoint
- OpenAI speech-to-text + text-to-speech endpoints
- SQLAlchemy async models for conversations, moments, jobs, and assets
- Alembic migration baseline
- Redis/RQ worker scaffolding for async generation jobs

## Folder structure

```text
qc_backend/
  app/
    api/
      routes/
        chat.py
        moments.py
        assets.py
        realtime.py
        conversations.py
        health.py
      router.py
    core/
      config.py
      logging.py
    db/
      base.py
      session.py
    models/
      *.py
    prompts/
      system.py
    schemas/
      *.py
    services/
      *.py
    workers/
      jobs.py
    main.py
  alembic/
    env.py
    versions/
      20260411_0001_initial_schema.py
  alembic.ini
  .env.example
  pyproject.toml
```

## Environment

Copy and edit:

```bash
cp .env.example .env
```

Required values:

- `OPENAI_API_KEY`
- `DATABASE_URL`
- `REDIS_URL`

## Install

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

## Database migrate

```bash
alembic upgrade head
```

## Run API

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8080
```

## Run worker

```bash
rq worker -u redis://localhost:6379/0 qc-jobs
```

## API surface

- `POST /api/chat`
- `POST /api/chat/stream`
- `POST /api/moments/ideate`
- `POST /api/moments/rewrite`
- `POST /api/moments/reveal-plan`
- `POST /api/moments/render-scene`
- `POST /api/assets/generate-background`
- `POST /api/assets/generate-voice`
- `POST /api/assets/transcribe`
- `POST /api/realtime/session`
- `GET /api/conversations/{id}`
- `POST /api/conversations`
- `GET /api/health`
