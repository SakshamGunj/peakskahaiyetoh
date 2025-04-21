/**
 * Restaurant Slot Machine - Production Server
 * This server implements proper routing and optimization for the slot machine application
 */

const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const cors = require('cors');
const config = require('./config');

// Initialize Express app
const app = express();
const PORT = config.server.port;

// Ensure logs directory exists
if (!fs.existsSync(config.paths.logs)) {
  fs.mkdirSync(config.paths.logs, { recursive: true });
}

// Create a write stream for access logs
const accessLogStream = fs.createWriteStream(
  path.join(config.paths.logs, 'access.log'), 
  { flags: 'a' }
);

// CORS configuration
app.use(cors(config.cors));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
    },
  },
  frameguard: false
}));

// Performance middleware
app.use(compression());

// Logging middleware
app.use(morgan(config.server.isProduction ? 'combined' : 'dev', { 
  stream: config.server.isProduction ? accessLogStream : process.stdout
}));

// Parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files with cache control
app.use(express.static(config.paths.static, {
  maxAge: config.cache.staticMaxAge,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', `max-age=${config.cache.htmlMaxAge}`);
    }
  }
}));

// Domain-specific routing
app.use((req, res, next) => {
  // Check for subdomain or domain-based routing
  const hostname = req.hostname;
  
  // Find if we're on a restaurant-specific domain
  for (const [id, domain] of Object.entries(config.restaurants.domains)) {
    if (hostname === domain) {
      // Rewrite the URL to include the restaurant ID
      req.url = `/${id}${req.url === '/' ? '' : req.url}`;
      break;
    }
  }
  
  next();
});

// Handle SPA routing - serve index.html for all routes
app.get('/*', (req, res) => {
  res.sendFile(path.join(config.paths.static, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Log error
  fs.appendFile(
    path.join(config.paths.logs, 'error.log'),
    `${new Date().toISOString()} - ${err.stack}\n`,
    (fsErr) => {
      if (fsErr) console.error('Failed to write to error log', fsErr);
    }
  );
  
  res.status(500).send(config.server.isProduction ? 'Something went wrong!' : err.stack);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running in ${config.server.nodeEnv} mode on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to view the application`);
});

// Handle graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
  console.log('Graceful shutdown initiated...');
  // Close server connections
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force shutdown after 10s if server hasn't closed
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}
