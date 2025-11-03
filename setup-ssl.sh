#!/bin/bash

# SSL Certificate Setup with Let's Encrypt
# Run this AFTER pointing your domain to the VPS

set -e

echo "🔒 SSL Certificate Setup"
echo "========================"
echo ""

# Check if domain is configured
if [ ! -f .env ]; then
    echo "❌ .env file not found. Run quick-deploy.sh first."
    exit 1
fi

# Extract domain from .env
DOMAIN=$(grep BACKEND_URL .env | cut -d'=' -f2 | sed 's|https://||' | sed 's|http://||')

if [ -z "$DOMAIN" ]; then
    echo "❌ Domain not found in .env file"
    exit 1
fi

echo "📍 Domain: $DOMAIN"
echo ""

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot
    echo "✅ Certbot installed"
else
    echo "✅ Certbot already installed"
fi

echo ""
echo "⏸️  Stopping frontend container temporarily..."
docker-compose stop frontend

echo ""
echo "🔐 Obtaining SSL certificate..."
echo "   (You may be asked for an email and to agree to terms)"
echo ""

sudo certbot certonly --standalone -d $DOMAIN

echo ""
echo "📋 Copying certificates..."
sudo mkdir -p ./ssl
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ./ssl/
sudo chmod -R 755 ./ssl

echo ""
echo "⚙️  Updating nginx configuration for SSL..."

# Update nginx.conf to enable SSL
sed -i 's|# listen 443 ssl http2;|listen 443 ssl http2;|' nginx.conf
sed -i 's|# ssl_certificate|ssl_certificate|' nginx.conf

# Add redirect from HTTP to HTTPS
cat > nginx-ssl.conf << 'EOF'
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name _;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    
    # Frontend - React static files
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API - Proxy to FastAPI
    location /api {
        proxy_pass http://backend:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Increase max upload size for images
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript;
}
EOF

mv nginx-ssl.conf nginx.conf

echo ""
echo "🔄 Restarting containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

echo ""
echo "✅ SSL Setup Complete!"
echo "======================"
echo ""
echo "🌐 Your newsletter is now available at:"
echo "   https://$DOMAIN"
echo "   https://$DOMAIN/admin/login"
echo ""
echo "🔄 SSL certificates will auto-renew via certbot"
echo ""
echo "🔍 Test your SSL: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo ""
