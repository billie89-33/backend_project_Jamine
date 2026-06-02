import rateLimit from 'express-rate-limit';

/**
 * Global Rate Limiter
 * ป้องกันการยิง API ทั่วไป (Scraping/DoS)
 */
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Auth Rate Limiter
 * ป้องกัน Brute Force สำหรับ Login และ Register
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // Limit each IP to 15 requests per window (ตามที่คุณแจ้ง "user 15")
    message: {
        success: false,
        message: 'Too many login attempts, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Order & Payment Rate Limiter
 * ป้องกันการ Spam การสร้างออเดอร์และการชำระเงิน
 */
export const orderLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 requests per hour (ตามที่คุณแจ้ง "Order & Payment 20")
    message: {
        success: false,
        message: 'Order limit exceeded, please try again after an hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
