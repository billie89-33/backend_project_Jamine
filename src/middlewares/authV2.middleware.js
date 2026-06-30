import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

/**
 * @desc    Middleware to protect routes and verify JWT from HttpOnly Cookie for V2 (PostgreSQL)
 */
export const protect = async (req, res, next) => {
    const token = req.cookies ? req.cookies.accessToken : null;

    if (!token) {
        const error = new Error('Not authorized, no token');
        error.status = 401;
        return next(error);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                status: true
            }
        });

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
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        const err = new Error('Not authorized as an admin');
        err.status = 403;
        next(err);
    }
};
