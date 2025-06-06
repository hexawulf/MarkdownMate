# Deployment Guide

This guide covers deploying MarkdownMate to various platforms.

## GitHub Pages (Recommended)

### Automatic Deployment

The repository is configured for automatic deployment to GitHub Pages using GitHub Actions.

1. **Fork/Clone the repository** to your GitHub account
2. **Enable GitHub Pages** in repository settings:
   - Go to Settings → Pages
   - Set Source to "GitHub Actions"
3. **Push to main branch** - deployment happens automatically
4. **Access your site** at `https://yourusername.github.io/MarkdownMate`

### Manual Deployment

If you prefer manual deployment:

```bash
# Build the project
npm run build

# Deploy to GitHub Pages (requires gh-pages package)
npm install -g gh-pages
gh-pages -d dist
```

## Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/hexawulf/MarkdownMate)

### Manual Deployment

1. **Import repository** in Vercel dashboard
2. **Configure build settings**:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
3. **Deploy** - automatic deployments on push

### Environment Variables (Vercel)

Add these in Vercel dashboard if needed:
```
NODE_ENV=production
```

## Netlify

### Git-based Deployment

1. **Connect repository** in Netlify dashboard
2. **Configure build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18 (in environment variables)
3. **Deploy** - automatic deployments on push

### Drag and Drop Deployment

```bash
# Build the project
npm run build

# Upload the dist folder to Netlify
```

## Self-Hosting

### Using Node.js

```bash
# Clone and install
git clone https://github.com/hexawulf/MarkdownMate.git
cd MarkdownMate
npm install

# Build the project
npm run build

# Serve with a static server
npm install -g serve
serve -s dist -l 3000
```

### Using Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location /api {
            return 404;
        }
    }
}
```

Build and run:

```bash
docker build -t markdownmate .
docker run -p 8080:80 markdownmate
```

## Environment Configuration

### Production Environment Variables

```bash
NODE_ENV=production
DATABASE_URL=your_database_url_here
```

### Build Optimization

The build process includes:
- Code splitting for optimal loading
- Asset optimization and compression
- Source map generation (disabled in production)
- Bundle analysis and tree shaking

### Performance Considerations

- **Bundle Size**: ~2MB total (gzipped)
- **Monaco Editor**: Loaded as separate chunk
- **UI Components**: Bundled efficiently
- **Assets**: Optimized and compressed

## Custom Domain

### GitHub Pages

1. Add `CNAME` file to `public` directory:
   ```
   yourdomain.com
   ```

2. Configure DNS records:
   ```
   CNAME www yourusername.github.io
   A @ 185.199.108.153
   A @ 185.199.109.153
   A @ 185.199.110.153
   A @ 185.199.111.153
   ```

### Vercel

1. Add domain in Vercel dashboard
2. Configure DNS records as provided
3. SSL certificate is automatic

## Monitoring and Analytics

### Error Tracking

Add error tracking service integration:

```javascript
// In main.tsx
if (import.meta.env.PROD) {
  // Initialize your error tracking service
  // Example: Sentry, LogRocket, etc.
}
```

### Analytics

Add analytics tracking:

```javascript
// In App.tsx
useEffect(() => {
  if (import.meta.env.PROD) {
    // Initialize analytics
    // Example: Google Analytics, Plausible, etc.
  }
}, []);
```

## Troubleshooting

### Common Issues

**Build Fails**
- Check Node.js version (18+ required)
- Clear `node_modules` and reinstall
- Verify all dependencies are installed

**404 on Refresh**
- Configure server for SPA routing
- Ensure `index.html` fallback is set up

**Large Bundle Size**
- Check for unnecessary dependencies
- Verify code splitting is working
- Use bundle analyzer to identify issues

**Slow Loading**
- Enable gzip compression
- Configure CDN for assets
- Optimize images and fonts

### Performance Optimization

```bash
# Analyze bundle size
npm install -g webpack-bundle-analyzer
npx vite-bundle-analyzer

# Check dependencies
npm install -g depcheck
depcheck

# Security audit
npm audit
```

## Rollback Strategy

### GitHub Pages
- Revert commit and push to main branch
- Or manually revert in GitHub interface

### Vercel
- Use Vercel dashboard to rollback to previous deployment
- Or push a revert commit

### Self-hosted
- Keep previous build artifacts
- Use blue-green deployment strategy
- Implement health checks

## Security Considerations

- Enable HTTPS (automatic on most platforms)
- Configure Content Security Policy
- Set up proper CORS headers
- Regular dependency updates
- Security audit of dependencies

## Maintenance

### Regular Tasks
- Update dependencies monthly
- Monitor performance metrics
- Check error logs weekly
- Backup important data
- Test deployment process quarterly

### Version Updates
1. Update version in package.json
2. Update CHANGELOG.md
3. Create release tag
4. Deploy follows automatically