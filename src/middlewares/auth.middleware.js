import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

/**
 * @desc    Middleware to protect routes and verify JWT from HttpOnly Cookie
 */
export const protect = async (req, res, next) => {
    let token;

    // อ่าน token จาก cookie ชื่อ 'accessToken'
    token = req.cookies.accessToken;

    if (token) {
        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // ดึงข้อมูล User จาก ID ใน token และแนบไปกับ request (ยกเว้น password)
            req.user = await User.findById(decoded.userId);

            next();
        } catch (error) {
            res.status(401);
            const err = new Error('Not authorized, token failed');
            next(err);
        }
    } else {
        res.status(401);
        const err = new Error('Not authorized, no token');
        next(err);
    }
};

/**
 * @desc    Middleware to check for Admin role
 */
export const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403);
        const err = new Error('Not authorized as an admin');
        next(err);
    }
};
