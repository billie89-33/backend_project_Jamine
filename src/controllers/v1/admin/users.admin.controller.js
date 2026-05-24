import User from '../../../models/user.model.js';

// Helper function to format user response
const formatUserResponse = (user) => {
    const userObj = user.toObject();
    delete userObj.password;
    return userObj;
};

// @desc    Get all users (Admin only)
// @route   GET /api/v1/admin/users
// @access  Private (Admin)
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

// @desc    Delete user (Admin only)
// @route   DELETE /api/v1/admin/users/:id
// @access  Private (Admin)
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
