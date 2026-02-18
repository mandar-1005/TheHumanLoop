# Contributing Guide

## Getting Started

1. Clone the repository
2. Set up your development environment
3. Follow the folder structure guidelines
4. Create feature branches for your work
5. Submit pull requests for review

## Development Workflow

### Branch Naming
- `feature/feature-name` - For new features
- `fix/bug-name` - For bug fixes
- `docs/documentation-name` - For documentation updates

### Commit Messages
- Use clear, descriptive commit messages
- Reference issue numbers when applicable
- Follow conventional commit format when possible

## Code Organization

### Frontend Components
- Place React components in `frontend/src/components/[feature-name]/`
- Each component should have its own folder
- Include component file, styles, and tests in the same folder

### Backend API Routes
- Place API endpoints in `backend/api/[feature-name]/`
- Each endpoint should be in its own file
- Include request/response validation

### Database Migrations
- Place SQL migrations in `supabase/migrations/`
- Name files with timestamp prefix: `001_description.sql`
- Test migrations locally before committing

## Testing

- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/`
- E2E tests: `tests/e2e/`

## Documentation

- Update README files when adding new features
- Document API changes in `docs/api-docs/`
- Add component specs in `docs/component-specs/`
