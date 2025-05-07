/**
 * Simple Server for Peaks Kitchen application
 * 
 * This script handles routing and API endpoint proxying
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Define the port
const PORT = process.env.PORT || 8080;

// MIME types for different file extensions
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Create the server
const server = http.createServer((req, res) => {
  // Parse the URL
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;
  
  // Normalize the path (remove trailing slashes)
  pathname = pathname.replace(/\/$/, '');
  
  console.log(`Received request for: ${pathname}`);
  
  // Handle /admin route specifically
  if (pathname === '/admin') {
    pathname = '/admin/admin.html';
  }
  
  // Get file extension
  const ext = path.parse(pathname).ext || '.html';
  
  // Check if this is an API proxy request
  if (pathname.startsWith('/api-proxy')) {
    // Forward to actual API (this would be replaced with real API endpoint)
    // For now we'll just send a mock response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'API endpoint reached' }));
    return;
  }
  
  // Map root route to index.html
  if (pathname === '' || pathname === '/') {
    pathname = '/index.html';
  }
  
  // For paths without extension requesting HTML content, append .html
  if (!ext && req.headers.accept && req.headers.accept.includes('text/html')) {
    pathname = `${pathname}.html`;
  }
  
  // Create file path
  const filePath = path.join(__dirname, pathname);
  
  // Read the file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // If the file doesn't exist, try serving index.html
      if (err.code === 'ENOENT') {
        console.log(`File ${filePath} not found, trying index.html`);
        
        // Check if request is for an admin route
        if (pathname.startsWith('/admin/')) {
          fs.readFile(path.join(__dirname, '/admin/admin.html'), (err, data) => {
            if (err) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Not Found');
              return;
            }
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
          });
          return;
        }
        
        // Try to serve index.html for client-side routing
        fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
          }
          
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(data);
        });
        return;
      }
      
      // For other errors, return 500
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }
    
    // Determine content type based on file extension
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    // Set headers and send response
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Admin dashboard available at http://localhost:${PORT}/admin`);
});
