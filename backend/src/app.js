const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const { generalLimiter } = require('./middleware/rateLimitMiddleware');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const logger = require('./utils/logger');

const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// ── Security headers (Helmet sets X-Frame-Options, CSP, etc.) ─────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
      : 'http://localhost:5173',
    credentials: true,
  })
);

// ── HTTP request logging ──────────────────────────────────────────────────────
// Use morgan for structured HTTP logs; custom token for clean output
morgan.token('body-size', (req) => {
  const len = req.headers['content-length'];
  return len ? `${len}b` : '-';
});

if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan(':method :url :status :res[content-length] - :response-time ms', {
      stream: {
        write: (message) => logger.http('morgan', message.trim(), '', ''),
      },
    })
  );
}

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ── Global rate limiting ──────────────────────────────────────────────────────
app.use('/api', generalLimiter);

// ── Health check (no auth needed) ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/admin', adminRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use(notFound);

// ── Centralized error handler ─────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
