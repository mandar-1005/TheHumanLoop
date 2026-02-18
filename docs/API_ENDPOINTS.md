# API Endpoints Documentation

## Overview

This document outlines all API endpoints that need to be implemented. Place endpoint implementations in `backend/api/[feature-name]/`.

## Authentication Endpoints

### POST `/api/auth/login`
**Location**: `backend/api/auth/login.ts`

**Purpose**: Authenticate user and return session

**Request Body**:
- `email` (string, required)
- `password` (string, required)

**Response**:
- Success: User session and token
- Error: Invalid credentials message

**Error Handling**: Display "Invalid Credentials" for failed attempts

---

### POST `/api/auth/register`
**Location**: `backend/api/auth/register.ts`

**Purpose**: Create new user account

**Request Body**:
- `name` (string, required)
- `email` (string, required, validated format)
- `password` (string, required, validated strength)
- `confirmPassword` (string, required)

**Response**:
- Success: User created and initialized in DB
- Error: Validation errors or account creation failure

**Client-Side Validation**: Email format and password strength

---

### POST `/api/auth/logout`
**Location**: `backend/api/auth/logout.ts`

**Purpose**: End user session

**Response**: Success confirmation

---

### POST `/api/auth/refresh`
**Location**: `backend/api/auth/refresh.ts`

**Purpose**: Refresh authentication token

**Response**: New token

## Document Endpoints

### POST `/api/documents/upload`
**Location**: `backend/api/documents/upload.ts`

**Purpose**: Upload PDF file to Supabase Storage

**Request**: Multipart form data with file

**Validation**: 
- File type must be PDF
- File size limits

**Response**: Document metadata and storage path

**Integration**: 
- Upload to Supabase Storage bucket
- Extract text using PDF extraction script
- Store metadata in database

---

### GET `/api/documents`
**Location**: `backend/api/documents/list.ts`

**Purpose**: Get list of user's uploaded documents

**Query Parameters**:
- `folder_id` (optional) - Filter by folder

**Response**: Array of document objects

---

### GET `/api/documents/:id`
**Location**: `backend/api/documents/get.ts`

**Purpose**: Get specific document details

**Response**: Document object with metadata and extracted text

---

### DELETE `/api/documents/:id`
**Location**: `backend/api/documents/delete.ts`

**Purpose**: Delete document and associated data

**Response**: Success confirmation

## Flashcard Endpoints

### POST `/api/flashcards/generate`
**Location**: `backend/api/flashcards/generate.ts`

**Purpose**: Generate flashcards from text using Google ADK Agent

**Request Body**:
- `text` (string, required) - Source text
- `format_type` (string) - 'bullet', 'flashcard', 'long-form'
- `document_id` (uuid, optional)

**Response**: Generated flashcard deck (JSON structure)

**Integration**: 
- Call Google ADK Agent with formatted prompts
- Structure response into Q&A JSON
- Return formatted cards

---

### GET `/api/flashcards`
**Location**: `backend/api/flashcards/list.ts`

**Purpose**: Get user's flashcard decks

**Query Parameters**:
- `folder_id` (optional)
- `is_reviewed` (optional) - Filter by review status

**Response**: Array of flashcard deck objects

---

### GET `/api/flashcards/:id`
**Location**: `backend/api/flashcards/get.ts`

**Purpose**: Get specific flashcard deck

**Response**: Flashcard deck object with cards array

---

### PUT `/api/flashcards/:id`
**Location**: `backend/api/flashcards/update.ts`

**Purpose**: Update flashcard deck (for inline editing)

**Request Body**:
- `cards` (array) - Updated cards array
- `title` (string, optional)

**Response**: Updated flashcard deck

---

### DELETE `/api/flashcards/:id`
**Location**: `backend/api/flashcards/delete.ts`

**Purpose**: Delete flashcard deck

**Response**: Success confirmation

---

### POST `/api/flashcards/review-queue/add`
**Location**: `backend/api/flashcards/review-queue.ts`

**Purpose**: Add flashcards to review queue

**Request Body**:
- `flashcard_id` (uuid, required)

**Response**: Success confirmation

---

### POST `/api/flashcards/review-queue/save`
**Location**: `backend/api/flashcards/review-queue.ts`

**Purpose**: Save flashcards from review queue

**Request Body**:
- `flashcard_id` (uuid, required)

**Response**: Success confirmation

## Chat Endpoints

### POST `/api/chat/message`
**Location**: `backend/api/chat/send.ts`

