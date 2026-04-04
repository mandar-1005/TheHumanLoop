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

Open Swagger at http://127.0.0.1:8000/docs.

## API Surface (current)

- POST /api/trainings/create
- POST /grading/grade
- POST /grading/regrade
- POST /api/feedback

Feedback endpoint details:

- Request body fields: training_id (int8), user_id (UUID), positive_score (1 or -1)
- Behavior: increments or decrements trainings.positive_score
- Authorization: admin users only

## Tests

From backend/services/fedramp_agents:

1. python -m pytest app/tests/test_grading_endpoints.py -q
2. python -m pytest app/tests/test_feedback_endpoint.py -q
3. python -m pytest app/tests -q

## Environment

Create:
backend/services/fedramp_agents/.env

Required keys:

GOOGLE_GENAI_USE_VERTEXAI
GOOGLE_API_KEY
SUPABASE_URL
SUPABASE_KEY
