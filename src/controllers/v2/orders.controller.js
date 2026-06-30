import prisma from '../../config/prisma.js';
import { ORDER_STATUS, PRODUCT_STATUS } from '../../constants/index.js';
import { calculateTotals } from '../../utils/orderHelper.js';

// @desc    Helper Function: กวาดล้างออเดอร์หมดอายุ (Auto-Timeout Order)
//          ทำงานแบบ Lazy เช็คทุกครั้งที่มีคนเรียก API ที่เกี่ยวข้อง
const checkAndExpireOrders = async () => {
    try {
        const now = new Date();

        const candidateOrders = await prisma.order.findMany({
            where: {
                status: ORDER_STATUS.PENDING,
                expiresAt: { lt: now }
            },
            include: { items: true }
        });

        if (candidateOrders.length === 0) return;

        let expiredCount = 0;
        
        // Transaction to lock and update
        for (const order of candidateOrders) {
            await prisma.$transaction(async (tx) => {
                const lockedOrder = await tx.order.findFirst({
                    where: { id: order.id, status: ORDER_STATUS.PENDING }
                });

                if (lockedOrder) {
                    await tx.order.update({
                        where: { id: order.id },
                        data: { status: ORDER_STATUS.CANCELLED }
                    });

                    expiredCount++;
                    for (const item of order.items) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { stock: { increment: item.quantity } }
                        });
                    }
                }
            });
        }

        if (expiredCount > 0) {
            console.log(`[Auto-Timeout] คืนสต็อกและยกเลิกออเดอร์สำเร็จจำนวน ${expiredCount} รายการ (V2)`);
        }
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในระบบล้างออเดอร์หมดอายุ (V2):', error);
    }
};

const formatOrderResponse = (order) => {
    return {
        ...order,
        _id: order.id, // Frontend compatibility
        totalAmount: order.total,
        discount: order.discount || 0,
        items: order.items?.map(item => ({
            ...item,
            _id: item.id,
            productId: item.productId
        }))
    };
};

