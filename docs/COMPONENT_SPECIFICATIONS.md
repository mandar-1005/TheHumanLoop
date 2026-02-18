# Component Specifications

## Overview

This document outlines the specifications for each component. Place component implementations in `frontend/src/components/[feature-name]/`.

## Authentication Components

### Login Component
**Location**: `frontend/src/components/auth/Login.tsx`

**Features**:
- Email input field
- Password input field
- Login button
- Error message display ("Invalid Credentials")
- Link to registration page
- Loading state during authentication

**Props**: None (uses context for auth)

**State**:
- Form values (email, password)
- Loading state
- Error message

**Integration**: Connect to Supabase Auth login method

---

### Registration Component
**Location**: `frontend/src/components/auth/Register.tsx`

**Features**:
- Name input field
- Email input field (with format validation)
- Password input field (with strength validation)
- Confirm Password field (with match validation)
- Register button
- Error message display
- Link to login page
- Loading state

**Client-Side Validation**:
- Email format validation
- Password strength requirements
- Password match validation

**Integration**: Connect to Supabase Auth sign-up method and initialize user record in DB

---

### Protected Route Wrapper
**Location**: `frontend/src/components/auth/ProtectedRoute.tsx`

**Purpose**: HOC to protect routes requiring authentication

**Features**:
- Check authentication status
- Redirect to login if not authenticated
- Render children if authenticated

## Chat Components

### Chat Window
**Location**: `frontend/src/components/chat/chat-window/ChatWindow.tsx`

**Features**:
- Message input area
- Message display area
- Scroll to bottom on new messages
- Loading indicator for AI responses
- Session management UI

**State**:
- Messages array
- Current session ID
- Loading state
- Input value

**Integration**: Connect to chat API endpoints

---

### Message Bubble
**Location**: `frontend/src/components/chat/message-bubble/MessageBubble.tsx`

**Features**:
- Display message text
- Different styling for user vs AI messages
- Timestamp display
- Visual feedback indicators (Green/Red) for answer matching

**Props**:
- `message` (string)
- `isUser` (boolean)
- `isCorrect` (boolean, optional) - For answer matching feedback
- `timestamp` (date)

---

### Regenerate Button
**Location**: `frontend/src/components/chat/regenerate-button/RegenerateButton.tsx`

**Features**:
- Button to regenerate AI response
- Loading state during regeneration
- Temperature adjustment option

**Props**:
- `messageId` (uuid)
- `onRegenerate` (function)

**Integration**: Call regenerate API endpoint

---

### Feedback Icons
**Location**: `frontend/src/components/chat/feedback-icons/FeedbackIcons.tsx`

**Features**:
- Like icon (+1)
- Dislike icon (-1)
- Visual feedback on click
- Submit feedback to API

**Props**:
- `messageId` (uuid)
- `onFeedback` (function)

**Integration**: Connect to feedback API

## Flashcard Components

### Flashcard Card
**Location**: `frontend/src/components/flashcards/flashcard-card/FlashcardCard.tsx`

**Features**:
- Flip animation (front/back)
- Question display on front
- Answer display on back
- Click to flip
- Edit button (triggers inline edit)

**Props**:
- `card` (object) - { question, answer, id }
- `onEdit` (function, optional)
- `formatType` (string) - 'bullet', 'flashcard', 'long-form'

**State**:
- `isFlipped` (boolean)

---

### Flashcard Grid
**Location**: `frontend/src/components/flashcards/flashcard-grid/FlashcardGrid.tsx`

**Features**:
- Responsive grid layout
- Multiple cards display
- Grid adjusts to screen size
- Card spacing and styling

**Props**:
- `cards` (array) - Array of card objects
- `columns` (number, optional) - Grid columns (responsive)

**Styling**: Responsive breakpoints for mobile/tablet/desktop

---

### Review Queue
**Location**: `frontend/src/components/flashcards/review-queue/ReviewQueue.tsx`

**Features**:
- Display cards pending review
- Approve/Save button
- Reject/Edit button
- Batch operations
- Queue management UI

**State**:
- Queue items array
- Selected items

**Integration**: Connect to review queue API

---

### Edit Inline
**Location**: `frontend/src/components/flashcards/edit-inline/EditInline.tsx`

**Features**:
- Inline editing for card text fields
- Save button
- Cancel button
- Input validation

**Props**:
- `card` (object)
- `onSave` (function)
- `onCancel` (function)

**State**:
- Edit mode (boolean)
- Edited values

## File Upload Components

### File Drop
**Location**: `frontend/src/components/file-upload/file-drop/FileDrop.tsx`

**Features**:
- Drag-and-drop area
- Click to browse files
- File-type validation (PDF only)
- Visual feedback on drag over
- File size validation
- Upload progress indicator

**Props**:
- `onUpload` (function) - Callback when file is selected
- `maxSize` (number, optional)

