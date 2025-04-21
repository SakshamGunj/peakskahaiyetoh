#!/bin/bash

# Deployment script for Restaurant Slot Machine application
# Run this on your Google Cloud VM

# Set variables
APP_DIR="/var/www/restaurant-slot-machine"
DOMAIN="yourdomain.com"  # Replace with your actual domain

# Create application directory
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# Clone or copy application files
# Option 1: If you're using Git
# git clone https://your-repository-url.git $APP_DIR

# Option 2: If uploading files directly (run this on your local machine)
# Replace USERNAME and VM_IP with your actual VM username and IP
# rsync -avz --exclude 'node_modules' --exclude '.git' ./ USERNAME@VM_IP:$APP_DIR

# Navigate to app directory
cd $APP_DIR

# Install PM2 for process management
sudo npm install -g pm2

# Create a simple server to serve static files
cat > server.js << EOF
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));

// Handle SPA routing
app.get('/*', function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
EOF

# Install dependencies
npm init -y
npm install express

# Configure PM2 to start the app
pm2 start server.js --name restaurant-slot-machine
pm2 save
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

# Configure Nginx
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# If test passes, restart Nginx
sudo systemctl restart nginx

# Set up SSL with Certbot
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN

echo "Deployment completed! Your app should be available at https://$DOMAIN"
