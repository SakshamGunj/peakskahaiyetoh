# Complete Google Cloud VM Deployment Guide

## 1. Set Up Google Cloud Account and Project

1. **Create a Google Cloud Account** if you don't have one
   - Go to https://cloud.google.com/ and sign up

2. **Create a New Project**
   - Go to the Google Cloud Console
   - Click on the project dropdown at the top of the page
   - Select "New Project"
   - Name it "restaurant-slot-machine" or similar
   - Click "Create"

3. **Enable Billing**
   - Make sure billing is enabled for your project
   - New accounts typically get $300 free credit for 90 days

## 2. Create and Configure VM Instance

1. **Enable Compute Engine API**
   - In the cloud console, navigate to "APIs & Services" > "Library"
   - Search for "Compute Engine API"
   - Click "Enable"

2. **Create a VM Instance**
   - Go to "Compute Engine" > "VM instances"
   - Click "Create Instance"
   - Configure your VM:
     - Name: restaurant-slot-app
     - Region/Zone: Choose one close to your target users
     - Machine type: e2-small (2 vCPU, 2 GB memory)
     - Boot disk: Ubuntu 20.04 LTS
     - Identity and API access: Use default service account
     - Firewall: Check "Allow HTTP traffic" and "Allow HTTPS traffic"
   - Click "Create"

3. **Set Up a Static IP Address**
   - Go to "VPC Network" > "External IP addresses"
   - Find your VM's IP address in the list
   - Change "Type" from "Ephemeral" to "Static"
   - Give it a name like "restaurant-slot-machine-ip"
   - Save the changes
   - Note down this IP address for DNS configuration

## 3. Connect to Your VM

1. **Access Your VM**
   - In VM instances list, click the "SSH" button next to your VM
   - This will open a browser-based SSH terminal

2. **Update the System**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Install Required Software**
   ```bash
   # Install Node.js and npm
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt install -y nodejs

   # Install Nginx, Git, and Certbot for SSL
   sudo apt install -y nginx git certbot python3-certbot-nginx

   # Verify installations
   node -v
   npm -v
   nginx -v
   ```

## 4. Set Up Your Domain

1. **Access Your Domain Registrar** (GoDaddy, Namecheap, etc.)

