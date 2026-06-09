import Order from '../../../models/order.model.js';
import Product from '../../../models/product.model.js';

// @desc    Get all orders
// @route   GET /api/v1/admin/orders
// @access  Private (Admin only)
export const getAllOrders = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const queryObj = {};

        if (status) queryObj.status = status;

        const skip = (page - 1) * limit;

        const orders = await Order.find(queryObj)
            .populate('userId', 'name email')
            .sort('-createdAt')
            .skip(skip)
            .limit(Number(limit))
            .lean();

        const total = await Order.countDocuments(queryObj);

        res.status(200).json({
            success: true,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / limit),
            data: orders
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update order status
// @route   PATCH /api/v1/admin/orders/:id/status
// @access  Private (Admin only)
export const updateOrderStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const allowedStatuses = ['Awaiting Payment', 'Paid', 'Cancelled', 'Processing', 'Shipped', 'Delivered'];

        if (!allowedStatuses.includes(status)) {
            const error = new Error('Invalid status');
            error.status = 400;
            throw error;
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            const error = new Error('Order not found');
            error.status = 404;
            throw error;
        }

        // ถ้าเปลี่ยนเป็น Cancelled ให้คืนสต็อก
        if (status === 'Cancelled' && order.status !== 'Cancelled') {
            const bulkRestockOps = order.items.map(item => ({
                updateOne: {
                    filter: { _id: item.productId },
                    update: { $inc: { stock: item.quantity } }
                }
            }));
            if (bulkRestockOps.length > 0) {
                await Product.bulkWrite(bulkRestockOps);
            }

            // ✅ ถ้าเดิมเป็น Paid แล้วถูกยกเลิก ต้องลดยอดขาย (soldCount) ลงด้วย
            if (order.status === 'Paid') {
                const bulkReduceSoldOps = order.items.map(item => ({
                    updateOne: {
                        filter: { _id: item.productId },
                        update: { $inc: { soldCount: -item.quantity } }
                    }
                }));
                if (bulkReduceSoldOps.length > 0) {
                    await Product.bulkWrite(bulkReduceSoldOps);
                }
            }
        }

        // ถ้าเปลี่ยนจากสถานะอื่นมาเป็น Paid ให้บวกยอดขาย (Best Seller)
        if (status === 'Paid' && order.status !== 'Paid') {
            const bulkSoldOps = order.items.map(item => ({
                updateOne: {
                    filter: { _id: item.productId },
                    update: { $inc: { soldCount: item.quantity } }
                }
            }));
            if (bulkSoldOps.length > 0) {
                await Product.bulkWrite(bulkSoldOps);
            }
        }

        order.status = status;
        await order.save();

        res.status(200).json({
            success: true,
            message: `Order status updated to ${status}`,
            data: order
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete order (Admin only)
// @route   DELETE /api/v1/admin/orders/:id
export const deleteOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            const error = new Error('Order not found');
            error.status = 404;
            throw error;
        }

        // คืนสต็อกถ้าออเดอร์ยังไม่ถูกยกเลิก
        if (order.status === 'Awaiting Payment') {
             const bulkRestockOps = order.items.map(item => ({
                updateOne: {
                    filter: { _id: item.productId },
                    update: { $inc: { stock: item.quantity } }
                }
            }));
            if (bulkRestockOps.length > 0) {
                await Product.bulkWrite(bulkRestockOps);
            }
        }

        // ✅ ถ้าลบออเดอร์ที่จ่ายเงินแล้ว ต้องลดยอดขาย (soldCount) ลงด้วย
        if (order.status === 'Paid') {
            const bulkReduceSoldOps = order.items.map(item => ({
                updateOne: {
                    filter: { _id: item.productId },
                    update: { $inc: { soldCount: -item.quantity } }
                }
            }));
            if (bulkReduceSoldOps.length > 0) {
                await Product.bulkWrite(bulkReduceSoldOps);
            }
        }

        await order.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Order deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
