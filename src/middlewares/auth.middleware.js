import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

/**
 * @desc    Middleware to protect routes and verify JWT from HttpOnly Cookie
 */
export const protect = async (req, res, next) => {
    // ป้องกันกรณี req.cookies เป็น undefined หรือไม่มีค่า
    const token = req.cookies ? req.cookies.accessToken : null;

    if (!token) {
        const error = new Error('Not authorized, no token');
        error.status = 401; // ต้องแนบ status ไปให้ Centralized Error Handler
        return next(error);
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // ดึงข้อมูล User จาก ID (ไม่เอารหัสผ่าน และใช้ .lean() เพื่อประหยัด RAM)
        req.user = await User.findById(decoded.userId).select('-password').lean();

        // ⚠️ สำคัญมาก: เช็กว่าผู้ใช้ยังมีตัวตนอยู่ในระบบไหม เพื่อป้องกันแอปพลิเคชันล่มจาก req.user = null
        if (!req.user) {
            const error = new Error('Not authorized, user not found');
            error.status = 401;
            return next(error);
        }

        next();
    } catch (error) {
        const message = error.name === 'TokenExpiredError' 
            ? 'Token expired, please login again' 
            : 'Not authorized, token failed';
            
        const err = new Error(message);
        err.status = 401;
        next(err);
    }
};

/**
 * @desc    Middleware to check for Admin role
 */
export const admin = (req, res, next) => {
    // ปลอดภัยเพราะเช็ก req.user ก่อนเข้าถึง req.user.role ป้องกัน Cannot read properties of null
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        const err = new Error('Not authorized as an admin');
        err.status = 403; // 403 Forbidden เหมาะสมสำหรับสิทธิ์ไม่ถึง
        next(err);
    }
};
