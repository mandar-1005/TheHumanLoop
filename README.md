#Secure Training – FedRAMP Training Creator

A **company-facing tool** that creates FedRAMP compliance trainings. Companies provide an **SSP** (System Security Plan) and **role definitions**; the system outputs a **training module** (study guide + role-based assessment). Employees then take that training; assessment format varies by role (e.g. multiple choice for developers, case studies with AI grading for leads), aligned with **Bloom’s taxonomy**.

## Product focus

- **Primary user:** Companies creating FedRAMP training (input: SSP + roles → output: training module).
- **Output:** Study guide + assessment (MC, short response, case studies, flashcards; format by role).
- **Differentiation:** Role-based assessment design (remembering vs applying vs creating), not a generic study app (e.g. NotebookLM).

## Features (vision)

- **Authoring:** Upload or provide SSP (synthetic for demo); define roles (e.g. 4 Roles : developers, security leads, developer team leads, + one).
- **Training generation:** Agents create role-specific content from FedRAMP/SSP → study guide + assessment.
- **Role-based assessments:** MC, short response, case studies (AI-graded), flashcards; format tied to Bloom’s level per role.
- **Taking training:** Employees take generated modules and assessments (in-app or export).
- **Auth & security:** Work email, organization, role; FedRAMP-oriented controls, RLS, 2FA where needed.

## Current implementation highlights

- Training generation endpoint is available at `POST /api/trainings/create`.
- Grading endpoints are available at `POST /grading/grade` and `POST /grading/regrade`.
- Admin feedback endpoint is available at `POST /api/feedback` with `positive_score` values of `1` or `-1`.
- Training feedback is stored as an aggregate `positive_score` on the `trainings` table.

## Tech stack

- **Frontend:** React, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Storage, Auth)
- **AI:** Google ADK Agent (content generation, case-study grading)
- **Deployment:** VirginTech Arc / cslaunch.vt

## Getting started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### Backend (FedRAMP agents)

```python -m pip install -r backend/services/fedramp_agents/app/requirements.txt
cd backend/services/fedramp_agents
uvicorn app.main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs

### Run backend tests

```bash
cd backend/services/fedramp_agents
python -m pytest app/tests -q
```

### Environment variables

See `.env.example` for required variables.

Backend expects `SUPABASE_URL` and service role `SUPABASE_KEY` in backend/services/fedramp_agents/.env.

## Project structure

```
├── frontend/          # React app (Login, Register, authoring & training UI)
├── backend/           # API routes and services
├── supabase/          # Database migrations and config
├── scripts/           # SSP processing, agent integration
└── docs/              # Documentation (PRODUCT_VISION, roadmap, schema)
```

## Documentation

- [Product Vision](./docs/PRODUCT_VISION.md) – SSP + roles → training module, Bloom’s-aligned assessments.
- [Development Roadmap](./docs/DEVELOPMENT_ROADMAP.md) – phases and tasks.
- [Contributing](./docs/CONTRIBUTING.md) – guidelines.

## License

MIT
