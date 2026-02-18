# Project Structure Guide

## Overview

This document explains where to place different types of files and code in the project.

## Frontend Structure (`frontend/src/`)

### Components (`frontend/src/components/`)

#### Authentication Components (`components/auth/`)
- **Login Component**: Email and password fields, error handling
- **Registration Component**: Name, email, password, confirm password fields
- **Protected Route Wrapper**: HOC for route protection
- **Auth Context Provider**: Authentication state management

#### Chat Components (`components/chat/`)
- **Chat Window** (`chat-window/`): Main chat interface container
- **Message Bubble** (`message-bubble/`): Individual message display
- **Regenerate Button** (`regenerate-button/`): Button to regenerate AI responses
- **Feedback Icons** (`feedback-icons/`): Like/dislike buttons for messages

#### Dashboard Components (`components/dashboard/`)
- **Sidebar** (`sidebar/`): Navigation sidebar with file list
- **File Navigation** (`file-navigation/`): File browser component
- **Main Content** (`main-content/`): Main dashboard content area

#### Flashcard Components (`components/flashcards/`)
- **Flashcard Card** (`flashcard-card/`): Individual flashcard with flip animation
- **Flashcard Grid** (`flashcard-grid/`): Responsive grid layout for cards
- **Review Queue** (`review-queue/`): Queue management before final save
- **Edit Inline** (`edit-inline/`): Inline editing for card text fields

#### File Upload Components (`components/file-upload/`)
- **File Drop** (`file-drop/`): Drag-and-drop upload area with validation
- **File Manager** (`file-manager/`): File management interface
- **File List** (`file-list/`): Display list of uploaded files

#### Profile Components (`components/profile/`)
- **Profile Form**: Name, email, password update
- **Delete Account**: Double-confirmation delete functionality
- **Account Settings**: User preferences management

#### UI Components (`components/ui/`)
- **Skeleton Loader** (`skeleton-loader/`): Loading placeholders
- **Progress Bar** (`progress-bar/`): Progress indicators
- **Theme Toggle** (`theme-toggle/`): Dark/light mode switcher
- **Search Bar** (`search-bar/`): Search input with real-time filtering
- **Export Buttons** (`export-buttons/`): CSV/JSON export functionality
- **Multimedia Player** (`multimedia-player/`): Video/slide playback component

### Pages (`frontend/src/pages/`)

#### Auth Pages (`pages/auth/`)
- **Login Page**: Login form UI
- **Register Page**: Registration form UI
- **Password Reset Page**: Password recovery (if needed)

#### Dashboard Pages (`pages/dashboard/`)
- **Home Page**: Main dashboard with sidebar and content area
- **File View Page**: Individual file/document view
- **Chat Page**: Chat interface page

#### Profile Pages (`pages/profile/`)
- **Profile Page**: Account management page
- **Settings Page**: User preferences and settings

### Hooks (`frontend/src/hooks/`)
- Custom React hooks for:
  - Authentication (`useAuth.ts`)
  - Supabase operations (`useSupabase.ts`)
  - File upload (`useFileUpload.ts`)
  - Chat functionality (`useChat.ts`)
  - Flashcard management (`useFlashcards.ts`)
  - Theme management (`useTheme.ts`)

### Context (`frontend/src/context/`)
- **AuthContext**: Authentication state
- **ThemeContext**: Theme preferences (dark/light)
- **ChatContext**: Chat state management
- **FlashcardContext**: Flashcard state management

### Lib (`frontend/src/lib/`)
- **Supabase Client**: Supabase initialization and configuration
- **API Clients**: External API integrations
- **Utilities**: Helper functions and constants

### Types (`frontend/src/types/`)
- TypeScript type definitions:
  - `user.types.ts` - User-related types
  - `flashcard.types.ts` - Flashcard types
  - `chat.types.ts` - Chat message types
  - `file.types.ts` - File upload types
  - `api.types.ts` - API response types

### Utils (`frontend/src/utils/`)
- **Validation**: Form validation functions
- **Formatting**: Data formatting utilities
- **Helpers**: General helper functions

### Styles (`frontend/src/styles/`)
- Global CSS files
- Tailwind configuration
- Theme variables
- Component-specific styles

## Backend Structure (`backend/`)

### API Routes (`backend/api/`)

#### Auth API (`api/auth/`)
- **Login Endpoint**: Handle user authentication
- **Register Endpoint**: Handle user registration
- **Logout Endpoint**: Handle user logout
- **Refresh Token**: Token refresh logic

#### Documents API (`api/documents/`)
- **Upload Endpoint**: Handle PDF file uploads
- **List Endpoint**: Get user's documents
- **Delete Endpoint**: Remove documents
- **Get Document**: Retrieve specific document

