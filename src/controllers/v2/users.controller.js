import User from '../../models/user.model.js';

// @desc    Get all users from MongoDB
// @route   GET /api/v2/users
// @access  Private (Required Auth)
export const getUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Register a user to MongoDB
// @route   POST /api/v2/users
// @access  Public
export const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        const user = await User.create({
            username,
            email,
            password
        });

        res.status(201).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// ... login, logout, getMe จะถูกเพิ่มภายหลังตาม Agent.md
