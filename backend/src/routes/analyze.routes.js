const express = require('express');
const analyzeController = require('../controllers/analyze.controller');
const { apiRateLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

// Apply IP-based rate limiting to prevent client-side abuse at the edge
router.post('/analyze-url', apiRateLimiter, analyzeController.analyzeUrl);

module.exports = router;
