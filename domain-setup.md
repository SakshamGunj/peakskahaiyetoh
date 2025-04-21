# Domain Configuration for Google Cloud VM

## Domain Provider Setup

1. **Access your domain registrar** (GoDaddy, Namecheap, Google Domains, etc.)

2. **Add DNS records**:
   - Add an A record pointing to your Google Cloud VM's external IP address:
     ```
     Type: A
     Name: @ (represents root domain)
     Value: YOUR_VM_EXTERNAL_IP (e.g., 35.123.456.789)
     TTL: 3600 (or use default)
     ```
   
   - If you want 'www' to work as well:
     ```
     Type: A
     Name: www
     Value: YOUR_VM_EXTERNAL_IP (e.g., 35.123.456.789)
     TTL: 3600 (or use default)
     ```
   
   - For restaurant subdomains (optional):
     ```
     Type: A
     Name: awesome-burgers
     Value: YOUR_VM_EXTERNAL_IP
     TTL: 3600
     
     Type: A
     Name: pizza-palace
     Value: YOUR_VM_EXTERNAL_IP
     TTL: 3600
     
     Type: A
     Name: peakskitchen
     Value: YOUR_VM_EXTERNAL_IP
     TTL: 3600
     
     Type: A
     Name: sushi-heaven
     Value: YOUR_VM_EXTERNAL_IP
     TTL: 3600
     ```

3. **Wait for DNS propagation** 
   - DNS changes can take up to 48 hours to fully propagate, though often it happens within a few hours

## Setting up Multiple Restaurants with Subdomains

If you want to use subdomains for each restaurant, you need to:

1. **Create separate Nginx configurations for each subdomain**:

   ```bash
   # Create Nginx config for each restaurant subdomain
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
           proxy_cache_bypass \$http_upgrade;
           
           # Add custom header to identify restaurant
           proxy_set_header X-Restaurant $restaurant;
       }
   }
   EOF
     
     # Enable the configuration
     sudo ln -s /etc/nginx/sites-available/$restaurant.yourdomain.com /etc/nginx/sites-enabled/
   done
   
   # Test and reload Nginx
   sudo nginx -t && sudo systemctl reload nginx
   ```

2. **Set up SSL certificates for all subdomains**:

   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com \
   -d awesome-burgers.yourdomain.com \
   -d pizza-palace.yourdomain.com \
   -d peakskitchen.yourdomain.com \
   -d sushi-heaven.yourdomain.com
   ```

3. **Modify your server.js to handle subdomain routing**:
   
   ```javascript
   // In your server.js, add this before route handling
   app.use((req, res, next) => {
     const hostname = req.hostname;
     
     // Check if this is a restaurant subdomain
     for (const [id, domain] of Object.entries(require('./config').restaurants.domains)) {
       if (hostname === domain) {
         // Set restaurant ID in request for use in app.js
         req.restaurantId = id;
         break;
       }
     }
     
     next();
   });
   ```
