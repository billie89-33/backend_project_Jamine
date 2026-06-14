import User from '../../../models/user.model.js';
import Order from '../../../models/order.model.js';
import { USER_ROLES, ORDER_STATUS } from '../../../constants/index.js';

// @desc    Get all customers (Admin only)
// @route   GET /api/v1/admin/users
// @access  Private (Admin)
// @query   ?page=1&limit=10&keyword=somchai&status=active
export const getUsers = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
        const startIndex = (page - 1) * limit;

        // 1. Build Query
        let query = { role: USER_ROLES.USER }; // Only customers, not admins

        // Keyword Search (name, username, or email)
        if (req.query.keyword) {
            const keywordRegex = new RegExp(req.query.keyword, 'i');
            query.$or = [
                { name: keywordRegex },
                { username: keywordRegex },
                { email: keywordRegex }
            ];
        }

        // Status Filtering
        if (req.query.status && req.query.status !== 'all') {
            query.status = req.query.status;
        }

        // 2. Fetch Data
        const totalItems = await User.countDocuments(query);
        const customers = await User.find(query)
            .select('name username email avatar status createdAt')
            .sort({ createdAt: -1 })
            .skip(startIndex)
            .limit(limit)
            .lean();

        // 3. Response
        res.status(200).json({
            success: true,
            data: {
                customers,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalItems / limit),
                    totalItems,
                    hasNextPage: startIndex + limit < totalItems
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get customer summary (Profile + Aggregated Order Total)
 * @route   GET /api/v1/admin/users/:id/summary
 */
export const getCustomerSummary = async (req, res, next) => {
    try {
        const userId = req.params.id;

        // 1. Fetch Profile
        const profile = await User.findById(userId).select('-password -role').lean();
        if (!profile) {
            const error = new Error('Customer not found');
            error.status = 404;
            return next(error);
        }

        // 2. Calculate Order Stats (Aggregate)
        // Only count orders that are NOT cancelled
        const orderStats = await Order.aggregate([
            {
                $match: {
                    userId: profile._id,
                    status: { $ne: ORDER_STATUS.CANCELLED }
                }
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalSpent: { $sum: '$total' } // Field name in order.model.js is 'total'
                }
            }
        ]);

        const summary = orderStats.length > 0 ? orderStats[0] : { totalOrders: 0, totalSpent: 0 };

        res.status(200).json({
            success: true,
            data: {
                profile,
                orderSummary: {
                    totalOrders: summary.totalOrders,
                    totalSpent: summary.totalSpent
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update customer status (Active / Banned) - Surgical Update
 * @route   PATCH /api/v1/admin/users/:id/status
 */
export const updateCustomerStatus = async (req, res, next) => {
    try {
        const { status } = req.body;

        if (!['active', 'banned'].includes(status)) {
            const error = new Error('Invalid status value');
            error.status = 400;
            return next(error);
        }

        // Surgical Update using $set
        const customer = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { status: status } },
            { new: true, runValidators: true, context: 'query' }
        ).select('name username email status');

        if (!customer) {
            const error = new Error('Customer not found');
            error.status = 404;
            return next(error);
        }

        res.status(200).json({
            success: true,
            data: customer
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
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            const error = new Error('User not found');
            error.status = 404;
            return next(error);
        }

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
