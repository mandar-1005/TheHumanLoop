# Backend

FastAPI and service logic for FedRAMP training generation.

## Structure

- services/fedramp_agents/app/main.py: FastAPI entrypoint
- services/fedramp_agents/app/endpoints: API routes
- services/fedramp_agents/app/services: business logic
- services/fedramp_agents/app/crud: Supabase data access
- services/fedramp_agents/app/database: clients and environment loading
- services/fedramp_agents/app/pipeline: LLM agent pipeline
- services/fedramp_agents/app/schemas: request and response schemas
- services/fedramp_agents/app/tests: test scripts

## Local Run

1. cd backend/services/fedramp_agents
2. python -m pip install -r app/requirements.txt
3. uvicorn app.main:app --reload --port 8000

## Environment

Create:
backend/services/fedramp_agents/.env

Required keys:

GOOGLE_GENAI_USE_VERTEXAI
GOOGLE_API_KEY
SUPABASE_URL
SUPABASE_KEY
