# Deployment Guide

MarkdownMate v2.0+ is designed for self-hosted deployment. All instructions assume you're deploying to a Linux server (Raspberry Pi, VPS, or dedicated server).

## Prerequisites

- Node.js 18+ and npm
- Linux server with systemd or PM2
- Nginx (recommended) or Apache for reverse proxy
- (Optional) Domain name and SSL certificate

## Building for Production

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the application:**
   ```bash
   npm run build
   ```

   This creates a `dist/` directory containing:
   - Static client files (HTML, CSS, JS, assets)
   - Compiled server file (`index.js`)

3. **Test the build locally:**
   ```bash
   npm start
   ```
   
   Visit `http://localhost:5004` to verify the build works.

## Deployment Options

### Option 1: PM2 (Recommended)

PM2 is a production process manager for Node.js applications.

1. **Install PM2 globally:**
   ```bash
   sudo npm install -g pm2
   ```

2. **The included `ecosystem.config.cjs` is already configured:**
   ```javascript
   module.exports = {
     apps: [{
       name: 'markdownmate',
       script: 'npm',
       args: 'start',
       env_file: '.env',
       env: {
         PORT: 5004,
         NODE_ENV: 'production'
       },
       watch: false,
       instances: 1,
       exec_mode: 'fork'
     }]
   }
   ```

3. **Start with PM2:**
   ```bash
   pm2 start ecosystem.config.cjs
   pm2 save
   pm2 startup  # Follow instructions to enable autostart
   ```

4. **Manage the application:**
   ```bash
   pm2 status          # Check status
   pm2 logs markdownmate  # View logs
   pm2 restart markdownmate  # Restart
   pm2 stop markdownmate     # Stop
   ```

### Option 2: Systemd Service

Create `/etc/systemd/system/markdownmate.service`:

```ini
[Unit]
Description=MarkdownMate Editor
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/MarkdownMate
Environment=NODE_ENV=production
Environment=PORT=5004
ExecStart=/usr/bin/node /path/to/MarkdownMate/dist/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable markdownmate
sudo systemctl start markdownmate
sudo systemctl status markdownmate
```

## Nginx Reverse Proxy

### Basic Configuration

Create `/etc/nginx/sites-available/markdownmate`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name markdown.example.com;

    location / {
        proxy_pass http://127.0.0.1:5004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:5004;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/markdownmate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL with Let's Encrypt

1. **Install certbot:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Obtain certificate:**
   ```bash
   sudo certbot --nginx -d markdown.example.com
   ```

3. **Certbot will automatically update your Nginx config for HTTPS.**

### Full Nginx Configuration with SSL

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name markdown.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name markdown.example.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/markdown.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/markdown.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy to Node.js app
    location / {
        proxy_pass http://127.0.0.1:5004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:5004;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Updating the Application

1. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

2. **Install dependencies (if changed):**
   ```bash
   npm install
   ```

3. **Rebuild:**
   ```bash
   npm run build
   ```

4. **Restart:**
   ```bash
   # With PM2
   pm2 restart markdownmate
   
   # With systemd
   sudo systemctl restart markdownmate
   ```

## Monitoring

### With PM2

```bash
pm2 monit  # Real-time monitoring
pm2 logs markdownmate  # View logs
pm2 logs markdownmate --lines 100  # Last 100 lines
```

### With systemd

```bash
sudo journalctl -u markdownmate -f  # Follow logs
sudo journalctl -u markdownmate --since "1 hour ago"
```

## Troubleshooting

### Port Already in Use

```bash
sudo lsof -nP -iTCP:5004 -sTCP:LISTEN
sudo kill <PID>
```

### Application Won't Start

1. Check logs:
   ```bash
   pm2 logs markdownmate  # PM2
   sudo journalctl -u markdownmate -n 50  # systemd
   ```

2. Verify Node.js version:
   ```bash
   node --version  # Should be 18+
   ```

3. Check environment:
   ```bash
   cat .env
   ```

4. Test manually:
   ```bash
   NODE_ENV=production node dist/index.js
   ```

### Nginx Issues

```bash
sudo nginx -t  # Test configuration
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

## Security Checklist

- [ ] Firewall configured (allow only 22, 80, 443)
- [ ] SSL certificate installed and auto-renewal enabled
- [ ] Application runs as non-root user
- [ ] Security headers configured in Nginx
- [ ] Regular system updates scheduled
- [ ] Backups configured (though data is client-side in IndexedDB)
- [ ] Fail2ban or similar intrusion prevention installed

## Performance Tips

1. **Enable Nginx gzip compression:**
   ```nginx
   gzip on;
   gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
   ```

2. **Increase PM2 log rotation:**
   ```bash
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 10M
   ```

3. **Monitor resource usage:**
   ```bash
   htop
   pm2 monit
   ```

## Support

For deployment issues:
- Check the [README](README.md) for general documentation
- Open an issue on [GitHub](https://github.com/hexawulf/MarkdownMate/issues)
- Review logs for error messages
