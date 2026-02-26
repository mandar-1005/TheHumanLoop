# Development Roadmap

**Product:** FedRAMP Training Creator – tool for companies to **create** FedRAMP trainings (SSP + roles → training module: study guide + role-based assessment). See [PRODUCT_VISION.md](./PRODUCT_VISION.md).

---

## Phase 1: Foundation & Setup

### Supabase Configuration
- [ ] Set up Supabase project
- [ ] Configure storage buckets (documents, exports)
- [ ] Set up security policies for buckets
- [ ] Create initial database schema
- [ ] Implement Row Level Security (RLS)

### Frontend Foundation
- [ ] Set up React project structure
- [ ] Configure Tailwind CSS
- [ ] Set up routing
- [ ] Create theme context and provider
- [ ] Set up Supabase client configuration

### Authentication (MARi employees)
- [x] Design Login UI
- [x] Design Registration UI
- [x] Build Login component (work email, password)
- [x] Build Registration component (name, work email, organization, role)
- [ ] Connect to Supabase Auth
- [ ] Implement protected routes
- [ ] Add error handling for invalid credentials
- [x] Client-side validation (email format, password strength)

## Phase 2: Core Features

### Authoring: SSP & Roles (training creation)
- [ ] Define data model for **SSP** (upload or synthetic); store in DB/storage
- [ ] Define **roles** (e.g. MARi’s 4: developers, security leads, developer team leads, + one); role metadata (name, level, Bloom’s target)
- [ ] Build authoring UI: SSP input (upload PDF or “generate synthetic SSP” via Gemini), role list/config
- [ ] Agent: generate **study guide** from SSP + FedRAMP docs, per role
- [ ] Agent: generate **assessment** from study guide + role (format by Bloom’s: MC, short response, case study, flashcards)
- [ ] Implement **AI grading** for case-study / short-response assessments
- [ ] Output: **training module** (study guide + assessment) per role; save and version

### File Upload & Processing
- [ ] Build File Drop component (SSP PDF upload)
- [ ] Implement file-type validation (PDF)
- [ ] Develop PDF text extraction for SSP
- [ ] Integrate file upload with Supabase Storage
- [ ] Build File Manager for SSPs/documents

### Quizzes & Assessments (role-based)
- [ ] Program Google ADK Agent for content + assessment generation
- [ ] Support **assessment formats**: multiple choice, short response, case studies, flashcards
- [ ] Map **role → format** (e.g. developers → MC; leads → case study, AI-graded)
- [ ] Design Quiz/Assessment component (format-aware display)
- [ ] Create training module list (by role, by module)
- [ ] Descriptive answers / study guide display

### Training Chat Interface
- [ ] Build Chat UI for training Q&A
- [ ] Create message bubble components
- [ ] Integrate agent (compliance/FedRAMP context)
- [ ] Implement answer-matching vs descriptive answers
- [ ] Add visual feedback indicators (Green/Red)
- [ ] Create Regenerate button component
- [ ] Implement API logic for temperature modification
- [ ] Build chat history sidebar
- [ ] Create session management

## Phase 3: User Management (MARi employees)

### Profile & Account
- [ ] Initialize user profile table (role, organization)
- [ ] Create profile/account management page
- [ ] Build profile form (name, work email, password)
- [ ] Implement password update functionality
- [ ] Create Delete Account logic with double-confirmation
- [ ] Add user preferences and training progress

### Dashboard
- [ ] Design HomePage layout
- [ ] Build Dashboard with sidebar and main content
- [ ] Create File Manager (policy/SSP documents)
- [ ] Integrate Training Chat interface
- [ ] Add file/document navigation sidebar
- [ ] Implement responsive layout

## Phase 4: Advanced Features

### Review & Editing
- [ ] Create Review Queue for generated Q&A
- [ ] Build Review Queue UI
- [ ] Implement Edit Inline for quiz questions and descriptive answers
- [ ] Add text field editing (question + answer)
- [ ] Create save/cancel actions

### Search & Export
- [ ] Implement Supabase Full-Text Search
- [ ] Build search bar UI component
- [ ] Add real-time filtering logic
- [ ] Create CSV export functionality
- [ ] Create JSON export functionality
- [ ] Add Export buttons to UI

### Feedback System
- [ ] Add Like/Dislike icons to content blocks
- [ ] Create Feedback API endpoints
- [ ] Add Positive_Score database column
- [ ] Implement feedback storage
- [ ] Connect feedback to agent (reinforcement learning)

## Phase 5: Enhanced Features

### Multimedia
- [ ] Integrate text-to-video API
- [ ] Integrate slide-generation API
- [ ] Build multimedia playback component
- [ ] Add video/slide display in UI

### Content Moderation
- [ ] Implement content moderation filters
- [ ] Add AI output validation
- [ ] Create moderation API endpoints

### User Experience
- [ ] Add AI Info tooltip component
- [ ] Implement Skeleton Loaders
- [ ] Add Progress Bars
- [ ] Create loading states

### Security
- [ ] Enable Two-Factor Authentication (2FA)
- [ ] Review and enhance RLS policies
- [ ] Security audit

## Phase 6: Organization & Management

### Folder/Category System
- [ ] Design folder structure in database
- [ ] Create folder management UI
- [ ] Implement folder creation/deletion
- [ ] Add folder navigation

### Theme System
- [ ] Implement Theme Context
- [ ] Create theme toggle component
- [ ] Add CSS variables for theming
- [ ] Test theme across all components

## Phase 7: Performance & Optimization

### Database Optimization
- [ ] Add database indexes
- [ ] Optimize query performance
- [ ] Review slow queries
- [ ] Implement query caching where needed

### Frontend Optimization
- [ ] Code splitting
- [ ] Lazy loading components
- [ ] Image optimization
- [ ] Bundle size optimization

## Phase 8: PWA & Offline

### Progressive Web App
- [ ] Implement Service Workers
- [ ] Add PWA manifest
- [ ] Create offline caching strategy
- [ ] Cache quiz decks / training content locally
- [ ] Add offline mode indicators

## Phase 9: Testing & Quality

### Testing
- [ ] Write unit tests for components
- [ ] Write integration tests for API
- [ ] Create E2E tests for user flows
- [ ] Manual data validation (e.g. 20+ quiz items vs source PDFs)
- [ ] Cross-browser testing
- [ ] Mobile responsiveness testing

### Bug Fixes
- [ ] Fix CSS layout breaks
- [ ] Fix cross-browser issues
- [ ] Fix mobile layout issues
- [ ] Address performance issues

## Phase 10: Deployment

### Deployment Setup
- [ ] Set up deployment pipeline
- [ ] Configure CI/CD workflows
- [ ] Set up production environment variables
- [ ] Deploy to VirginTech Arc / cslaunch.vt
- [ ] Configure domain and SSL

### Documentation
- [ ] Complete API documentation
- [ ] Write component documentation
- [ ] Create deployment guide
- [ ] Update README with setup instructions
- [ ] Document environment variables

### Post-Deployment
- [ ] Monitor application performance
- [ ] Set up error tracking
- [ ] Configure analytics
- [ ] User feedback collection
