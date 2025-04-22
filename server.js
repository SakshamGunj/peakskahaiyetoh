/**
 * Restaurant Slot Machine - Simple Express Server
 */

const express = require('express');
const path = require('path');
const config = require('./config');

// Initialize Express app
const app = express();
const PORT = config.server.port || 3000;

// Add request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Log request headers
  console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
  
  // Capture the original end method
  const originalEnd = res.end;
  
  // Override the end method to log response details
  res.end = function() {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    console.log('Response Headers:', JSON.stringify(res.getHeaders(), null, 2));
    
    // Call the original end method
    return originalEnd.apply(this, arguments);
  };
  
  next();
});

// Simple CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  
  // Explicitly remove any CSP headers that might be set elsewhere
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('Content-Security-Policy-Report-Only');
  
  // Set a permissive CSP header that allows everything
  res.header(
    "Content-Security-Policy", 
    "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"
  );
  
  next();
});

// Parse JSON requests
app.use(express.json());

// Log request body for POST/PUT requests
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Handle SPA routing - serve index.html for all routes
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to view the application`);
  console.log(`Visit http://localhost:${PORT}/api-test.html to run API tests`);
});
