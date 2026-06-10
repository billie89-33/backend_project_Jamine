import Order from '../../../models/order.model.js';
import { ORDER_STATUS } from '../../../constants/index.js';

/**
 * @desc    Get orders filtered for shipping/logistics management
 * @route   GET /api/v1/admin/shipping/orders
 * @access  Private (Admin only)
 */
export const getShippingOrders = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 10, search } = req.query;
        
        // Define which statuses are relevant for shipping management
        const shippingStatuses = [
            ORDER_STATUS.PAID,
            ORDER_STATUS.PROCESSING,
            ORDER_STATUS.SHIPPED,
            ORDER_STATUS.DELIVERED
        ];

        const queryObj = {
            status: { $in: status ? [status] : shippingStatuses }
        };

        // Search logic: by orderNumber or customer name (requires lookup if searching by name)
        if (search) {
            queryObj.$or = [
                { orderNumber: { $regex: search, $options: 'i' } }
            ];
            // Note: Searching by customer name in a single query with find() 
            // usually requires aggregation or storing a searchable name on the order.
            // For now, we search by orderNumber. 
        }

        const skip = (Number(page) - 1) * Number(limit);

        const orders = await Order.find(queryObj)
            .populate('userId', 'username email phone')
            .sort('-createdAt')
            .skip(skip)
            .limit(Number(limit))
            .lean();

        const total = await Order.countDocuments(queryObj);

        // Quick Stats for the header
        const stats = await Order.aggregate([
            { $match: { status: { $in: shippingStatuses } } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const statsMap = {
            pendingShipment: 0,
            inTransit: 0,
            deliveredToday: 0
        };

        // Calculate stats from the aggregation
        const now = new Date();
        const startOfToday = new Date(now.setHours(0, 0, 0, 0));

        const deliveredTodayCount = await Order.countDocuments({
            status: ORDER_STATUS.DELIVERED,
            updatedAt: { $gte: startOfToday }
        });

        stats.forEach(s => {
            if (s._id === ORDER_STATUS.PAID || s._id === ORDER_STATUS.PROCESSING) {
                statsMap.pendingShipment += s.count;
            } else if (s._id === ORDER_STATUS.SHIPPED) {
                statsMap.inTransit = s.count;
            }
        });
        statsMap.deliveredToday = deliveredTodayCount;

        res.status(200).json({
            success: true,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / limit),
            stats: statsMap,
            data: orders
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get summarized shipping statistics
 * @route   GET /api/v1/admin/shipping/stats
 * @access  Private (Admin only)
 */
export const getShippingStats = async (req, res, next) => {
    try {
        const now = new Date();
        const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const [toShip, toProcess, inTransit, completed] = await Promise.all([
            Order.countDocuments({ status: ORDER_STATUS.PAID, trackingNumber: null }),
            Order.countDocuments({ status: ORDER_STATUS.PROCESSING }),
            Order.countDocuments({ status: ORDER_STATUS.SHIPPED }),
            Order.countDocuments({ status: ORDER_STATUS.DELIVERED, updatedAt: { $gte: past24h } })
        ]);

        res.status(200).json({
            success: true,
            data: {
                toShip,
                toProcess,
                inTransit,
                completed
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Quickly update tracking number and status
 * @route   PATCH /api/v1/admin/shipping/:id/tracking
 * @access  Private (Admin only)
 */
export const updateShippingTracking = async (req, res, next) => {
    try {
        const { trackingNumber, status } = req.body;

        if (!trackingNumber || trackingNumber.trim() === '') {
            const error = new Error('Tracking number is required');
            error.status = 400;
            throw error;
        }

        const targetStatus = status || ORDER_STATUS.SHIPPED;
        const allowedTargetStatuses = [ORDER_STATUS.PROCESSING, ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED];

        if (!allowedTargetStatuses.includes(targetStatus)) {
            const error = new Error('Invalid status for shipping update. Allowed: Processing, Shipped, Delivered');
            error.status = 400;
            throw error;
        }

        // Logic check: Only Paid or Processing can move to Shipped
        // We'll fetch the order first to perform strict validation as per spec
        const order = await Order.findById(req.params.id);
        if (!order) {
            const error = new Error('Order not found');
            error.status = 404;
            throw error;
        }

        if (targetStatus === ORDER_STATUS.SHIPPED) {
            if (order.status !== ORDER_STATUS.PAID && order.status !== ORDER_STATUS.PROCESSING) {
                const error = new Error('Only Paid or Processing orders can be moved to Shipped');
                error.status = 400;
                throw error;
            }
        }

        order.trackingNumber = trackingNumber.trim();
        order.status = targetStatus;
        
        if (targetStatus === ORDER_STATUS.SHIPPED && !order.shippedAt) {
            order.shippedAt = new Date();
        }

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Tracking information updated successfully',
            data: order
        });
    } catch (error) {
        next(error);
    }
};
