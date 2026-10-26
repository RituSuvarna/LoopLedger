'use strict';

const express = require('express');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const devicesRouter = require('./src/routes/devices');
const analyticsRouter = require('./src/routes/analytics');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');

app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: null
    }
  }
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    application: 'LoopLedger',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/devices', devicesRouter);
app.use('/api/analytics', analyticsRouter);

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found.'
  });
});

app.use(express.static(PUBLIC_DIR));

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.get('*path', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: 'API endpoint not found.'
    });
  }

  const notFoundPage = path.join(PUBLIC_DIR, '404.html');

  if (fs.existsSync(notFoundPage)) {
    return res.status(404).sendFile(notFoundPage);
  }

  res.status(404).send('Page not found.');
});

app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`LoopLedger running on http://${HOST}:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;