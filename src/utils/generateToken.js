import jwt from 'jsonwebtoken';

/**
 * @desc    Generate JWT Token and set it as an HttpOnly cookie
 * @param   {Object} res - Express response object
 * @param   {String} userId - User ID to be stored in the payload
 */
const generateToken = (res, userId) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '30d' // อายุการใช้งานของ Token (ปรับเปลี่ยนได้ตามต้องการ)
    });

    // ตั้งค่า Cookie
    res.cookie('accessToken', token, {
        httpOnly: true, // ป้องกันการเข้าถึงผ่าน Client-side JS (ป้องกัน XSS)
        secure: process.env.NODE_ENV !== 'development', // ใช้ HTTPS ใน production
        sameSite: 'strict', // ป้องกัน CSRF
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 วันในรูปแบบ milliseconds
    });

    return token;
};

export default generateToken;
