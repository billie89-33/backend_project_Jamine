import User from '../../models/user.model.js';
import generateToken from '../../utils/generateToken.js';

// Helper function to format user response
const formatUserResponse = (user) => {
    const userObj = user.toObject();
    delete userObj.password; // Double check, although toObject transform should handle it
    return userObj;
};

// @desc    Register a user to MongoDB (Sign Up)
// @route   POST /api/v1/users/register
// @access  Public
export const registerUser = async (req, res, next) => {
    try {
        const { username, email, password, confirmPassword, role } = req.body;

        if (!username || !email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: username, email, password, confirmPassword'
            });
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address ending with .com'
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

        const userExists = await User.findOne({ 
            $or: [
                { email: email.toLowerCase() },
                { username: username }
            ]
        });

        if (userExists) {
            const field = userExists.email === email.toLowerCase() ? 'Email' : 'Username';
            return res.status(400).json({
                success: false,
                message: `${field} already exists`
            });
        }

        const user = await User.create({
            username,
            email: email.toLowerCase(),
            password,
            role: role || 'user'
        });

        if (user) {
            generateToken(res, user._id);

            res.status(201).json({
                success: true,
                message: 'User registered and logged in successfully',
                data: formatUserResponse(user)
            });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/v1/users/login
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

        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        generateToken(res, user._id);

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
// @route   POST /api/v1/users/logout
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
// @route   GET /api/v1/users/me
// @access  Private
export const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

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

// @desc    Get all users (v1 - MongoDB)
// @route   GET /api/v1/users
// @access  Public
export const getUsers = async (req, res, next) => {
    try {
        const users = await User.find();
        
        const formattedUsers = users.map(user => formatUserResponse(user));

        res.status(200).json({
            success: true,
            count: users.length,
            data: formattedUsers
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Public
export const getUser = async (req, res, next) => {
    try {
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid User ID format'
            });
        }

        const user = await User.findById(req.params.id);

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

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Public
export const updateUser = async (req, res, next) => {
    try {
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid User ID format'
            });
        }

        let user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const { username, email, password, role } = req.body;

        if (username) user.username = username;
        if (email) {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide a valid email address ending with .com'
                });
            }
            user.email = email.toLowerCase();
        }
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters'
                });
            }
            user.password = password;
        }
        if (role) user.role = role;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: formatUserResponse(user)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add new address to user profile
// @route   POST /api/v1/users/addresses
// @access  Private
export const addAddress = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const newAddress = req.body;

        // ถ้าตั้งเป็น default ให้เอา default อันเก่าออกก่อน
        if (newAddress.isDefault) {
            user.addresses.forEach(addr => addr.isDefault = false);
        }

        user.addresses.push(newAddress);
        await user.save();

        res.status(200).json({
            success: true,
            message: 'เพิ่มที่อยู่ใหม่สำเร็จ',
            data: user.addresses
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete an address from user profile
// @route   DELETE /api/v1/users/addresses/:addressId
// @access  Private
export const deleteAddress = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        user.addresses = user.addresses.filter(
            addr => addr._id.toString() !== req.params.addressId
        );

        await user.save();

        res.status(200).json({
            success: true,
            message: 'ลบที่อยู่สำเร็จ',
            data: user.addresses
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Public
export const deleteUser = async (req, res, next) => {
    try {
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid User ID format'
            });
        }

        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
