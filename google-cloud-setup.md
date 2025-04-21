# Google Cloud VM Setup Instructions

## Creating a VM Instance

1. **Sign in to Google Cloud Console**
   - Go to https://console.cloud.google.com/
   - Create a new project or select an existing one

2. **Create a VM Instance**
   - Go to Compute Engine > VM Instances
   - Click "Create Instance"
   - Configure your instance:
     - Name: restaurant-slot-machine
     - Region/Zone: Choose one closest to your users
     - Machine type: e2-small (2 vCPU, 2 GB memory) should be sufficient
     - Boot disk: Ubuntu 20.04 LTS
     - Allow HTTP and HTTPS traffic
   - Click "Create"

3. **Connect to your VM**
   - Click the "SSH" button next to your instance in the VM instances list
   - Alternatively, use your preferred SSH client with the provided external IP address

## Basic Server Setup

1. **Update the system**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install required packages**
   ```bash
   sudo apt install -y nodejs npm nginx git certbot python3-certbot-nginx
   ```

3. **Install newer Node.js version**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

4. **Verify installations**
   ```bash
   node -v
   npm -v
   nginx -v
   ```
