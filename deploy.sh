#!/bin/bash
set -e

DOMAIN="crm.sriswastikservices.com"
EMAIL="admin@sriswastikservices.com"

echo "==========================================="
echo "   Deploying CRM System to AWS EC2         "
echo "==========================================="

echo "[1/6] Pulling latest changes from Git (if applicable)..."
# git pull origin main

echo "[2/6] Stopping currently running containers..."
docker compose -f docker-compose.prod.yml down || true

echo "[3/6] Building and starting new containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo "[4/6] Cleaning up unused Docker resources..."
docker system prune -f

echo "[5/6] Setting up Nginx Reverse Proxy on Host..."
# Install Nginx and Certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo "Installing Nginx and Certbot..."
    sudo apt update
    sudo apt install -y nginx certbot python3-certbot-nginx
fi

# Create Nginx config for the domain
sudo bash -c "cat > /etc/nginx/sites-available/crm <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
    }
}
EOF"

# Enable the site
sudo ln -sf /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
# Remove default nginx site to prevent conflicts
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl restart nginx

echo "[6/6] Requesting SSL Certificate from Let's Encrypt..."
# Only request if cert doesn't exist
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "Generating new SSL Certificate for $DOMAIN..."
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL --redirect
else
    echo "SSL Certificate already exists for $DOMAIN. Skipping generation."
fi

echo "==========================================="
echo "✅ Deployment and SSL Setup Successful!"
echo "Your secure app is now running at:"
echo "👉 https://$DOMAIN"
echo "==========================================="
