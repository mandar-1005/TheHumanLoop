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
3. Deploy to Vercel/Netlify
4. Run post-deployment checks

### 3. Vercel/Netlify Configuration

#### Vercel Setup:
1. Connect GitHub repository
2. Configure build settings:
   - Build command: `npm run build`
   - Output directory: `frontend/.next` (if Next.js) or `frontend/build`
   - Install command: `npm install`
3. Set environment variables
4. Configure domain
5. Enable SSL

#### Netlify Setup:
1. Connect GitHub repository
2. Configure build settings in `netlify.toml`
3. Set environment variables in dashboard
4. Configure domain and SSL

### 4. Environment Configuration

**Production Environment Variables**:
- `NEXT_PUBLIC_SUPABASE_URL` - Production Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Production anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)
- `GOOGLE_ADK_API_KEY` - Production API key
- `NEXT_PUBLIC_APP_URL` - Production app URL

**Set in**:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables

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
1. Add custom domain in Vercel/Netlify
2. Configure DNS records:
   - A record or CNAME pointing to hosting provider
3. Enable SSL certificate (automatic with Let's Encrypt)
4. Verify domain is active

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
1. Revert to previous deployment in Vercel/Netlify dashboard
2. Check error logs
3. Fix issues locally
4. Re-deploy after fixes

## Continuous Deployment

**Setup**:
- Automatic deployment on push to `main` branch
- Manual deployment for other branches
- Preview deployments for pull requests

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
- Check build logs in deployment platform
- Verify all dependencies are in package.json
- Check for TypeScript errors

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
