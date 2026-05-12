# HumanLoop — Local Setup Guide

Follow these steps to get the project running on your machine.

## Prerequisites

- **Node.js 18+** — [download here](https://nodejs.org/)
- **Python 3.11+** — [download here](https://www.python.org/downloads/)
- **Git** — [download here](https://git-scm.com/)
- A **Google Cloud / Gemini API key** (you'll create your own — see below)

## 1. Clone the Repository

```bash
git clone https://github.com/mandar-1005/TheHumanLoop.git
cd TheHumanLoop
```

## 2. Set Up the Frontend

```bash
cd frontend
npm install
```

Create a file called `.env.local` inside the `frontend/` folder with this content:

```
VITE_SUPABASE_URL=https://ehyvnclzcmazhxcdwsxn.supabase.co/
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoeXZuY2x6Y21hemh4Y2R3c3huIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE1ODYwOSwiZXhwIjoyMDg3NzM0NjA5fQ.qKsWEYQcmLPnihlv0pix6HyCaLm5thS4fcfaiexKcQY
VITE_API_BASE_URL=http://127.0.0.1:8000
```

> These Supabase credentials are shared — you don't need to create your own.

Start the frontend:

```bash
npm run dev
```

The app will be running at **http://localhost:5173**.

## 3. Set Up the Backend

Open a **new terminal** and run:

```bash
cd backend/services/fedramp_agents
pip install -r app/requirements.txt
```

Create a file called `.env` inside `backend/services/fedramp_agents/` with this content:

```
GOOGLE_API_KEY=<YOUR_GEMINI_API_KEY>
SUPABASE_URL=https://ehyvnclzcmazhxcdwsxn.supabase.co/
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoeXZuY2x6Y21hemh4Y2R3c3huIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE1ODYwOSwiZXhwIjoyMDg3NzM0NjA5fQ.qKsWEYQcmLPnihlv0pix6HyCaLm5thS4fcfaiexKcQY
GOOGLE_CLOUD_PROJECT=<YOUR_GOOGLE_CLOUD_PROJECT_ID>
GOOGLE_CLOUD_LOCATION=us-central1
```

> Replace `<YOUR_GEMINI_API_KEY>` and `<YOUR_GOOGLE_CLOUD_PROJECT_ID>` with your own values (see below).

Start the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be running at **http://127.0.0.1:8000** (Swagger docs at http://127.0.0.1:8000/docs).

## 4. Get Your Google / Gemini API Key

You need **one** of the following:

### Option A: Gemini API Key (easiest)

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **Create API Key**
3. Copy the key and paste it as `GOOGLE_API_KEY` in your `.env`
4. You can leave `GOOGLE_CLOUD_PROJECT` blank or remove it — the app will fall back to the Gemini API

### Option B: Google Cloud Vertex AI (for Vertex AI features)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the **Vertex AI API**
4. Copy your project ID and paste it as `GOOGLE_CLOUD_PROJECT`
5. Set `GOOGLE_CLOUD_LOCATION` to `us-central1`
6. Authenticate locally: `gcloud auth application-default login`

> **Option A is recommended** — it's faster to set up and works for all features.

## Quick Reference: Environment Files

| File | Location | Provided? |
|------|----------|-----------|
| `.env.local` | `frontend/` | Yes — copy from above |
| `.env` | `backend/services/fedramp_agents/` | Partially — you need your own Google API key |

## Summary of Environment Variables

| Variable | Where | Description | You need to create? |
|----------|-------|-------------|---------------------|
| `VITE_SUPABASE_URL` | Frontend `.env.local` | Supabase project URL | No — use the value above |
| `VITE_SUPABASE_ANON_KEY` | Frontend `.env.local` | Supabase public key | No — use the value above |
| `VITE_API_BASE_URL` | Frontend `.env.local` | Backend URL | No — use `http://127.0.0.1:8000` |
| `GOOGLE_API_KEY` | Backend `.env` | Gemini API key | **Yes — create your own** |
| `SUPABASE_URL` | Backend `.env` | Supabase project URL | No — use the value above |
| `SUPABASE_KEY` | Backend `.env` | Supabase service role key | No — use the value above |
| `GOOGLE_CLOUD_PROJECT` | Backend `.env` | GCP project ID (optional) | Only if using Vertex AI |
| `GOOGLE_CLOUD_LOCATION` | Backend `.env` | GCP region (optional) | No — use `us-central1` |

## Troubleshooting

- **"Cannot find module" errors in frontend** — Run `npm install` in the `frontend/` folder.
- **Backend won't start** — Make sure you have Python 3.11+ and ran `pip install -r app/requirements.txt`.
- **AI features not working** — Double-check your `GOOGLE_API_KEY` in the backend `.env`. Make sure the key is valid at [Google AI Studio](https://aistudio.google.com/apikey).
- **Login/auth not working** — Make sure the Supabase credentials in both `.env.local` and `.env` are correct (use the values from this guide).
- **CORS errors in browser console** — Make sure the backend is running on port 8000 and the frontend `.env.local` has `VITE_API_BASE_URL=http://127.0.0.1:8000`.

## Live Deployment

The app is also deployed at **https://humanloop.discovery.cs.vt.edu** if you just want to try it out without running locally.
