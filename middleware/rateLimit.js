import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 3, // Limit each IP to 3 requests per windowMs
    message: { error: "Too many login attempts, please try again after 10 minutes" },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export const chatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 15, // Limit each IP to 10 requests per minute
    message: { error: "Too many requests, please slow down." },
    standardHeaders: true,
    legacyHeaders: false,
});