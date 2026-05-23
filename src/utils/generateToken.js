import jwt from 'jsonwebtoken';

/**
 * @desc    Generate JWT Token and set it as an HttpOnly cookie
 * @param   {Object} res - Express response object
 * @param   {String} userId - User ID to be stored in the payload
 */
const generateToken = (res, userId) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });

    const isProd = process.env.NODE_ENV === 'production';

    // ตั้งค่า Cookie ให้ยืดหยุ่นสำหรับ Render และ Production อื่นๆ
    res.cookie('accessToken', token, {
        httpOnly: true, // ป้องกัน XSS
        secure: isProd, // ใช้ HTTPS เสมอใน Production (Render ใช้ HTTPS)
        sameSite: isProd ? 'none' : 'lax', // 'none' จำเป็นมากสำหรับการยิงข้าม Domain (Render -> Client อื่น)
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 วัน
    });

    return token;
};

export default generateToken;
