import prisma from '../../config/prisma.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import generateToken from '../../utils/generateToken.js';
import { USER_ROLES } from '../../constants/index.js';

// Helper function to format user response (remove password, map id to _id)
const formatUserResponse = (user) => {
    const { password, id, ...userObj } = user;
    return { ...userObj, _id: id };
};

// @desc    Register a user to PostgreSQL (Sign Up)
// @route   POST /api/v2/users/register
// @access  Public
export const registerUser = async (req, res, next) => {
    try {
        const username = req.body.username ? req.body.username.trim() : '';
        const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
        const { password, confirmPassword, role } = req.body;

        if (!username || !email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: username, email, password, confirmPassword'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        // Check existing user via Prisma
        const userExists = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email },
                    { username: username }
                ]
            }
        });

        if (userExists) {
            const field = userExists.email === email ? 'Email' : 'Username';
            return res.status(400).json({
                success: false,
                message: `${field} already exists`
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                role: role || USER_ROLES.USER
            },
            include: { addresses: true }
        });

        generateToken(res, user.id);

        res.status(201).json({
            success: true,
            message: 'User registered and logged in successfully',
            data: formatUserResponse(user)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/v2/users/login
// @access  Public
export const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        generateToken(res, user.id);

        res.status(200).json({
            success: true,
            message: 'Logged in successfully',
            data: formatUserResponse(user)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Logout user / Clear Cookie
// @route   POST /api/v2/users/logout
// @access  Public
export const logoutUser = (req, res) => {
    const isProd = process.env.NODE_ENV === 'production';
    
    res.cookie('accessToken', '', {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
        expires: new Date(0)
    });

    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
};

// @desc    Get current logged in user profile
// @route   GET /api/v2/users/me
// @access  Private
export const getMe = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id || req.user._id }, // Handle if auth middleware gives _id or id
            include: { addresses: true }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: formatUserResponse(user)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single user
// @route   GET /api/v2/users/:id
// @access  Public
export const getUser = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            include: { addresses: true }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: formatUserResponse(user)
        });
    } catch (error) {
        // In Prisma, querying by invalid UUID format might throw, handle it
        if (error.code === 'P2023') {
            return res.status(400).json({ success: false, message: 'Invalid User ID format' });
        }
        next(error);
    }
};

// @desc    Update user
// @route   PUT /api/v2/users/:id
// @access  Public
export const updateUser = async (req, res, next) => {
    try {
        const { username, email, password, role } = req.body;
        const updateData = {};

        if (username) updateData.username = username.trim();
        if (email) {
            const sanitizedEmail = email.trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(sanitizedEmail)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide a valid email address'
                });
            }
            updateData.email = sanitizedEmail;
        }
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters'
                });
            }
            const salt = await bcrypt.genSalt(12);
            updateData.password = await bcrypt.hash(password, salt);
        }
        if (role) updateData.role = role;

        const updatedUser = await prisma.user.update({
            where: { id: req.params.id },
            data: updateData
        });

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: formatUserResponse(updatedUser)
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (error.code === 'P2023') {
            return res.status(400).json({ success: false, message: 'Invalid User ID format' });
        }
        next(error);
    }
};

// @desc    Add new address to user profile
// @route   POST /api/v2/users/addresses
// @access  Private
export const addAddress = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;

        if (req.body.isDefault) {
            await prisma.userAddress.updateMany({
                where: { userId },
                data: { isDefault: false }
            });
        }

        await prisma.userAddress.create({
            data: {
                userId,
                ...req.body
            }
        });

        const addresses = await prisma.userAddress.findMany({ where: { userId } });

        res.status(200).json({
            success: true,
            message: 'เพิ่มที่อยู่ใหม่สำเร็จ',
            data: addresses
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update an address in user profile
// @route   PUT /api/v2/users/addresses/:addressId
// @access  Private
export const updateAddress = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        const addressId = req.params.addressId;

        const address = await prisma.userAddress.findUnique({ where: { id: addressId } });
        if (!address || address.userId !== userId) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        if (req.body.isDefault) {
            await prisma.userAddress.updateMany({
                where: { userId, id: { not: addressId } },
                data: { isDefault: false }
            });
        }

        await prisma.userAddress.update({
            where: { id: addressId },
            data: req.body
        });

        const addresses = await prisma.userAddress.findMany({ where: { userId } });

        res.status(200).json({
            success: true,
            message: 'อัปเดตที่อยู่สำเร็จ',
            data: addresses
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Set an address as default
// @route   PATCH /api/v2/users/addresses/:addressId/default
// @access  Private
export const setDefaultAddress = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        const addressId = req.params.addressId;

        const address = await prisma.userAddress.findUnique({ where: { id: addressId } });
        if (!address || address.userId !== userId) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        await prisma.$transaction([
            prisma.userAddress.updateMany({
                where: { userId },
                data: { isDefault: false }
            }),
            prisma.userAddress.update({
                where: { id: addressId },
                data: { isDefault: true }
            })
        ]);

        const addresses = await prisma.userAddress.findMany({ where: { userId } });

        res.status(200).json({
            success: true,
            message: 'ตั้งเป็นที่อยู่หลักเรียบร้อยแล้ว',
            data: addresses
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete an address from user profile
// @route   DELETE /api/v2/users/addresses/:addressId
// @access  Private
export const deleteAddress = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        const addressId = req.params.addressId;

        const address = await prisma.userAddress.findUnique({ where: { id: addressId } });
        if (!address || address.userId !== userId) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        await prisma.userAddress.delete({ where: { id: addressId } });

        const addresses = await prisma.userAddress.findMany({ where: { userId } });

        res.status(200).json({
            success: true,
            message: 'ลบที่อยู่สำเร็จ',
            data: addresses
        });
    } catch (error) {
        next(error);
    }
};
