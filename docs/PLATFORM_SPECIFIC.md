# Platform-Specific Deployment Notes

## VirginTech Arc Platform

### Getting Started
1. Access VirginTech Arc platform dashboard
2. Create new project or select existing project
3. Connect GitHub repository

### Build Configuration
- **Build Command**: `npm run build` or `npm run build:production`
- **Output Directory**: Configure based on your framework:
  - Next.js: `frontend/.next`
  - React (Create React App): `frontend/build`
  - Vite: `frontend/dist`
- **Install Command**: `npm install` or `npm ci`
- **Node Version**: Specify in platform settings if required

### Environment Variables
- Access via: Project Settings → Environment Variables
- Add all variables from `.env.example`
- Ensure `NEXT_PUBLIC_*` variables are set for frontend builds

### Domain & SSL
- SSL certificates are typically automatic
- Custom domains can be added in domain settings
- DNS configuration instructions provided in platform

### Deployment Process
1. Push code to GitHub `main` branch
2. Platform automatically triggers build (if auto-deploy enabled)
3. Monitor build logs in dashboard
4. Deployment URL provided after successful build

### Monitoring
- Access deployment logs in dashboard
- View build history
- Monitor application health
- Check error logs

## cslaunch.vt Platform

### Getting Started
1. Access cslaunch.vt platform
2. Create new deployment/project
3. Link GitHub repository

### Build Configuration
- **Build Command**: `npm run build`
- **Output Directory**: 
  - Next.js: `frontend/.next`
  - React: `frontend/build`
  - Vite: `frontend/dist`
- **Working Directory**: Set to `frontend/` if frontend is in subdirectory
- **Node Version**: Configure in platform settings

### Environment Variables
- Access via: Deployment Settings → Environment Variables
- Add production environment variables
- Separate staging/production environments if available

### Domain & SSL
- Configure custom domain in domain settings
- SSL certificate setup instructions provided
- DNS records configuration guide available

### Deployment Process
1. Connect repository and configure build settings
2. Set environment variables
3. Trigger initial deployment
4. Enable auto-deploy for future pushes
5. Monitor deployment status

### Features
- Deployment history and rollback
- Build logs and error tracking
- Environment management
- Custom domain support

## Platform Comparison

### When to Use VirginTech Arc:
- If you have existing VirginTech infrastructure
- For integrated VT ecosystem services
- If team is familiar with Arc platform

### When to Use cslaunch.vt:
- For Virginia Tech specific deployments
- If cslaunch.vt is preferred by your team
- For VT-affiliated projects

## Common Configuration

### Both Platforms Require:
- GitHub repository connection
- Build command configuration
- Environment variables setup
- Domain configuration (if custom domain needed)
- SSL certificate (usually automatic)

### Recommended Settings:
- **Auto-deploy**: Enable for `main` branch
- **Build caching**: Enable if available
- **Error notifications**: Configure email/Slack alerts
- **Monitoring**: Set up uptime monitoring

## Troubleshooting Platform-Specific Issues

### VirginTech Arc:
- Check platform status page for outages
- Verify GitHub integration is active
- Review build logs for specific errors
- Contact VirginTech support if needed

### cslaunch.vt:
- Verify repository access permissions
- Check build configuration matches project structure
- Review platform documentation for specific requirements
- Contact cslaunch.vt support for platform-specific issues

## Migration Between Platforms

If you need to switch platforms:
1. Export environment variables from current platform
2. Set up new platform with same configuration
3. Update DNS records if domain changed
4. Test deployment thoroughly
5. Update documentation with new URLs
