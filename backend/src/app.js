const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const analyzeRoutes = require('./routes/analyze.routes');
const healthRoutes = require('./routes/health.routes');
const testingRoutes = require('./routes/testing.routes');
const { apiLogger } = require('./utils/logger');

const app = express();

// Middleware
app.use(cors()); // Allow frontend to fetch API
app.use(express.json());

// Request logging
app.use(morgan('combined', { stream: { write: message => apiLogger.info(message.trim()) } }));

// Main API routes
app.use('/api', analyzeRoutes);
app.use('/api', healthRoutes);
app.use('/api/test', testingRoutes);

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    apiLogger.error(`Unhandled Exception: ${err.message}`);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
});

module.exports = app;
