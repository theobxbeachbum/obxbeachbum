# Newsletter System - VPS Deployment Guide

Complete guide to deploy your newsletter system to your Knownhost VPS using Docker.

## 📋 Prerequisites

### On Your VPS:
1. **Docker & Docker Compose installed**
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Domain pointed to your VPS** (for SSL)
   - A record: `newsletter.yourdomain.com` → Your VPS IP

3. **Ports open**: 80, 443, 8001 (optional for direct backend access)

## 🚀 Quick Deployment (5 minutes)

### Step 1: Clone Your Repository
```bash
cd /var/www  # or your preferred directory
git clone https://github.com/yourusername/newsletter-app.git
cd newsletter-app
```

### Step 2: Configure Environment Variables
```bash
# Create .env file in the root directory
cat > .env << 'EOF'
# Backend URL (your domain)
BACKEND_URL=https://newsletter.yourdomain.com

# Stripe (optional, for supporters)
STRIPE_API_KEY=sk_test_emergent

# Add your production Stripe key later:
# STRIPE_API_KEY=sk_live_xxxxx
EOF
```

### Step 3: Build and Start Containers
```bash
# Build and start all services
docker-compose up -d

# Check if everything is running
docker-compose ps

# View logs if needed
docker-compose logs -f
```

### Step 4: Set Up SSL with Let's Encrypt
```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Stop nginx temporarily
docker-compose stop frontend

# Get SSL certificate
sudo certbot certonly --standalone -d newsletter.yourdomain.com

# Copy certificates to your project
sudo mkdir -p ./ssl
sudo cp /etc/letsencrypt/live/newsletter.yourdomain.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/newsletter.yourdomain.com/privkey.pem ./ssl/

# Update nginx.conf to enable SSL (uncomment SSL lines)
# Then restart
docker-compose up -d
```

### Step 5: Configure Admin Panel
1. Visit `https://newsletter.yourdomain.com/admin/login`
2. Login with password: `admin123`
3. Go to Settings:
   - Change admin password
   - Add SendGrid API key and sender email
   - Add Bunny.net credentials
   - Enable Stripe supporters (optional)

## 🔄 Updating Your Application

```bash
# Pull latest changes from GitHub
cd /var/www/newsletter-app
git pull origin main

# Rebuild and restart containers
docker-compose down
docker-compose up -d --build

# View logs to confirm
docker-compose logs -f
```

## 📊 Useful Commands

```bash
# View all containers
docker-compose ps

# View logs
docker-compose logs -f [service-name]
# Examples:
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart a service
docker-compose restart backend

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes database)
docker-compose down -v

# Access MongoDB shell
docker-compose exec mongodb mongosh newsletter_db

# Backup MongoDB
docker-compose exec mongodb mongodump --out /data/backup

# View resource usage
docker stats
```

## 🔒 Security Checklist

- [ ] Changed default admin password
- [ ] SSL certificate installed and working
- [ ] Firewall configured (UFW recommended)
- [ ] MongoDB not exposed to internet (only Docker network)
- [ ] Regular backups configured
- [ ] Environment variables secured (not in git)
- [ ] SendGrid API key added
- [ ] Bunny.net credentials configured

## 📦 Database Backups

### Automated Daily Backups
```bash
# Create backup script
cat > /usr/local/bin/backup-newsletter.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/newsletter"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cd /var/www/newsletter-app

# Backup MongoDB
docker-compose exec -T mongodb mongodump --archive > $BACKUP_DIR/mongodb_$DATE.archive

# Keep only last 7 days
find $BACKUP_DIR -name "mongodb_*.archive" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

sudo chmod +x /usr/local/bin/backup-newsletter.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add this line:
0 2 * * * /usr/local/bin/backup-newsletter.sh >> /var/log/newsletter-backup.log 2>&1
```

## 🔧 Troubleshooting

### Frontend can't connect to backend
- Check `BACKEND_URL` in `.env` file
- Ensure it matches your domain
- Rebuild frontend: `docker-compose up -d --build frontend`

### MongoDB connection issues
- Check if MongoDB is running: `docker-compose ps mongodb`
- View MongoDB logs: `docker-compose logs mongodb`
- Ensure connection string is correct in backend

### SSL certificate issues
- Verify domain DNS points to your VPS IP
- Check certificate paths in `nginx.conf`
- Restart frontend: `docker-compose restart frontend`

### Images not uploading
- Check Bunny.net credentials in Settings
- Verify API key has write permissions
- Check backend logs: `docker-compose logs backend`

### Email not sending
- Verify SendGrid API key in Settings
- Check sender email is verified in SendGrid
- View backend logs for errors

## 🌐 Custom Domain Setup

### DNS Configuration
```
Type: A Record
Name: newsletter (or @)
Value: Your VPS IP address
TTL: 3600
```

### SSL Auto-Renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot auto-renewal is usually configured by default
# Check with:
sudo systemctl status certbot.timer
```

## 📈 Performance Optimization

### For High Traffic:
```yaml
# Add to docker-compose.yml under backend service:
deploy:
  replicas: 3
  resources:
    limits:
      cpus: '1'
      memory: 512M
```

### Enable Docker Logging Limits:
```yaml
# Add to each service in docker-compose.yml:
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## 🆘 Support

If you encounter issues:
1. Check logs: `docker-compose logs -f`
2. Verify all services running: `docker-compose ps`
3. Review this guide's troubleshooting section
4. Check GitHub issues for similar problems

## 🎉 Success!

Your newsletter system should now be running at:
- **Frontend**: https://newsletter.yourdomain.com
- **Admin**: https://newsletter.yourdomain.com/admin/login
- **Backend API**: https://newsletter.yourdomain.com/api

Happy newsletter writing! 📮