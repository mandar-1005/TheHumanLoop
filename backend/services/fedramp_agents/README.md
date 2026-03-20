# FedRAMP Agents Service

## Setup

1. Open a terminal in this folder:
	backend/services/fedramp_agents
2. Install dependencies:
	python -m pip install -r app/requirements.txt

## Environment Variables

Create a file named .env in this folder:
backend/services/fedramp_agents/.env

Add:

GOOGLE_GENAI_USE_VERTEXAI=FALSE
GOOGLE_API_KEY=your_gemini_api_key
SUPABASE_URL=your_project_url
SUPABASE_KEY=your_supabase_service_role_key

## Run FastAPI

From backend/services/fedramp_agents:

uvicorn app.main:app --reload --port 8000

## Run Tests

From backend/services/fedramp_agents:

python -m app.tests.test_api_key
python -m app.tests.test_orchestrator
python -m app.tests.test_supabase_pipeline

## Notes

- Imports should use the app package path, for example:
  from app.database.supabase_client import supabase
  from app.pipeline.orchestrator import generate_training
- Keep .env at backend/services/fedramp_agents so load_dotenv can find it.
