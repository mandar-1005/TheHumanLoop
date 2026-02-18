# Human Loop - AI-Powered Learning Platform

A comprehensive learning platform that converts PDF documents into interactive flashcards using AI, with chat functionality, user authentication, and advanced study features.

## Features

- 📄 PDF Document Upload & Processing
- 🤖 AI-Powered Flashcard Generation
- 💬 Interactive Chat Interface
- 📚 Flashcard Management & Review Queue
- 🔍 Full-Text Search
- 👤 User Authentication & Profiles
- 📊 Export Functionality (CSV/JSON)
- 🎨 Theme Support
- 📱 PWA Capabilities
- 🔒 Row Level Security & 2FA

## Tech Stack

- **Frontend**: React, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Storage, Auth)
- **AI**: Google ADK Agent
- **Deployment**: Vercel/Netlify

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

### Environment Variables

See `.env.example` for required environment variables.

## Project Structure

```
├── frontend/          # React frontend application
├── backend/           # API routes and server logic
├── supabase/          # Database migrations and configs
├── scripts/           # Utility scripts
└── docs/              # Documentation
```

## Development

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for development guidelines.

## License

MIT
