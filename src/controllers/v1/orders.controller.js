import Order from '../../models/order.model.js';
import Product from '../../models/product.model.js';
import Cart from '../../models/cart.model.js';
import { ORDER_STATUS, PRODUCT_STATUS } from '../../constants/index.js';
import { calculateTotals } from '../../utils/orderHelper.js';

// @desc    Helper Function: กวาดล้างออเดอร์หมดอายุ (Auto-Timeout Order)
//          ทำงานแบบ Lazy เช็คทุกครั้งที่มีคนเรียก API ที่เกี่ยวข้อง
const checkAndExpireOrders = async () => {
    try {
        const now = new Date();

        // 1. ค้นหาออเดอร์ที่หมดอายุเบื้องต้น
        const candidateOrders = await Order.find({
            status: ORDER_STATUS.PENDING,
            expiresAt: { $lt: now }
        }).select('_id items').lean();

        if (candidateOrders.length === 0) return;

        const bulkRestockOps = [];
        let expiredCount = 0;
        
        // 2. ล็อกและเปลี่ยนสถานะทีละรายการแบบ Atomic (Race Condition Fix)
        for (const order of candidateOrders) {
            const lockedOrder = await Order.findOneAndUpdate(
                { _id: order._id, status: ORDER_STATUS.PENDING },
                { $set: { status: ORDER_STATUS.CANCELLED } },
                { new: true }
            ).select('_id').lean();

            if (lockedOrder) {
                expiredCount++;
                for (const item of order.items) {
                    bulkRestockOps.push({
                        updateOne: {
                            filter: { _id: item.productId },
                            update: { $inc: { stock: item.quantity } }
                        }
                    });
                }
            }
        }

        // 3. ยิงคำสั่งคืนสต็อกสินค้าทั้งหมดในทีเดียว (Bulk Write)
        if (bulkRestockOps.length > 0) {
            await Product.bulkWrite(bulkRestockOps);
        }

        if (expiredCount > 0) {
            console.log(`[Auto-Timeout] คืนสต็อกและยกเลิกออเดอร์สำเร็จจำนวน ${expiredCount} รายการ`);
        }
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในระบบล้างออเดอร์หมดอายุ:', error);
    }
};