2. **Configure DNS Records**
   - Add an A record:
     - Type: A
     - Host: @ (root domain)
     - Value: [Your VM's static IP address]
     - TTL: 3600 (or default)
   
   - Add A record for www subdomain:
     - Type: A
     - Host: www
     - Value: [Your VM's static IP address]
     - TTL: 3600 (or default)

   - If you want subdomains for each restaurant, add A records for each:
     - Type: A
     - Host: awesome-burgers
     - Value: [Your VM's static IP address]
     - TTL: 3600 (or default)
     
     Repeat for: pizza-palace, peakskitchen, sushi-heaven

3. **Wait for DNS Propagation** (can take a few hours)
   - You can check propagation status at https://dnschecker.org/

## 5. Prepare Your Application for Deployment

1. **Create a Deployment Directory on Your Local Machine**
   ```bash
   # On your local machine, create a deployment-ready copy
   mkdir -p d:\slot\o9\deployment
   cp -r d:\slot\o9\index.html d:\slot\o9\app.js d:\slot\o9\styles.css d:\slot\o9\deployment\
   ```

2. **Create Server File for Serving Your App**
   ```javascript
   // Create d:\slot\o9\deployment\server.js
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
     console.log(`Server running on port ${PORT}`);
   });
   ```

3. **Create package.json for Node.js Dependencies**
   ```javascript
   // Create d:\slot\o9\deployment\package.json
   {
     "name": "restaurant-slot-machine",
     "version": "1.0.0",
     "description": "Restaurant-themed slot machine game with rewards system",
     "main": "server.js",
     "scripts": {
       "start": "node server.js"
     },
     "dependencies": {
       "express": "^4.17.1",
       "dotenv": "^10.0.0"
     },
     "engines": {
       "node": ">=14.0.0"
     }
   }
   ```

4. **Create .env File for Environment Variables**
   ```
   // Create d:\slot\o9\deployment\.env
   NODE_ENV=production
   PORT=3000
   PRODUCTION_HOST=yourdomain.com
   ```

## 6. Deploy Your Application to the VM

1. **Create Application Directory on the VM**
   ```bash
   # On the VM terminal
   sudo mkdir -p /var/www/restaurant-slot-machine
   sudo chown -R $USER:$USER /var/www/restaurant-slot-machine
   ```

2. **Upload Files to Your VM**
   - Option 1: Using SCP (from your local command line):
     ```bash
     # Run this on your local machine, not in the VM
     # Replace USERNAME and VM_IP with your actual values
     scp -r d:/slot/o9/deployment/* USERNAME@VM_IP:/var/www/restaurant-slot-machine/
     ```
     
   - Option 2: Using SFTP client like FileZilla:
     - Host: Your VM's IP address
     - Username: Your VM username
     - Port: 22
     - Connect and upload all files from d:\slot\o9\deployment\ to /var/www/restaurant-slot-machine/

3. **Install Dependencies and Start the Application**
   ```bash
   # On the VM terminal
   cd /var/www/restaurant-slot-machine
   npm install
   
   # Install PM2 for process management
   sudo npm install -g pm2
   
   # Start the application with PM2
   pm2 start server.js --name restaurant-slot-machine
   
   # Make PM2 restart on server reboot
   pm2 save
   pm2 startup
   # Copy and run the command PM2 gives you
   ```

## 7. Configure Nginx as a Reverse Proxy

1. **Create Nginx Configuration**
   ```bash
   # On the VM terminal
   sudo nano /etc/nginx/sites-available/restaurant-slot-machine
   ```

2. **Add Configuration Content**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable the Configuration**
   ```bash
   sudo ln -s /etc/nginx/sites-available/restaurant-slot-machine /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## 8. Set Up SSL with Let's Encrypt

1. **Install SSL Certificate**
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   # Follow the prompts
   ```

2. **If You're Using Subdomains, Add Them Too**
   ```bash
   sudo certbot --nginx -d awesome-burgers.yourdomain.com -d pizza-palace.yourdomain.com -d peakskitchen.yourdomain.com -d sushi-heaven.yourdomain.com
   ```

3. **Test Auto-renewal**
   ```bash
   sudo certbot renew --dry-run
   ```

## 9. Configure Subdomain Routing (Optional)

If you're using subdomains for different restaurants, create separate Nginx configs:

1. **For Each Restaurant Subdomain**
   ```bash
   # Replace yourdomain.com with your actual domain
   for restaurant in awesome-burgers pizza-palace peakskitchen sushi-heaven; do
     sudo tee /etc/nginx/sites-available/$restaurant.yourdomain.com > /dev/null << EOF
   server {
       listen 80;
       server_name $restaurant.yourdomain.com;
   
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade \$http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host \$host;
           proxy_set_header X-Restaurant $restaurant;
           proxy_cache_bypass \$http_upgrade;
       }
   }
   EOF
     
     # Enable the configuration
     sudo ln -s /etc/nginx/sites-available/$restaurant.yourdomain.com /etc/nginx/sites-enabled/
   done
   
   # Test and reload Nginx
   sudo nginx -t && sudo systemctl reload nginx
   ```

2. **Secure All Subdomains with SSL**
   ```bash
   sudo certbot --nginx
   # Follow the prompts and select all domains
   ```

## 10. Secure and Optimize Your Server

1. **Set Up a Firewall**
   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```

2. **Optimize Nginx Configuration**
   ```bash
   sudo nano /etc/nginx/nginx.conf
   ```
   
   Add inside the http block:
   ```
   # Optimize file serving
   sendfile on;
   tcp_nopush on;
   tcp_nodelay on;
   
   # Increase timeouts for slow clients
   keepalive_timeout 65;
   client_max_body_size 5M;
   
   # Enable compression
   gzip on;
   gzip_comp_level 5;
   gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
   ```
   
   Save and restart Nginx:
   ```bash
   sudo nginx -t && sudo systemctl restart nginx
   ```

3. **Set Up Automatic Security Updates**
   ```bash
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure unattended-upgrades
   ```

## 11. Monitor Your Application

1. **Set Up Basic Monitoring with PM2**
   ```bash
   pm2 monit
   ```

2. **Check Nginx Access and Error Logs**
   ```bash
   sudo tail -f /var/log/nginx/access.log
   sudo tail -f /var/log/nginx/error.log
   ```

3. **View Application Logs**
   ```bash
   pm2 logs restaurant-slot-machine
   ```

## 12. Test Your Deployment

1. **Visit Your Domain**
   - Open a web browser and navigate to https://yourdomain.com
   - Verify that your application loads correctly
   - Test all features

2. **Test Subdomains** (if configured)
   - Visit https://awesome-burgers.yourdomain.com
   - Verify that the correct restaurant information is displayed

## 13. Set Up Regular Backups

1. **Create a Backup Script**
   ```bash
   sudo nano /usr/local/bin/backup-app.sh
   ```

2. **Add Backup Commands**
   ```bash
   #!/bin/bash
   
   # Set variables
   BACKUP_DIR="/var/backups/restaurant-slot-machine"
   TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
   APP_DIR="/var/www/restaurant-slot-machine"
   
   # Create backup directory if it doesn't exist
   mkdir -p $BACKUP_DIR
   
   # Create backup
   tar -czf $BACKUP_DIR/backup-$TIMESTAMP.tar.gz $APP_DIR
   
   # Keep only the 5 most recent backups
   ls -t $BACKUP_DIR/backup-*.tar.gz | tail -n +6 | xargs -r rm
   
   echo "Backup completed: $BACKUP_DIR/backup-$TIMESTAMP.tar.gz"
   ```

3. **Make the Script Executable**
   ```bash
   sudo chmod +x /usr/local/bin/backup-app.sh
   ```

4. **Schedule Regular Backups**
   ```bash
   sudo crontab -e
   ```
   
   Add this line to run backup daily at 2 AM:
   ```
   0 2 * * * /usr/local/bin/backup-app.sh
   ```

## 14. Additional Steps for Production Readiness

1. **Set Up Monitoring Service** (Optional)
   - Consider using Uptime Robot (free) or Pingdom (paid)
   - Create an account and set up monitoring for your domain

2. **Configure a CDN** (Optional)
   - Consider setting up Cloudflare for better performance
   - Sign up, add your domain, and follow their setup instructions

3. **Set Up Error Tracking** (Optional)
   - Consider integrating Sentry or LogRocket for error tracking

Your Restaurant Slot Machine application should now be successfully deployed and accessible at your domain via HTTPS!
