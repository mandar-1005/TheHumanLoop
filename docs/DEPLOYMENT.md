# Deployment Guide

## Overview

This guide covers deployment steps for the Human Loop application to production.

## Pre-Deployment Checklist

### Environment Variables
- [ ] All environment variables configured
- [ ] Production Supabase credentials set
- [ ] Google ADK Agent API keys configured
- [ ] Video/Slide generation API keys (if applicable)
- [ ] Domain and SSL certificates ready

### Database
- [ ] All migrations tested and applied
- [ ] RLS policies verified
- [ ] Indexes created
- [ ] Seed data removed from production

### Storage
- [ ] Storage buckets configured
- [ ] Bucket policies set
- [ ] File size limits configured

### Security
- [ ] RLS policies reviewed
- [ ] API keys secured
- [ ] Environment variables not exposed
- [ ] CORS configured correctly

## Deployment Steps

### 1. GitHub Repository Setup
**Location**: Repository already created at `https://github.com/mandar-1005/TheHumanLoop`

**Actions**:
- Ensure all code is committed
- Create production branch (optional)
- Set up branch protection rules

### 2. CI/CD Pipeline Setup
**Location**: `.github/workflows/`

**Create Pipeline Files**:
- `deploy.yml` - Main deployment workflow
- `test.yml` - Testing workflow
- `lint.yml` - Code quality checks

**Pipeline Steps**:
1. Run tests
2. Build application
3. Deploy to VirginTech Arc platform or cslaunch.vt
4. Run post-deployment checks

### 3. VirginTech Arc Platform / cslaunch.vt Configuration

#### VirginTech Arc Platform Setup:
1. Access VirginTech Arc platform dashboard
2. Connect GitHub repository:
   - Link repository: `https://github.com/mandar-1005/TheHumanLoop`
   - Select branch: `main` (or production branch)
3. Configure build settings:
   - Build command: `npm run build`
   - Output directory: `frontend/.next` (if Next.js) or `frontend/build`
   - Install command: `npm install`
   - Working directory: `frontend/` (if frontend is separate)
4. Set environment variables in platform dashboard
5. Configure domain settings
6. Enable SSL certificate
7. Configure deployment triggers (auto-deploy on push)

#### cslaunch.vt Setup:
1. Access cslaunch.vt platform
2. Create new project/deployment
3. Connect GitHub repository:
   - Repository URL: `https://github.com/mandar-1005/TheHumanLoop`
   - Branch: `main`
4. Configure build configuration:
   - Build command: `npm run build`
   - Output directory: `frontend/dist` or `frontend/build`
   - Node version: Specify if required
5. Add environment variables:
   - Use platform's environment variable section
   - Add all required variables from `.env.example`
6. Set up domain:
   - Configure custom domain if needed
   - SSL will be handled automatically
7. Configure deployment settings:
   - Auto-deploy on push to main branch
   - Manual deployment option for other branches

### 4. Environment Configuration

**Production Environment Variables**:
- `NEXT_PUBLIC_SUPABASE_URL` - Production Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Production anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)
- `GOOGLE_ADK_API_KEY` - Production API key
- `NEXT_PUBLIC_APP_URL` - Production app URL

**Set in**:
- VirginTech Arc: Project Settings → Environment Variables
- cslaunch.vt: Deployment Settings → Environment Variables

### 5. Database Migration

**Steps**:
1. Connect to production Supabase project
2. Run migrations in order:
   ```bash
   supabase db push
   ```
3. Verify all tables created
4. Verify RLS policies active
5. Verify indexes created

### 6. Storage Configuration

**In Supabase Dashboard**:
1. Create production storage buckets
2. Configure bucket policies
3. Set up CORS if needed
4. Test file upload/download

### 7. Domain Configuration

**Steps**:
1. Add custom domain in VirginTech Arc or cslaunch.vt platform
2. Configure DNS records:
   - A record or CNAME pointing to platform's hosting provider
   - Follow platform-specific DNS instructions
3. Enable SSL certificate:
   - VirginTech Arc: SSL is typically automatic
   - cslaunch.vt: SSL configuration in domain settings
4. Verify domain is active and SSL certificate is issued

### 8. Post-Deployment Verification

**Checklist**:
- [ ] Application loads correctly
- [ ] Authentication works
- [ ] File uploads work
- [ ] Database connections active
- [ ] API endpoints responding
- [ ] Chat functionality works
- [ ] Flashcard generation works
- [ ] Search functionality works
- [ ] Export functionality works
- [ ] Mobile responsiveness verified

### 9. Monitoring Setup

**Tools to Configure**:
- Error tracking (Sentry, LogRocket, etc.)
- Analytics (Google Analytics, Plausible, etc.)
- Uptime monitoring (UptimeRobot, Pingdom, etc.)
- Performance monitoring

### 10. Documentation Updates

**Update**:
- [ ] README.md with production URLs
- [ ] API documentation with production endpoints
- [ ] Deployment guide with actual steps taken
- [ ] Environment variable documentation

## Rollback Procedure

**If deployment fails**:
1. Access VirginTech Arc or cslaunch.vt dashboard
2. Navigate to deployment history
3. Revert to previous successful deployment
4. Check error logs in platform dashboard
5. Review build logs for errors
6. Fix issues locally
7. Re-deploy after fixes

**Platform-Specific Rollback**:
- **VirginTech Arc**: Use deployment history to rollback to previous version
- **cslaunch.vt**: Access deployment management to revert to previous build

## Continuous Deployment

**Setup**:
- Configure automatic deployment on push to `main` branch in platform settings
- Manual deployment option for other branches
- Preview deployments for pull requests (if supported by platform)

**Platform Configuration**:
- **VirginTech Arc**: Enable auto-deploy in project settings
- **cslaunch.vt**: Configure deployment triggers in project settings

## Production Best Practices

1. **Never commit**:
   - Environment variables
   - API keys
   - Secrets

2. **Always**:
   - Test in staging first
   - Review changes before merging
   - Monitor error logs
   - Keep dependencies updated

3. **Regular Tasks**:
   - Database backups
   - Security audits
   - Performance monitoring
   - Dependency updates

## Troubleshooting

### Common Issues:

**Build Failures**:
- Check build logs in VirginTech Arc or cslaunch.vt dashboard
- Verify all dependencies are in package.json
- Check for TypeScript errors
- Verify Node.js version compatibility with platform
- Check working directory configuration if frontend/backend are separate

**Database Connection Issues**:
- Verify Supabase URL and keys
- Check RLS policies
- Verify network access

**File Upload Issues**:
- Check storage bucket configuration
- Verify bucket policies
- Check file size limits

**Authentication Issues**:
- Verify Supabase Auth configuration
- Check redirect URLs
- Verify CORS settings
