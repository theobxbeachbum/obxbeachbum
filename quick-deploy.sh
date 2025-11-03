#!/bin/bash

# Newsletter System - Quick Deploy Script for VPS
# Run this script on your Knownhost VPS

set -e

echo "🚀 Newsletter System - Quick Deploy"
echo "===================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Installing..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

echo ""
echo "📝 Configuration Setup"
echo "====================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    read -p "Enter your domain (e.g., newsletter.yourdomain.com): " DOMAIN
    
    cat > .env << EOF
# Backend URL
BACKEND_URL=https://${DOMAIN}

# Stripe API Key (use test key for now)
STRIPE_API_KEY=sk_test_emergent
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🏗️  Building and starting containers..."
echo "========================================"
echo ""

# Build and start containers
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Check status
echo ""
echo "📊 Container Status:"
docker-compose ps

echo ""
echo "✅ Deployment Complete!"
echo "======================="
echo ""
echo "📍 Your newsletter system is running at:"
echo "   Frontend: http://$(hostname -I | awk '{print $1}')"
echo "   Admin:    http://$(hostname -I | awk '{print $1}')/admin/login"
echo ""
echo "🔐 Default admin password: admin123"
echo ""
echo "⚠️  Next Steps:"
echo "   1. Point your domain to this server's IP"
echo "   2. Set up SSL with: sudo bash setup-ssl.sh"
echo "   3. Login to admin panel and:"
echo "      - Change admin password"
echo "      - Configure SendGrid API key"
echo "      - Configure Bunny.net CDN"
echo ""
echo "📖 Full documentation: See DEPLOYMENT.md"
echo ""
echo "🔍 View logs: docker-compose logs -f"
echo "🛑 Stop all:  docker-compose down"
echo ""
