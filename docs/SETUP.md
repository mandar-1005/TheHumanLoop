# Setup Instructions

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git installed
- Supabase account created
- Google ADK Agent API access

## Initial Setup Steps

### 1. Clone Repository
```bash
git clone https://github.com/mandar-1005/TheHumanLoop.git
cd TheHumanLoop
```

### 2. Environment Configuration
- Copy `.env.example` to `.env.local`
- Fill in all required environment variables:
  - Supabase URL and keys
  - Google ADK Agent credentials
  - API keys for video/slide generation (if applicable)

### 3. Install Dependencies
- Navigate to frontend directory and install packages
- Navigate to backend directory and install packages
- Install root-level dependencies if any

### 4. Supabase Setup
- Create a new Supabase project
- Run migrations from `supabase/migrations/` in order
- Configure storage buckets in Supabase dashboard
- Set up Row Level Security policies

### 5. Database Setup
- Execute migration files in sequence:
  1. `001_initial_schema/` - Create base tables
  2. `002_rls_policies/` - Set up security policies
  3. `003_indexes/` - Add performance indexes

### 6. Storage Buckets Configuration
- Create buckets in Supabase Storage:
  - `documents` - For uploaded PDF files
  - `exports` - For exported flashcard decks
- Configure bucket policies and access rules

### 7. Development Server
- Start frontend development server
- Start backend API server (if separate)
- Verify connections to Supabase

## Team Member Onboarding

1. Request access to:
   - GitHub repository
   - Supabase project
   - Google ADK Agent API
   - Environment variable documentation

2. Complete setup steps above

3. Review project structure documentation

4. Check assigned user stories/issues

5. Set up development branch