// @desc    Create new order (Checkout)
// @route   POST /api/v2/orders
// @access  Private
export const createOrder = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        const { addressId, shippingAddress: manualAddress, clientTotal } = req.body;
        let finalShippingAddress;

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (manualAddress && Object.keys(manualAddress).length > 0) {
            finalShippingAddress = manualAddress;
        } else if (addressId) {
            const savedAddress = (user.addresses || []).find(addr => addr._id === addressId);
            if (!savedAddress) {
                const error = new Error('ไม่พบที่อยู่ที่ระบุในโปรไฟล์ของคุณ');
                error.status = 400;
                throw error;
            }
            finalShippingAddress = savedAddress;
        } else {
            if (!user.addresses || user.addresses.length === 0) {
                const error = new Error('ไม่พบข้อมูลที่อยู่จัดส่ง กรุณาเพิ่มที่อยู่ในโปรไฟล์หรือระบุที่อยู่ใหม่');
                error.status = 400;
                throw error;
            }
            finalShippingAddress = user.addresses.find(addr => addr.isDefault) || user.addresses[0];
        }

        const requiredFields = ['fullName', 'phone', 'address', 'province', 'district', 'subDistrict', 'postalCode'];
        for (const field of requiredFields) {
            if (!finalShippingAddress[field]) {
                const error = new Error(`ข้อมูลที่อยู่ไม่สมบูรณ์: ขาดฟิลด์ ${field}`);
                error.status = 400;
                throw error;
            }
        }

        await checkAndExpireOrders();

        // 🟢 On-Demand Cleanup (Cancel previous pending orders for this user)
        const existingPendingOrders = await prisma.order.findMany({
            where: { userId, status: ORDER_STATUS.PENDING },
            include: { items: true }
        });

        for (const order of existingPendingOrders) {
            await prisma.$transaction(async (tx) => {
                const lockedOrder = await tx.order.findFirst({
                    where: { id: order.id, status: ORDER_STATUS.PENDING }
                });
                if (lockedOrder) {
                    await tx.order.update({
                        where: { id: order.id },
                        data: { status: ORDER_STATUS.CANCELLED }
                    });
                    for (const item of order.items) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { stock: { increment: item.quantity } }
                        });
                    }
                }
            });
        }

        const cart = await prisma.cart.findUnique({
            where: { userId },
            include: { items: { include: { product: true } } }
        });

        if (!cart || cart.items.length === 0) {
            const error = new Error('ตะกร้าสินค้าว่างเปล่า');
            error.status = 400;
            throw error;
        }

        let subtotal = 0;
        
        // 🚀 Prisma Interactive Transaction (The magic happens here)
        const order = await prisma.$transaction(async (tx) => {
            const orderItems = [];
            
            for (const cartItem of cart.items) {
                const product = await tx.product.findUnique({
                    where: { id: cartItem.productId }
                });

                if (!product || product.status !== PRODUCT_STATUS.ACTIVE) {
                    throw new Error(`สินค้าบางรายการ (ID: ${cartItem.productId}) ไม่พร้อมจำหน่ายในขณะนี้ หรือถูกซ่อนไปแล้ว`);
                }

                if (product.stock < cartItem.quantity) {
                    throw new Error(`สินค้า "${product.modelName}" ในคลังมีไม่เพียงพอ หรือสถานะสินค้ามีการเปลี่ยนแปลง`);
                }

                // Deduct stock
                await tx.product.update({
                    where: { id: product.id },
                    data: { stock: { decrement: cartItem.quantity } }
                });

                const itemTotal = product.price * cartItem.quantity;
                subtotal += itemTotal;

                orderItems.push({
                    productId: product.id,
                    brand: product.brand,
                    modelName: product.modelName,
                    image: product.imageUrl,
                    quantity: cartItem.quantity,
                    priceAtPurchase: product.price
                });
            }

            const totals = calculateTotals(subtotal);

            if (clientTotal && Number(clientTotal) !== totals.total) {
                throw new Error('ราคาสินค้าหรือค่าจัดส่งในระบบมีการอัปเดต โปรดรีเฟรชหน้าตะกร้าสินค้าและทำรายการใหม่อีกครั้ง');
            }

            // Mongoose creates OrderNumber manually via pre-save, but for Prisma we'll generate one here
            const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); 

            const newOrder = await tx.order.create({
                data: {
                    orderNumber,
                    userId,
                    shippingAddress: finalShippingAddress,
                    subtotal: totals.subtotal,
                    shippingFee: totals.shippingFee,
                    // discount: totals.discount, // Prisma Order doesn't have discount field directly in schema, but we can compute or ignore since it's v1 behavior
                    total: totals.total,
                    status: ORDER_STATUS.PENDING,
                    expiresAt,
                    items: {
                        create: orderItems
                    }
                },
                include: { items: true }
            });

            return newOrder;
        });

        res.status(201).json({
            success: true,
            message: 'สร้างออเดอร์สำเร็จ กรุณาชำระเงินภายใน 15 นาที',
            data: formatOrderResponse(order)
        });
    } catch (error) {
        if (error.message.includes('ราคาสินค้าหรือค่าจัดส่งในระบบมีการอัปเดต') || error.message.includes('ในคลังมีไม่เพียงพอ') || error.message.includes('ไม่พร้อมจำหน่าย')) {
            error.status = 400;
        }
        next(error);
    }
};

