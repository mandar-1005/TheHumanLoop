# Database Schema Planning

## Tables Overview

This document outlines the database tables needed for the **FedRAMP Training Creator** (companies create trainings from SSP + roles; output = study guide + role-based assessment). Place SQL migration files in `supabase/migrations/001_initial_schema/`.

## Core Tables

### 1. User Profiles (`user_profiles`)
**Location**: `supabase/migrations/001_initial_schema/user_profiles.sql`

**Purpose**: Store user profile information and preferences

**Columns**:
- `id` (UUID, Primary Key, references auth.users)
- `name` (TEXT)
- `email` (TEXT, unique) - Work email
- `organization` (TEXT), `role` (TEXT) - MARi employee context
- `preferences` (JSONB) - Store user preferences
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Notes**: 
- Links to Supabase Auth users table
- Store preferences as JSONB for flexibility

### 2. Documents / SSPs (`documents`)
**Location**: `supabase/migrations/001_initial_schema/documents.sql`

**Purpose**: Store uploaded SSP (or other PDF) document metadata; synthetic SSPs can reference generated content

**Columns**:
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key -> user_profiles)
- `file_name` (TEXT)
- `file_path` (TEXT) - Supabase Storage path
- `file_size` (BIGINT)
- `extracted_text` (TEXT) - Raw extracted text
- `is_synthetic` (BOOLEAN) - True if Gemini-generated (no real SSP)
- `folder_id` (UUID, Foreign Key -> folders, nullable)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes**:
- Index on `user_id` for faster queries
- Index on `created_at` for sorting

### 3. Roles (`roles`) – optional table or org config
**Purpose**: Organization-defined roles (e.g. Developer, Security Lead, Developer Team Lead); used to select assessment format and Bloom’s level.

**Columns** (if table): `id`, `organization_id` or `user_id`, `name`, `bloom_level` (e.g. 'remember', 'apply', 'create'), `assessment_format` (e.g. 'multiple_choice', 'case_study'), `created_at`, `updated_at`.

### 4. Training modules (`training_modules`)
**Purpose**: One generated training package per (SSP + role): study guide + assessment.

**Columns**: `id`, `user_id`, `document_id` (SSP), `role_id` or `role_name`, `study_guide` (TEXT or JSONB), `assessment` (JSONB – items with format: mc, short_response, case_study, flashcard), `created_at`, `updated_at`.

### 5. Quizzes / Assessments (`flashcards` or `quizzes`)
**Location**: `supabase/migrations/001_initial_schema/flashcards.sql` (or `quizzes.sql`)

**Purpose**: Store assessment items (MC, short response, case study, flashcards) with optional descriptive answers; link to training_module.

**Columns**:
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key -> user_profiles)
- `training_module_id` (UUID, Foreign Key -> training_modules, nullable)
- `document_id` (UUID, Foreign Key -> documents, nullable)
- `title` (TEXT)
- `cards` (JSONB) - Array of items: question, answer, format_type
- `format_type` (TEXT) - 'multiple_choice', 'short_response', 'case_study', 'flashcard', 'bullet', 'long-form'
- `folder_id` (UUID, Foreign Key -> folders, nullable)
- `is_reviewed` (BOOLEAN) - Review queue status
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes**:
- Full-text search index on `title` and card content
- Index on `user_id`
- Index on `is_reviewed` for review queue queries

### 6. Chat Sessions (`chat_sessions`)
**Location**: `supabase/migrations/001_initial_schema/chat_sessions.sql`

**Purpose**: Store chat conversation sessions

**Columns**:
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key -> user_profiles)
- `title` (TEXT) - Auto-generated or user-defined
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes**:
- Index on `user_id` and `created_at` for sorting

### 7. Chat Messages (`chat_messages`)
**Location**: `supabase/migrations/001_initial_schema/chat_messages.sql`

**Purpose**: Store individual chat messages

**Columns**:
- `id` (UUID, Primary Key)
- `session_id` (UUID, Foreign Key -> chat_sessions)
- `user_id` (UUID, Foreign Key -> user_profiles)
- `message` (TEXT) - User message
- `response` (TEXT) - AI response
- `is_user_message` (BOOLEAN)
- `temperature` (FLOAT) - Temperature used for generation
- `feedback_score` (INTEGER) - +1 or -1, nullable
- `created_at` (TIMESTAMP)

**Indexes**:
- Index on `session_id` for loading conversation history
- Index on `created_at` for chronological ordering

### 8. Feedback (`feedback`)
**Location**: `supabase/migrations/001_initial_schema/feedback.sql`

**Purpose**: Store user feedback for reinforcement learning

**Columns**:
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key -> user_profiles)
- `message_id` (UUID, Foreign Key -> chat_messages, nullable)
- `flashcard_id` (UUID, Foreign Key -> flashcards, nullable)
- `feedback_type` (TEXT) - 'positive' or 'negative'
- `positive_score` (INTEGER) - +1 or -1
- `notes` (TEXT, nullable) - Optional feedback notes
- `created_at` (TIMESTAMP)

**Indexes**:
- Index on `user_id` and `created_at`
- Index on `positive_score` for analytics

### 9. Folders/Categories (`folders`)
**Location**: `supabase/migrations/001_initial_schema/folders.sql`

**Purpose**: Organize documents and flashcards into folders

**Columns**:
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key -> user_profiles)
- `name` (TEXT)
- `parent_id` (UUID, Foreign Key -> folders, nullable) - For nested folders
- `color` (TEXT, nullable) - Folder color for UI
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes**:
- Index on `user_id` and `parent_id` for folder hierarchy

## Storage Buckets

### Documents Bucket
**Location**: Configure in Supabase Dashboard

**Purpose**: Store uploaded PDF files

**Policies**:
- Users can upload their own files
- Users can read their own files
- Users can delete their own files
- Files are private to each user

### Exports Bucket
**Location**: Configure in Supabase Dashboard

**Purpose**: Store exported flashcard decks (CSV/JSON)

**Policies**:
- Users can upload their own exports
- Users can read their own exports
- Users can delete their own exports
- Files are private to each user

## Row Level Security (RLS)

**Location**: `supabase/migrations/002_rls_policies/`

### Policies Needed:
1. **User Profiles**: Users can only read/update their own profile
2. **Documents**: Users can only access their own documents
3. **Flashcards**: Users can only access their own flashcards
4. **Chat Sessions**: Users can only access their own sessions
5. **Chat Messages**: Users can only access messages in their own sessions
6. **Feedback**: Users can only create/read their own feedback
7. **Folders**: Users can only access their own folders

## Indexes for Performance

**Location**: `supabase/migrations/003_indexes/`

### Full-Text Search Indexes:
- `flashcards` table: Search on title and card content
- `documents` table: Search on file_name and extracted_text

### Query Performance Indexes:
- Foreign key indexes on all `user_id` columns
- Indexes on `created_at` for sorting
- Composite indexes for common query patterns

## Seed Data

**Location**: `supabase/seed/`

### Development Seed Data:
- Test user accounts
- Sample documents
- Sample flashcards
- Sample chat sessions

**Note**: Only use seed data in development environment