#### Flashcards API (`api/flashcards/`)
- **Create Flashcards**: Generate flashcards from text
- **Get Flashcards**: Retrieve flashcard decks
- **Update Flashcards**: Edit flashcard content
- **Delete Flashcards**: Remove flashcard decks
- **Review Queue**: Manage review queue operations

#### Chat API (`api/chat/`)
- **Send Message**: Process chat messages
- **Get History**: Retrieve chat history
- **Regenerate Response**: Re-call LLM with modified parameters
- **Session Management**: Create/load chat sessions

#### Profile API (`api/profile/`)
- **Get Profile**: Retrieve user profile
- **Update Profile**: Update user information
- **Delete Account**: Account deletion logic
- **Update Preferences**: User preference updates

#### Export API (`api/export/`)
- **Export CSV**: Generate CSV export
- **Export JSON**: Generate JSON export
- **Download Handler**: File download logic

#### Feedback API (`api/feedback/`)
- **Submit Feedback**: Store user feedback (+1/-1)
- **Update Score**: Update positive_score column
- **Feedback Analytics**: Aggregate feedback data

#### Search API (`api/search/`)
- **Full-Text Search**: Supabase full-text search queries
- **Filter Results**: Search result filtering
- **Search Suggestions**: Autocomplete suggestions

### Services (`backend/services/`)

#### Supabase Service (`services/supabase/`)
- Database connection and queries
- Storage operations
- Authentication helpers

#### Agent Service (`services/agent/`)
- Google ADK Agent integration
- Prompt management
- Response formatting
- Temperature modification logic

#### Storage Service (`services/storage/`)
- File upload handling
- File retrieval
- Storage bucket management

#### PDF Processor (`services/pdf-processor/`)
- PDF parsing logic
- Text extraction
- File validation

#### Text Extraction (`services/text-extraction/`)
- Raw text extraction from PDFs
- Text cleaning and formatting
- Content chunking

## Supabase Structure (`supabase/`)

### Migrations (`supabase/migrations/`)

#### Initial Schema (`migrations/001_initial_schema/`)
- User profiles table
- Documents table
- Flashcards table
- Chat messages table
- Chat sessions table
- Feedback table
- Categories/folders table

#### RLS Policies (`migrations/002_rls_policies/`)
- Row Level Security policies for all tables
- User-specific data access rules
- Public/private content policies

#### Indexes (`migrations/003_indexes/`)
- Full-text search indexes
- Performance indexes on frequently queried columns
- Foreign key indexes

### Config (`supabase/config/`)
- Supabase configuration files
- Storage bucket configurations
- Security policy definitions

### Seed (`supabase/seed/`)
- Development seed data
- Test user accounts
- Sample flashcards

## Scripts (`scripts/`)

### PDF Extraction (`scripts/pdf-extraction/`)
- PDF text extraction scripts
- Batch processing utilities
- File validation scripts

### Agent Integration (`scripts/agent-integration/`)
- **Prompts** (`prompts/`): Agent prompt templates
- **Formatters** (`formatters/`): Response formatting scripts
- Agent configuration files

## Tests (`tests/`)

### Unit Tests (`tests/unit/`)
- Component unit tests
- Utility function tests
- Hook tests

### Integration Tests (`tests/integration/`)
- API endpoint tests
- Database integration tests
- Service integration tests

### E2E Tests (`tests/e2e/`)
- User flow tests
- Authentication flow tests
- Complete feature tests

## Documentation (`docs/`)

### Wireframes (`docs/wireframes/`)
- Login page wireframes
- Registration page wireframes
- Homepage/dashboard wireframes
- Component mockups

### API Docs (`docs/api-docs/`)
- API endpoint documentation
- Request/response schemas
- Authentication requirements

### Component Specs (`docs/component-specs/`)
- Component requirements
- Props and state definitions
- Usage examples

### Deployment Guide (`docs/deployment-guide/`)
- Deployment steps
- Environment configuration
- CI/CD pipeline setup

## Public Assets (`public/`)

### Images (`public/images/`)
- Static images
- Icons and logos
- Placeholder images

### Icons (`public/icons/`)
- SVG icons
- Favicon files
- App icons

### Fonts (`public/fonts/`)
- Custom font files
- Font configurations

## Configuration (`config/`)
- Application configuration files
- Environment-specific configs
- Feature flags

## GitHub (`.github/`)

### Workflows (`.github/workflows/`)
- CI/CD pipeline configurations
- Testing workflows
- Deployment workflows

### Issue Templates (`.github/ISSUE_TEMPLATE/`)
- Bug report template
- Feature request template
- Pull request template
