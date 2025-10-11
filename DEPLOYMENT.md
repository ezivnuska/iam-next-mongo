# Deployment Guide - DigitalOcean Droplet with Nginx

This guide walks through deploying this Next.js app with custom Socket.IO server to a DigitalOcean droplet using Nginx as a reverse proxy.

## Prerequisites

- DigitalOcean account
- Domain name (optional but recommended)
- Local terminal with SSH access

---

## Step 1: Create DigitalOcean Droplet

1. **Create a new droplet:**
   - OS: Ubuntu 22.04 LTS (recommended)
   - Plan: Basic (Shared CPU)
   - CPU Options: Regular (2GB RAM minimum, 4GB recommended)
   - Datacenter region: Choose closest to your users
   - Authentication: SSH keys (recommended) or password

2. **Note your droplet's IP address** (e.g., `123.45.67.89`)

---

## Step 2: Initial Server Setup

### Connect to your droplet:
```bash
ssh root@YOUR_DROPLET_IP
```

### Update system packages:
```bash
apt update && apt upgrade -y
```

### Create a non-root user:
```bash
adduser deploy
usermod -aG sudo deploy
```

### Set up SSH for the new user (if using SSH keys):
```bash
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

### Switch to the new user:
```bash
su - deploy
```

---

## Step 3: Install Node.js

### Install Node.js 20 (LTS):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Verify installation:
```bash
node --version  # Should show v20.x.x
npm --version
```

### Install pnpm globally:
```bash
sudo npm install -g pnpm
```

---

## Step 4: Install and Configure MongoDB

### Option A: Local MongoDB Installation

```bash
# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
```

**MongoDB connection string:** `mongodb://localhost:27017/your-database-name`

### Option B: Use MongoDB Atlas (Recommended)

- Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Create a free cluster
- Get your connection string
- Whitelist your droplet's IP address in Atlas Network Access

---

## Step 5: Install Nginx

```bash
sudo apt install -y nginx
```

### Enable firewall and allow Nginx:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Verify Nginx is running:
```bash
sudo systemctl status nginx
```

---

## Step 6: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### Configure PM2 to start on boot:
```bash
pm2 startup systemd -u deploy --hp /home/deploy
# Copy and run the command that PM2 outputs
```

---

## Step 7: Deploy Your Application

### Clone your repository:
```bash
cd ~
git clone YOUR_REPOSITORY_URL
cd iam-next-mongo  # or your repo name
```

### Install dependencies:
```bash
pnpm install
```

### Create environment file:
```bash
nano .env
```

**Add your environment variables:**
```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/your-database-name
# OR for Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name

# NextAuth
AUTH_SECRET=your-very-long-random-secret-key-here
AUTH_URL=https://yourdomain.com
# OR for testing:
# AUTH_URL=http://YOUR_DROPLET_IP:3000

# Socket.IO
NEXT_PUBLIC_APP_URL=https://yourdomain.com
# OR for testing:
# NEXT_PUBLIC_APP_URL=http://YOUR_DROPLET_IP:3000

# AWS S3 (if using image uploads)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
```

**Generate AUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Build the application:
```bash
pnpm build
```

---

## Step 8: Configure PM2

### Create PM2 ecosystem file:
```bash
nano ecosystem.config.js
```

**Add this configuration:**
```javascript
module.exports = {
  apps: [{
    name: 'nextjs-app',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/deploy/.pm2/logs/nextjs-error.log',
    out_file: '/home/deploy/.pm2/logs/nextjs-out.log',
    time: true
  }]
}
```

### Start the application:
```bash
pm2 start ecosystem.config.js
```

### Save PM2 process list:
```bash
pm2 save
```

### Verify app is running:
```bash
pm2 status
pm2 logs nextjs-app
```

---

## Step 9: Configure Nginx as Reverse Proxy

### Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/nextjs-app
```

**Add this configuration:**
```nginx
# HTTP - Redirect to HTTPS (after SSL is set up)
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # For testing without SSL, comment out the return line and use the proxy_pass below
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Socket.IO specific settings
        proxy_buffering off;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
    }

    # WebSocket support for Socket.IO
    location /api/socket/io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket specific settings
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}

