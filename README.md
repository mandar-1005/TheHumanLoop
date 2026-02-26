# MARi Secure Training – FedRAMP Training Creator

A **company-facing tool** that creates FedRAMP compliance trainings. Companies (e.g. MARi) provide an **SSP** (System Security Plan) and **role definitions**; the system outputs a **training module** (study guide + role-based assessment). Employees then take that training; assessment format varies by role (e.g. multiple choice for developers, case studies with AI grading for leads), aligned with **Bloom’s taxonomy**.

## Product focus

- **Primary user:** Companies creating FedRAMP training (input: SSP + roles → output: training module).
- **Output:** Study guide + assessment (MC, short response, case studies, flashcards; format by role).
- **Differentiation:** Role-based assessment design (remembering vs applying vs creating), not a generic study app (e.g. NotebookLM).

## Features (vision)

- **Authoring:** Upload or provide SSP (synthetic for demo); define roles (e.g. MARi’s 4: developers, security leads, developer team leads, + one).
- **Training generation:** Agents create role-specific content from FedRAMP/SSP → study guide + assessment.
- **Role-based assessments:** MC, short response, case studies (AI-graded), flashcards; format tied to Bloom’s level per role.
- **Taking training:** Employees take generated modules and assessments (in-app or export).
- **Auth & security:** Work email, organization, role; FedRAMP-oriented controls, RLS, 2FA where needed.

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
npm install
cp .env.example .env.local
cd frontend && npm run dev
```

### Environment variables

See `.env.example` for required variables.

## Project structure

```
├── frontend/          # React app (Login, Register, authoring & training UI)
├── backend/           # API routes and services
├── supabase/          # Database migrations and config
├── scripts/           # SSP processing, agent integration
└── docs/              # Documentation (PRODUCT_VISION, roadmap, schema)
```

## Documentation

- [Product Vision](./docs/PRODUCT_VISION.md) – exact idea from Nancy meeting (SSP + roles → training module, Bloom’s).
- [Development Roadmap](./docs/DEVELOPMENT_ROADMAP.md) – phases and tasks.
- [Contributing](./docs/CONTRIBUTING.md) – guidelines.

## License

MIT
