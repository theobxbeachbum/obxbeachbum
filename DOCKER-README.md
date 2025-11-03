# Newsletter System - Docker Deployment Files

This directory contains everything you need to deploy your newsletter system to any VPS using Docker.

## 📦 What's Included

### Docker Files
- **`Dockerfile.backend`** - Backend (FastAPI + Python)
- **`Dockerfile.frontend`** - Frontend (React + Nginx)
- **`docker-compose.yml`** - Orchestrates all services (MongoDB, Backend, Frontend)
- **`nginx.conf`** - Production nginx configuration
- **`.dockerignore`** - Excludes unnecessary files from Docker builds

### Deployment Scripts
- **`quick-deploy.sh`** - One-command deployment (installs Docker, sets up everything)
- **`setup-ssl.sh`** - Automated SSL certificate setup with Let's Encrypt
- **`.env.example`** - Example environment variables

### Documentation
- **`DEPLOYMENT.md`** - Complete deployment guide with troubleshooting

## 🚀 Quick Start (3 Commands)

### On Your Knownhost VPS:

```bash
# 1. Clone your repository
git clone https://github.com/yourusername/newsletter-app.git
cd newsletter-app

# 2. Run quick deploy (installs Docker, starts everything)
sudo bash quick-deploy.sh

# 3. Set up SSL (after pointing your domain to VPS)
sudo bash setup-ssl.sh
```

**That's it!** Your newsletter will be running at `https://yourdomain.com`

## 📋 What Each File Does

### `Dockerfile.backend`
- Uses Python 3.11
- Installs all Python dependencies
- Runs FastAPI with Uvicorn on port 8001

### `Dockerfile.frontend`
- Multi-stage build (build + production)
- Builds React app with production optimizations
- Serves with Nginx on port 80/443

### `docker-compose.yml`
Orchestrates 3 services:
1. **MongoDB** - Database on port 27017
2. **Backend** - FastAPI API on port 8001
3. **Frontend** - React + Nginx on ports 80/443

### `nginx.conf`
- Routes `/api/*` requests to backend
- Serves React static files for all other routes
- Handles SPA routing (redirects to index.html)
- SSL configuration ready
- Gzip compression enabled

## 🔧 Manual Deployment Steps

If you prefer not to use the quick-deploy script:

### 1. Prerequisites
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Configure Environment
```bash
# Copy example env file
cp .env.example .env

# Edit with your domain
nano .env
```

### 3. Deploy
```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 4. Set Up SSL
```bash
# Stop frontend
docker-compose stop frontend

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates
sudo mkdir -p ./ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/*.pem ./ssl/

# Update nginx.conf (uncomment SSL lines)
# Restart
docker-compose up -d
```

## 🔄 Updating Your App

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

## 📊 Monitoring

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb

# Check resource usage
docker stats

# List containers
docker-compose ps
```

## 💾 Backups

### Manual Backup
```bash
# Backup MongoDB
docker-compose exec mongodb mongodump --out /data/backup

# Copy backup out of container
docker cp newsletter-mongodb:/data/backup ./backup-$(date +%Y%m%d)
```

### Restore
```bash
# Restore MongoDB
docker-compose exec mongodb mongorestore /data/backup
```

## 🐛 Troubleshooting

### Frontend can't connect to backend
- Check `BACKEND_URL` in `.env` matches your domain
- Rebuild frontend: `docker-compose up -d --build frontend`

### MongoDB connection issues
```bash
# Check MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### SSL issues
- Verify domain DNS points to VPS IP
- Check certificate permissions: `sudo chmod -R 755 ./ssl`
- View nginx logs: `docker-compose logs frontend`

### Port conflicts
If ports 80/443/8001 are already in use, edit `docker-compose.yml`:
```yaml
ports:
  - "8080:80"  # Change left side only
```

## 🔒 Security Notes

- Change admin password immediately after deployment
- Keep Docker and packages updated: `sudo apt update && sudo apt upgrade`
- Use firewall: `sudo ufw allow 80,443/tcp`
- MongoDB is only accessible within Docker network (not exposed to internet)
- SSL certificates auto-renew via certbot

## 🎯 Production Checklist

- [ ] Docker and Docker Compose installed
- [ ] Domain DNS points to VPS IP (A record)
- [ ] `.env` file configured with your domain
- [ ] Services running: `docker-compose ps`
- [ ] SSL certificate installed and working
- [ ] Admin password changed from default
- [ ] SendGrid API key configured in admin panel
- [ ] Bunny.net CDN configured in admin panel
- [ ] Test email sending
- [ ] Test image upload
- [ ] Backups configured

## 📚 Additional Resources

- **Full Documentation**: See `DEPLOYMENT.md`
- **Docker Compose Docs**: https://docs.docker.com/compose/
- **Let's Encrypt**: https://letsencrypt.org/
- **Nginx Docs**: https://nginx.org/en/docs/

## 🆘 Need Help?

1. Check `DEPLOYMENT.md` for detailed troubleshooting
2. View logs: `docker-compose logs -f`
3. Test each service individually
4. Check Docker status: `docker-compose ps`

## 💡 Tips

- **Development**: Keep using Emergent for development, push to GitHub
- **Production**: Pull from GitHub, deploy with Docker on your VPS
- **Updates**: `git pull` → `docker-compose up -d --build`
- **Rollback**: Use git tags and `git checkout <tag>` before rebuilding

---

**Ready to deploy?** Run `sudo bash quick-deploy.sh` and you'll be live in minutes! 🚀
