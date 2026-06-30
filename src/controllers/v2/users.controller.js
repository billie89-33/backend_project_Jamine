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
                role: role || USER_ROLES.USER,
                addresses: []
            }
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
            where: { id: req.user.id || req.user._id } // Handle if auth middleware gives _id or id
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
            where: { id: req.params.id }
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
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        let addresses = user.addresses ? (Array.isArray(user.addresses) ? user.addresses : []) : [];
        const newAddress = {
            _id: crypto.randomUUID(), // Mock _id so frontend doesn't break
            ...req.body
        };

        if (newAddress.isDefault) {
            addresses = addresses.map(addr => ({ ...addr, isDefault: false }));
        }

        addresses.push(newAddress);

        await prisma.user.update({
            where: { id: userId },
            data: { addresses }
        });

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
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        let addresses = user.addresses ? (Array.isArray(user.addresses) ? user.addresses : []) : [];
        const addressIndex = addresses.findIndex(addr => addr._id === req.params.addressId);
        
        if (addressIndex === -1) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        // If setting as default, remove default from others
        if (req.body.isDefault) {
            addresses = addresses.map(addr => ({ ...addr, isDefault: false }));
        }

        // Update fields
        addresses[addressIndex] = {
            ...addresses[addressIndex],
            ...req.body
        };

        await prisma.user.update({
            where: { id: userId },
            data: { addresses }
        });

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
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        let addresses = user.addresses ? (Array.isArray(user.addresses) ? user.addresses : []) : [];
        const addressExists = addresses.some(addr => addr._id === req.params.addressId);

        if (!addressExists) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        addresses = addresses.map(addr => ({
            ...addr,
            isDefault: addr._id === req.params.addressId
        }));

        await prisma.user.update({
            where: { id: userId },
            data: { addresses }
        });

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
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        let addresses = user.addresses ? (Array.isArray(user.addresses) ? user.addresses : []) : [];
        addresses = addresses.filter(addr => addr._id !== req.params.addressId);

        await prisma.user.update({
            where: { id: userId },
            data: { addresses }
        });

        res.status(200).json({
            success: true,
            message: 'ลบที่อยู่สำเร็จ',
            data: addresses
        });
    } catch (error) {
        next(error);
    }
};