// @desc    Create new order (Checkout)
// @route   POST /api/v1/orders
// @access  Private
export const createOrder = async (req, res, next) => {
    try {
        // 🟢 Logic การเลือกที่อยู่ (Explicit Selection Logic)
        const { addressId, shippingAddress: manualAddress, clientTotal } = req.body;
        let finalShippingAddress;

        if (manualAddress && Object.keys(manualAddress).length > 0) {
            // กรณีที่ 1: ลูกค้ากรอกที่อยู่ใหม่เอง (Manual) -> ต้องใช้ที่อยู่นี้เท่านั้น ห้าม fallback
            finalShippingAddress = manualAddress;
        } else if (addressId) {
            // กรณีที่ 2: ลูกค้าเลือกที่อยู่เดิมที่มีอยู่แล้ว -> ต้องหาให้เจอในโปรไฟล์
            const savedAddress = req.user.addresses.find(addr => addr._id.toString() === addressId);
            if (!savedAddress) {
                const error = new Error('ไม่พบที่อยู่ที่ระบุในโปรไฟล์ของคุณ');
                error.status = 400;
                return next(error);
            }
            finalShippingAddress = savedAddress;
        } else {
            // กรณีที่ 3: ไม่ได้ส่งอะไรมาเลย -> ดึงที่อยู่หลัก (Default) หรืออันแรกสุด
            if (!req.user.addresses || req.user.addresses.length === 0) {
                const error = new Error('ไม่พบข้อมูลที่อยู่จัดส่ง กรุณาเพิ่มที่อยู่ในโปรไฟล์หรือระบุที่อยู่ใหม่');
                error.status = 400;
                return next(error);
            }
            finalShippingAddress = req.user.addresses.find(addr => addr.isDefault) || req.user.addresses[0];
        }

        // ตรวจสอบความครบถ้วนของฟิลด์ (ต้องมีครบ 7 ฟิลด์มาตรฐาน)
        const requiredFields = ['fullName', 'phone', 'address', 'province', 'district', 'subDistrict', 'postalCode'];
        for (const field of requiredFields) {
            if (!finalShippingAddress[field]) {
                const error = new Error(`ข้อมูลที่อยู่ไม่สมบูรณ์: ขาดฟิลด์ ${field}`);
                error.status = 400;
                return next(error);
            }
        }

        await checkAndExpireOrders();

        // 🟢 On-Demand Cleanup
        const existingPendingOrders = await Order.find({
            userId: req.user._id,
            status: ORDER_STATUS.PENDING
        }).select('_id items').lean();

        if (existingPendingOrders.length > 0) {
            const bulkRestockOps = [];
            for (const order of existingPendingOrders) {
                const lockedOrder = await Order.findOneAndUpdate(
                    { _id: order._id, status: ORDER_STATUS.PENDING },
                    { $set: { status: ORDER_STATUS.CANCELLED } },
                    { new: true }
                ).select('_id').lean();

                if (lockedOrder) {
                    for (const item of order.items) {
                        bulkRestockOps.push({
                            updateOne: {
                                filter: { _id: item.productId },
                                update: { $inc: { stock: item.quantity } }
                            }
                        });
                    }
                }
            }
            if (bulkRestockOps.length > 0) {
                await Product.bulkWrite(bulkRestockOps);
            }
        }

        const cart = await Cart.findOne({ userId: req.user._id }).lean();
        if (!cart || cart.items.length === 0) {
            const error = new Error('ตะกร้าสินค้าว่างเปล่า');
            error.status = 400;
            return next(error);
        }

        const productIds = cart.items.map(item => item.productId);
        const products = await Product.find({ _id: { $in: productIds }, status: PRODUCT_STATUS.ACTIVE }).lean();
        const productMap = new Map(products.map(p => [p._id.toString(), p]));

        const orderItems = [];
        let subtotal = 0;
        const reservedItems = []; 

        try {
            for (const cartItem of cart.items) {
                const prodIdStr = cartItem.productId.toString();
                const product = productMap.get(prodIdStr);

                if (!product) {
                    throw new Error(`สินค้าบางรายการ (ID: ${prodIdStr}) ไม่พร้อมจำหน่ายในขณะนี้ หรือถูกซ่อนไปแล้ว`);
                }

                const updatedProduct = await Product.findOneAndUpdate(
                    { _id: product._id, stock: { $gte: cartItem.quantity }, status: PRODUCT_STATUS.ACTIVE },
                    { $inc: { stock: -cartItem.quantity } },
                    { new: true }
                ).select('_id').lean();

                if (!updatedProduct) {
                    throw new Error(`สินค้า "${product.modelName}" ในคลังมีไม่เพียงพอ หรือสถานะสินค้ามีการเปลี่ยนแปลง`);
                }

                reservedItems.push(cartItem);

                const itemTotal = product.price * cartItem.quantity;
                subtotal += itemTotal;

                orderItems.push({
                    productId: product._id,
                    brand: product.brand,
                    modelName: product.modelName,
                    image: product.image.url,
                    quantity: cartItem.quantity,
                    priceAtPurchase: product.price
                });
            }
        } catch (error) {
            if (reservedItems.length > 0) {
                const rollbackOps = reservedItems.map(reserved => ({
                    updateOne: {
                        filter: { _id: reserved.productId },
                        update: { $inc: { stock: reserved.quantity } }
                    }
                }));
                await Product.bulkWrite(rollbackOps);
            }
            const err = new Error(error.message);
            err.status = 400;
            return next(err);
        }

        // Use Centralized Helper
        const totals = calculateTotals(subtotal);

        if (clientTotal && Number(clientTotal) !== totals.total) {
            if (reservedItems.length > 0) {
                const rollbackOps = reservedItems.map(reserved => ({
                    updateOne: {
                        filter: { _id: reserved.productId },
                        update: { $inc: { stock: reserved.quantity } }
                    }
                }));
                await Product.bulkWrite(rollbackOps);
            }
            const error = new Error('ราคาสินค้าหรือค่าจัดส่งในระบบมีการอัปเดต โปรดรีเฟรชหน้าตะกร้าสินค้าและทำรายการใหม่อีกครั้ง');
            error.status = 400;
            return next(error);
        }

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); 

        const order = await Order.create({
            userId: req.user._id,
            items: orderItems,
            shippingAddress: finalShippingAddress,
            subtotal: totals.subtotal,
            shippingFee: totals.shippingFee,
            discount: totals.discount,
            total: totals.total,
            status: ORDER_STATUS.PENDING,
            expiresAt
        });

        res.status(201).json({
            success: true,
            message: 'สร้างออเดอร์สำเร็จ กรุณาชำระเงินภายใน 15 นาที',
            data: {
                ...order.toObject(),
                totalAmount: order.total // Alias for Frontend compatibility
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all orders for current user
// @route   GET /api/v1/orders/me
// @access  Private
export const getMyOrders = async (req, res, next) => {
    try {
        // กวาดล้างออเดอร์หมดอายุก่อนดึงข้อมูล เพื่อให้สถานะเป็นปัจจุบัน
        await checkAndExpireOrders();

        // ค้นหาออเดอร์ทั้งหมดที่เป็นของ User คนนี้
        const orders = await Order.find({ userId: req.user._id })
            .sort('-createdAt') // เอาอันใหม่ขึ้นก่อน
            .lean();

        // เพิ่ม totalAmount และ discount ให้รองรับโครงสร้างหน้าบ้าน
        const formattedOrders = orders.map(order => ({
            ...order,
            totalAmount: order.total,
            discount: order.discount || 0
        }));

        res.status(200).json({
            success: true,
            data: formattedOrders
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get order by ID
// @route   GET /api/v1/orders/:orderId
// @access  Private
export const getOrderById = async (req, res, next) => {
    try {
        await checkAndExpireOrders();

        // NOTE: We rely on snapshot data (brand, modelName, image, priceAtPurchase)
        // saved in the order items, NOT populated data from Product model.
        const order = await Order.findOne({
            _id: req.params.orderId,
            userId: req.user._id
        }).lean();

        if (!order) {
            const error = new Error('ไม่พบรายการคำสั่งซื้อนี้');
            error.status = 404;
            return next(error);
        }

        res.status(200).json({
            success: true,
            data: {
                ...order,
                totalAmount: order.total, // Alias
                discount: order.discount || 0
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Mock Payment Success
// @route   POST /api/v1/orders/:orderId/mock-payment
// @access  Private
export const mockPayment = async (req, res, next) => {
    try {
        await checkAndExpireOrders();

        const order = await Order.findOneAndUpdate(
            { 
                _id: req.params.orderId, 
                userId: req.user._id, 
                status: ORDER_STATUS.PENDING 
            },
            { 
                $set: { 
                    status: ORDER_STATUS.PAID,
                    paymentDetails: {
                        method: 'PromptPay (Mock)',
                        paidAt: new Date(),
                        transactionId: `MOCK-TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
                    }
                } 
            },
            { new: true }
        ).lean();

        if (!order) {
            const existingOrder = await Order.findOne({ _id: req.params.orderId, userId: req.user._id }).lean();
            
            if (!existingOrder) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            if (existingOrder.status === ORDER_STATUS.PAID) {
                return res.status(200).json({ 
                    success: true, 
                    message: 'ออเดอร์นี้ถูกชำระเงินไปเรียบร้อยแล้ว (Already Paid)', 
                    data: {
                        ...existingOrder,
                        totalAmount: existingOrder.total,
                        discount: existingOrder.discount || 0
                    } 
                });
            }

            if (existingOrder.status === ORDER_STATUS.CANCELLED) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'ไม่สามารถชำระเงินได้ เนื่องจากออเดอร์หมดอายุและถูกยกเลิกไปแล้ว' 
                });
            }
        }

        const bulkSoldOps = order.items.map(item => ({
            updateOne: {
                filter: { _id: item.productId },
                update: { $inc: { soldCount: item.quantity } }
            }
        }));

        if (bulkSoldOps.length > 0) {
            await Product.bulkWrite(bulkSoldOps);
        }

        await Cart.findOneAndUpdate(
            { userId: req.user._id }, 
            { $set: { items: [], subtotal: 0, shippingFee: 0, total: 0 } }
        );

        res.status(200).json({
            success: true,
            message: 'ชำระเงินสำเร็จ! ยอดขายถูกบันทึกแล้ว',
            data: {
                ...order,
                totalAmount: order.total,
                discount: order.discount || 0
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Cancel a pending order (Manual User Cancellation)
// @route   POST /api/v1/orders/:orderId/cancel
// @access  Private
export const cancelOrder = async (req, res, next) => {
    try {
        await checkAndExpireOrders();

        const orderId = req.params.orderId;
        const userId = req.user._id;

        const order = await Order.findOne({ _id: orderId, userId, status: ORDER_STATUS.PENDING });

        if (!order) {
            const existingOrder = await Order.findOne({ _id: orderId, userId }).lean();
            if (!existingOrder) {
                return res.status(404).json({ success: false, message: 'ไม่พบรายการคำสั่งซื้อนี้' });
            }
            if (existingOrder.status === ORDER_STATUS.CANCELLED) {
                return res.status(400).json({ success: false, message: 'คำสั่งซื้อนี้ถูกยกเลิกไปแล้ว' });
            }
            return res.status(400).json({ success: false, message: `ไม่สามารถยกเลิกได้ เนื่องจากสถานะปัจจุบันคือ ${existingOrder.status}` });
        }

        order.status = ORDER_STATUS.CANCELLED;
        await order.save();

        if (order.items && order.items.length > 0) {
            const bulkRestockOps = order.items.map(item => ({
                updateOne: {
                    filter: { _id: item.productId },
                    update: { $inc: { stock: item.quantity } }
                }
            }));
            await Product.bulkWrite(bulkRestockOps);
        }

        res.status(200).json({
            success: true,
            message: 'ยกเลิกคำสั่งซื้อเรียบร้อยแล้วและคืนสต็อกสินค้า',
            data: {
                ...order.toObject(),
                totalAmount: order.total,
                discount: order.discount || 0
            }
        });
    } catch (error) {
        next(error);
    }
};
