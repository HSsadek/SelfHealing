const rateLimit = require('express-rate-limit');

const apiRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // Max 10 requests per IP per minute
    message: {
        success: false,
        error: 'Too many analysis requests from this IP, please try again after a minute.'
    },
    standardHeaders: true, 
    legacyHeaders: false, 
});

module.exports = {
    apiRateLimiter
};
