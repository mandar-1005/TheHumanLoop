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

Open API docs at http://127.0.0.1:8000/docs.
Note: GET / returns 404 because no root route is defined.

## Key Endpoints

- POST /api/trainings/create
- POST /grading/grade
- POST /grading/regrade
- POST /api/feedback

Feedback payload:

{
	"training_id": 42,
	"user_id": "11111111-1111-1111-1111-111111111111",
	"positive_score": 1
}

Rules:

- positive_score must be 1 or -1
- user_id must be a valid UUID
- only admin users can submit feedback

## Run Tests

From backend/services/fedramp_agents:

python -m app.tests.test_api_key
python -m app.tests.test_orchestrator
python -m app.tests.test_supabase_pipeline
python -m pytest app/tests/test_grading_endpoints.py -q
python -m pytest app/tests/test_feedback_endpoint.py -q

To run all tests:

python -m pytest app/tests -q

## Notes

- Imports should use the app package path, for example:
  from app.database.supabase_client import supabase
  from app.pipeline.orchestrator import generate_training
- Keep .env at backend/services/fedramp_agents so load_dotenv can find it.
- Run tests from backend/services/fedramp_agents so app package imports resolve correctly.
