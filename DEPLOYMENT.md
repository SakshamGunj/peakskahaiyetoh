# Deployment Guide for Restaurant Slot Machine

This document provides instructions for deploying the Restaurant Slot Machine application to various environments.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Access to a web server or cloud hosting platform

## Local Development Deployment

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Visit http://localhost:3000 in your browser.

## Production Deployment Options

### Option 1: Traditional Web Server (e.g., Ubuntu with Nginx)

1. Set up an Ubuntu server
2. Install Node.js and npm
3. Clone your repository to /var/www/restaurant-slot-machine
4. Install dependencies:
   ```bash
   npm ci --production
   ```
5. Set up Nginx as a reverse proxy:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

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
6. Set up PM2 to manage the Node process:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "slot-machine"
   pm2 save
   pm2 startup
   ```

### Option 2: Docker Deployment

1. Build the Docker image:
   ```bash
   docker build -t restaurant-slot-machine .
   ```

2. Run the container:
   ```bash
   docker run -p 80:3000 -d --name slot-machine restaurant-slot-machine
   ```

### Option 3: Cloud Deployment (Heroku Example)

1. Create a Heroku account and install the Heroku CLI
2. Log in to Heroku:
   ```bash
   heroku login
   ```
3. Create a new Heroku app:
   ```bash
   heroku create your-app-name
   ```
4. Push code to Heroku:
   ```bash
   git push heroku main
   ```

### Option 4: Vercel Deployment

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. Deploy to Vercel:
   ```bash
   vercel
   ```

## Environmental Variables

Create a `.env` file based on the `.env.example` template and customize for your environment.

## SSL Configuration

For production use, always configure SSL:

1. For Nginx, use Certbot:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

2. For Heroku, SSL is provided automatically.

## Monitoring

Consider setting up monitoring:
- PM2 monitoring: `pm2 monitor`
- New Relic or Datadog integration

## Troubleshooting

- Check logs in the `logs` directory
- For Docker: `docker logs slot-machine`
- For PM2: `pm2 logs slot-machine`
