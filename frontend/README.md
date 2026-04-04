# MARi Secure Training – Frontend

React frontend for the FedRAMP Training Creator (login, registration, and training UI).

## What is implemented

- Admin and employee route separation.
- Training Modules page that reads generated training rows from Supabase.
- Admin feedback controls for training outputs (`+1 Helpful`, `-1 Needs Work`) wired to `POST /api/feedback`.

## Running the app

```bash
npm i
npm run dev
```

## Environment

Create frontend/.env.local with:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Backend API base URL is currently hardcoded to http://127.0.0.1:8000 in the training feedback call path.