**Purpose**: Send chat message and get AI response

**Request Body**:
- `message` (string, required)
- `session_id` (uuid, optional) - Existing session or create new
- `temperature` (float, optional) - LLM temperature

**Response**: 
- AI response text
- Session ID
- Message ID

**Integration**: 
- Connect to Google ADK Agent
- Implement answer-matching logic
- Store message and response in database

---

### GET `/api/chat/sessions`
**Location**: `backend/api/chat/sessions.ts`

**Purpose**: Get user's chat sessions

**Response**: Array of session objects with metadata

---

### GET `/api/chat/sessions/:id/messages`
**Location**: `backend/api/chat/messages.ts`

**Purpose**: Get messages for a specific session

**Response**: Array of message objects (chronological order)

---

### POST `/api/chat/regenerate`
**Location**: `backend/api/chat/regenerate.ts`

**Purpose**: Regenerate AI response with modified temperature

**Request Body**:
- `message_id` (uuid, required)
- `temperature` (float, required) - New temperature value

**Response**: New AI response

**Implementation**: Re-call LLM with modified temperature parameter

## Profile Endpoints

### GET `/api/profile`
**Location**: `backend/api/profile/get.ts`

**Purpose**: Get user profile

**Response**: User profile object

---

### PUT `/api/profile`
**Location**: `backend/api/profile/update.ts`

**Purpose**: Update user profile

**Request Body**:
- `name` (string, optional)
- `email` (string, optional)
- `preferences` (object, optional)

**Response**: Updated profile

---

### PUT `/api/profile/password`
**Location**: `backend/api/profile/password.ts`

**Purpose**: Update user password

**Request Body**:
- `current_password` (string, required)
- `new_password` (string, required)

**Response**: Success confirmation

---

### DELETE `/api/profile/account`
**Location**: `backend/api/profile/delete.ts`

**Purpose**: Delete user account

**Request Body**:
- `confirmation` (string, required) - Double confirmation

**Response**: Success confirmation

**Implementation**: 
- Double-confirmation pop-up on frontend
- Delete all user data
- Remove from auth system

## Export Endpoints

### GET `/api/export/flashcards/:id/csv`
**Location**: `backend/api/export/csv.ts`

**Purpose**: Export flashcard deck as CSV

**Response**: CSV file download

---

### GET `/api/export/flashcards/:id/json`
**Location**: `backend/api/export/json.ts`

**Purpose**: Export flashcard deck as JSON

**Response**: JSON file download

## Feedback Endpoints

### POST `/api/feedback`
**Location**: `backend/api/feedback/submit.ts`

**Purpose**: Submit user feedback (+1/-1)

**Request Body**:
- `message_id` (uuid, optional)
- `flashcard_id` (uuid, optional)
- `feedback_type` (string) - 'positive' or 'negative'
- `positive_score` (integer) - +1 or -1

**Response**: Success confirmation

**Implementation**: 
- Store feedback in database
- Update positive_score column
- Connect to agent for reinforcement learning

## Search Endpoints

### GET `/api/search`
**Location**: `backend/api/search/query.ts`

**Purpose**: Full-text search on flashcard decks

**Query Parameters**:
- `q` (string, required) - Search query
- `type` (string, optional) - 'flashcards', 'documents', 'all'

**Response**: Search results array

**Implementation**: 
- Use Supabase Full-Text Search
- Real-time filtering logic
- Return relevant results

---

### GET `/api/search/suggestions`
**Location**: `backend/api/search/suggestions.ts`

**Purpose**: Get search autocomplete suggestions

**Query Parameters**:
- `q` (string, required) - Partial query

**Response**: Array of suggestion strings

## Folder Endpoints

### GET `/api/folders`
**Location**: `backend/api/folders/list.ts`

**Purpose**: Get user's folders

**Response**: Array of folder objects

---

### POST `/api/folders`
**Location**: `backend/api/folders/create.ts`

**Purpose**: Create new folder

**Request Body**:
- `name` (string, required)
- `parent_id` (uuid, optional)
- `color` (string, optional)

**Response**: Created folder object

---

### PUT `/api/folders/:id`
**Location**: `backend/api/folders/update.ts`

**Purpose**: Update folder

**Request Body**:
- `name` (string, optional)
- `color` (string, optional)

**Response**: Updated folder object

---

### DELETE `/api/folders/:id`
**Location**: `backend/api/folders/delete.ts`

**Purpose**: Delete folder

**Response**: Success confirmation