# HTTPS configuration (uncomment after SSL setup)
# server {
#     listen 443 ssl http2;
#     listen [::]:443 ssl http2;
#     server_name yourdomain.com www.yourdomain.com;
#
#     ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers HIGH:!aNULL:!MD5;
#
#     location / {
#         proxy_pass http://localhost:3000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#         proxy_cache_bypass $http_upgrade;
#
#         proxy_buffering off;
#         proxy_set_header X-Forwarded-Host $host;
#         proxy_set_header X-Forwarded-Port $server_port;
#     }
#
#     location /api/socket/io {
#         proxy_pass http://localhost:3000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection "upgrade";
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#
#         proxy_read_timeout 86400;
#         proxy_send_timeout 86400;
#     }
# }
```

**Replace `yourdomain.com` with your actual domain or use your droplet IP for testing.**

### Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/nextjs-app /etc/nginx/sites-enabled/
```

### Remove default Nginx site:
```bash
sudo rm /etc/nginx/sites-enabled/default
```

### Test Nginx configuration:
```bash
sudo nginx -t
```

### Reload Nginx:
```bash
sudo systemctl reload nginx
```

---

## Step 10: Set Up SSL with Let's Encrypt (Optional but Recommended)

### Install Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Obtain SSL certificate:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: yes)

### Auto-renewal test:
```bash
sudo certbot renew --dry-run
```

Certbot will automatically renew certificates before they expire.

### Update your .env file:
```bash
nano ~/iam-next-mongo/.env
```

Update URLs to use HTTPS:
```bash
AUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Restart the application:
```bash
cd ~/iam-next-mongo
pm2 restart nextjs-app
```

---

## Step 11: DNS Configuration (If Using a Domain)

Point your domain to your droplet:

1. Go to your domain registrar (Namecheap, GoDaddy, etc.)
2. Add these DNS records:

```
Type    Name    Value                TTL
A       @       YOUR_DROPLET_IP      300
A       www     YOUR_DROPLET_IP      300
```

Wait 5-30 minutes for DNS propagation.

---

## Verification & Testing

### Check if app is running:
```bash
pm2 status
pm2 logs nextjs-app
```

### Check Nginx status:
```bash
sudo systemctl status nginx
```

### Test HTTP connection:
```bash
curl http://localhost:3000
curl http://yourdomain.com
```

### Test Socket.IO connection:
Open your browser's console on your site and check for:
- `Socket connected: [socket-id]`

### Monitor logs:
```bash
# Application logs
pm2 logs nextjs-app

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Maintenance Commands

### Update the application:
```bash
cd ~/iam-next-mongo
git pull origin main
pnpm install
pnpm build
pm2 restart nextjs-app
```

### View PM2 logs:
```bash
pm2 logs nextjs-app
pm2 logs nextjs-app --lines 100
```

### Restart application:
```bash
pm2 restart nextjs-app
```

### Stop application:
```bash
pm2 stop nextjs-app
```

### Monitor application:
```bash
pm2 monit
```

### Check disk space:
```bash
df -h
```

### Check memory usage:
```bash
free -m
```

---

## Troubleshooting

### Application won't start:
```bash
# Check logs
pm2 logs nextjs-app --err

# Check if port 3000 is in use
sudo netstat -tulpn | grep 3000

# Kill process on port 3000 if needed
sudo kill -9 $(sudo lsof -t -i:3000)
```

### Nginx errors:
```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### MongoDB connection issues:
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

### Socket.IO not connecting:
1. Check firewall allows connections on port 80/443
2. Verify Nginx WebSocket configuration
3. Check browser console for connection errors
4. Ensure `NEXT_PUBLIC_APP_URL` uses correct protocol (http/https)

### Out of memory:
```bash
# Restart application
pm2 restart nextjs-app

# Consider upgrading droplet size if memory issues persist
```

---

## Security Best Practices

1. **Keep system updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Configure firewall properly:**
   ```bash
   sudo ufw status
   ```

3. **Use environment variables for secrets** (never commit .env)

4. **Regular backups:**
   ```bash
   # Backup MongoDB
   mongodump --out=/home/deploy/backups/$(date +%Y%m%d)
   ```

5. **Monitor logs regularly:**
   ```bash
   pm2 logs
   ```

6. **Set up monitoring** (optional):
   - Use PM2 Plus for monitoring
   - Set up alerts for downtime

---

## Estimated Costs

- **DigitalOcean Droplet:** $12-24/month (2-4GB RAM)
- **Domain Name:** $10-15/year
- **SSL Certificate:** Free (Let's Encrypt)
- **MongoDB:** Free (local) or $0-9/month (Atlas free tier)

**Total:** ~$15-30/month

---

## Next Steps

1. Set up automatic backups
2. Configure monitoring and alerts
3. Set up staging environment
4. Implement CI/CD pipeline
5. Consider CDN for static assets

For questions or issues, refer to:
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [DigitalOcean Community](https://www.digitalocean.com/community)
