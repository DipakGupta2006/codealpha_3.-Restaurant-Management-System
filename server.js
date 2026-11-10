const express = require('express');
const path = require('node:path');
const { initSchema } = require('./db/database');
const { seedDatabase } = require('./db/seed');

const apiRoutes = require('./routes/apiRoutes');
const viewRoutes = require('./routes/viewRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize and auto-seed database if needed
initSchema();
seedDatabase();

// Template Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static Assets
app.use(express.static(path.join(__dirname, 'public')));

// Request Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging helper in development
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.url.startsWith('/css') && !req.url.startsWith('/js') && !req.url.startsWith('/favicon')) {
      console.log(`[${req.method}] ${req.url} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Mount Routes
app.use('/api', apiRoutes);
app.use('/', viewRoutes);

// 404 Handler
app.use((req, res) => {
  if (req.accepts('html')) {
    res.status(404).render('pages/404', {
      pageTitle: 'Page Not Found',
      currentPath: ''
    });
  } else {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
  }
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('Server Unhandled Error:', err);
  if (req.accepts('json') && !req.accepts('html')) {
    res.status(500).json({ success: false, error: err.message });
  } else {
    res.status(500).send(`
      <div style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h2>Internal Server Error</h2>
        <p>${err.message}</p>
        <a href="/" style="color: #c97a3e; text-decoration: none; font-weight: bold;">Return to Home</a>
      </div>
    `);
  }
});

// Start Server with dynamic fallback if port is busy
if (require.main === module) {
  let targetPort = parseInt(process.env.PORT, 10) || 3000;

  function startListening(port) {
    const serverInstance = app.listen(port, () => {
      console.log(`
=============================================================
🍽️  RESTAURANT MANAGEMENT SYSTEM IS LIVE!
-------------------------------------------------------------
🌐 Customer Portal:       http://localhost:${port}/
📋 Full Menu:             http://localhost:${port}/menu
🪑 Table Reservation:     http://localhost:${port}/reserve
🛒 Online Ordering:       http://localhost:${port}/order
🔍 Track Order:           http://localhost:${port}/track
📊 Admin & Reports Panel: http://localhost:${port}/admin
⚡ REST API Endpoint:     http://localhost:${port}/api/menu
=============================================================
      `);
    });

    serverInstance.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`⚠️ Port ${port} is currently in use. Automatically trying port ${port + 1}...`);
        startListening(port + 1);
      } else {
        console.error('Server error:', err);
      }
    });
  }

  startListening(targetPort);
}

module.exports = app;