// @desc    Get all orders for current user
// @route   GET /api/v2/orders/me
// @access  Private
export const getMyOrders = async (req, res, next) => {
    try {
        await checkAndExpireOrders();

        const userId = req.user.id || req.user._id;
        const orders = await prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: { items: true }
        });

        res.status(200).json({
            success: true,
            data: orders.map(formatOrderResponse)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get order by ID
// @route   GET /api/v2/orders/:orderId
// @access  Private
export const getOrderById = async (req, res, next) => {
    try {
        await checkAndExpireOrders();

        const userId = req.user.id || req.user._id;
        const order = await prisma.order.findFirst({
            where: {
                id: req.params.orderId,
                userId
            },
            include: { items: true }
        });

        if (!order) {
            const error = new Error('ไม่พบรายการคำสั่งซื้อนี้');
            error.status = 404;
            return next(error);
        }

        res.status(200).json({
            success: true,
            data: formatOrderResponse(order)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Mock Payment Success
// @route   POST /api/v2/orders/:orderId/mock-payment
// @access  Private
export const mockPayment = async (req, res, next) => {
    try {
        await checkAndExpireOrders();
        
        const userId = req.user.id || req.user._id;

        const order = await prisma.order.findFirst({
            where: { id: req.params.orderId, userId },
            include: { items: true }
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.status === ORDER_STATUS.PAID) {
            return res.status(200).json({ 
                success: true, 
                message: 'ออเดอร์นี้ถูกชำระเงินไปเรียบร้อยแล้ว (Already Paid)', 
                data: formatOrderResponse(order)
            });
        }

        if (order.status === ORDER_STATUS.CANCELLED) {
            return res.status(400).json({ 
                success: false, 
                message: 'ไม่สามารถชำระเงินได้ เนื่องจากออเดอร์หมดอายุและถูกยกเลิกไปแล้ว' 
            });
        }

        // Transaction to update order, update sold counts, and clear cart
        const updatedOrder = await prisma.$transaction(async (tx) => {
            const paidOrder = await tx.order.update({
                where: { id: order.id },
                data: {
                    status: ORDER_STATUS.PAID,
                    paymentMethod: 'PromptPay (Mock)',
                    paymentPaidAt: new Date(),
                    paymentTransactionId: `MOCK-TXN-${Math.random().toString(36).substring(2, 11).toUpperCase()}`
                },
                include: { items: true }
            });

            for (const item of order.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { soldCount: { increment: item.quantity } }
                });
            }

            const cart = await tx.cart.findUnique({ where: { userId } });
            if (cart) {
                await tx.cart.update({
                    where: { id: cart.id },
                    data: {
                        subtotal: 0,
                        shippingFee: 0,
                        total: 0,
                        items: { deleteMany: {} }
                    }
                });
            }

            return paidOrder;
        });

        res.status(200).json({
            success: true,
            message: 'ชำระเงินสำเร็จ! ยอดขายถูกบันทึกแล้ว',
            data: formatOrderResponse(updatedOrder)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Cancel a pending order (Manual User Cancellation)
// @route   POST /api/v2/orders/:orderId/cancel
// @access  Private
export const cancelOrder = async (req, res, next) => {
    try {
        await checkAndExpireOrders();

        const orderId = req.params.orderId;
        const userId = req.user.id || req.user._id;

        const order = await prisma.order.findFirst({
            where: { id: orderId, userId },
            include: { items: true }
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายการคำสั่งซื้อนี้' });
        }

        if (order.status === ORDER_STATUS.CANCELLED) {
            return res.status(400).json({ success: false, message: 'คำสั่งซื้อนี้ถูกยกเลิกไปแล้ว' });
        }

        if (order.status !== ORDER_STATUS.PENDING) {
            return res.status(400).json({ success: false, message: `ไม่สามารถยกเลิกได้ เนื่องจากสถานะปัจจุบันคือ ${order.status}` });
        }

        const cancelledOrder = await prisma.$transaction(async (tx) => {
            const updatedOrder = await tx.order.update({
                where: { id: order.id },
                data: { status: ORDER_STATUS.CANCELLED },
                include: { items: true }
            });

            for (const item of order.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { increment: item.quantity } }
                });
            }

            return updatedOrder;
        });

        res.status(200).json({
            success: true,
            message: 'ยกเลิกคำสั่งซื้อเรียบร้อยแล้วและคืนสต็อกสินค้า',
            data: formatOrderResponse(cancelledOrder)
        });
    } catch (error) {
        next(error);
    }
};