**State**:
- Drag active state
- Selected file
- Upload progress

**Validation**: 
- Accept only PDF files
- Check file size limits

---

### File Manager
**Location**: `frontend/src/components/file-upload/file-manager/FileManager.tsx`

**Features**:
- Display uploaded files list
- File metadata (name, size, date)
- Delete file option
- Open file option
- Folder organization

**Props**:
- `files` (array) - File objects array
- `onDelete` (function)
- `onSelect` (function)

---

### File List
**Location**: `frontend/src/components/file-upload/file-list/FileList.tsx`

**Features**:
- List view of files
- Sortable columns
- Filter options
- Pagination (if needed)

**Props**:
- `files` (array)

## Dashboard Components

### Sidebar
**Location**: `frontend/src/components/dashboard/sidebar/Sidebar.tsx`

**Features**:
- Navigation menu
- File navigation tree
- User profile link
- Logout button
- Collapsible on mobile

**Props**:
- `files` (array, optional) - For file navigation
- `onFileSelect` (function)

---

### File Navigation
**Location**: `frontend/src/components/dashboard/file-navigation/FileNavigation.tsx`

**Features**:
- Tree view of files and folders
- Expand/collapse folders
- File selection
- Folder creation UI

**Props**:
- `files` (array)
- `folders` (array)
- `onSelect` (function)

---

### Main Content
**Location**: `frontend/src/components/dashboard/main-content/MainContent.tsx`

**Features**:
- Main content area container
- Dynamic content based on route
- Responsive layout

**Props**:
- `children` (ReactNode)

## Profile Components

### Profile Form
**Location**: `frontend/src/components/profile/ProfileForm.tsx`

**Features**:
- Name input field
- Email input field
- Password update section
- Save button
- Validation

**Props**: None (uses auth context)

**State**:
- Form values
- Validation errors

---

### Delete Account
**Location**: `frontend/src/components/profile/DeleteAccount.tsx`

**Features**:
- Delete account button
- Double-confirmation pop-up modal
- Confirmation text input
- Final delete action

**Props**: None

**State**:
- Show confirmation modal (boolean)
- Confirmation text

**Integration**: Connect to delete account API

## UI Components

### Skeleton Loader
**Location**: `frontend/src/components/ui/skeleton-loader/SkeletonLoader.tsx`

**Features**:
- Loading placeholder animation
- Customizable size and shape
- Multiple variants

**Props**:
- `width` (string, optional)
- `height` (string, optional)
- `variant` (string, optional) - 'text', 'card', 'circle'

**Usage**: Show while data is loading

---

### Progress Bar
**Location**: `frontend/src/components/ui/progress-bar/ProgressBar.tsx`

**Features**:
- Progress indicator
- Animated progress
- Percentage display

**Props**:
- `progress` (number) - 0-100
- `label` (string, optional)

**Usage**: File uploads, processing status

---

### Theme Toggle
**Location**: `frontend/src/components/ui/theme-toggle/ThemeToggle.tsx`

**Features**:
- Toggle button for dark/light mode
- Icon changes based on theme
- Persist theme preference

**Props**: None (uses theme context)

**Integration**: Theme Context using Tailwind CSS or CSS Variables

---

### Search Bar
**Location**: `frontend/src/components/ui/search-bar/SearchBar.tsx`

**Features**:
- Search input field
- Real-time filtering
- Search icon
- Clear button
- Debounced input

**Props**:
- `onSearch` (function) - Callback with search query
- `placeholder` (string, optional)

**Integration**: Full-Text Search API

---

### Export Buttons
**Location**: `frontend/src/components/ui/export-buttons/ExportButtons.tsx`

**Features**:
- CSV export button
- JSON export button
- Download trigger
- Loading state during export

**Props**:
- `flashcardId` (uuid)
- `onExport` (function, optional)

**Integration**: Export API endpoints

---

### Multimedia Player
**Location**: `frontend/src/components/ui/multimedia-player/MultimediaPlayer.tsx`

**Features**:
- Video playback
- Slide presentation viewer
- Play/pause controls
- Progress tracking

**Props**:
- `source` (string) - Video/slide URL
- `type` (string) - 'video' or 'slides'

**Integration**: Text-to-video or slide-generation API

## Additional Components

### AI Info Tooltip
**Location**: `frontend/src/components/ui/AIInfoTooltip.tsx`

**Features**:
- Tooltip explaining AI response generation
- Info icon trigger
- Hover/click to show

**Props**:
- `messageId` (uuid, optional)
- `content` (string) - Tooltip text

---

### History Sidebar
**Location**: `frontend/src/components/chat/HistorySidebar.tsx`

**Features**:
- List of previous chat sessions
- Session titles
- Timestamps
- Load session on click
- Create new session button

**Props**:
- `sessions` (array)
- `onLoadSession` (function)
- `onNewSession` (function)

**Integration**: Chat sessions API
