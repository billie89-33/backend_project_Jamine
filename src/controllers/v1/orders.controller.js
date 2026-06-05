import Order from '../../models/order.model.js';
import Product from '../../models/product.model.js';
import Cart from '../../models/cart.model.js';
import { ORDER_STATUS, PRODUCT_STATUS } from '../../constants/index.js';

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
        // เพื่อให้มั่นใจว่า Request นี้เป็นคนเดียวที่ "ปิด" ออเดอร์นี้ได้
        for (const order of candidateOrders) {
            const lockedOrder = await Order.findOneAndUpdate(
                { _id: order._id, status: ORDER_STATUS.PENDING }, // 🔒 ล็อกสถานะเดิม
                { $set: { status: ORDER_STATUS.CANCELLED } },             // ⚡ เปลี่ยนสถานะ
                { new: true }
            ).select('_id').lean();

            // ถ้า lockedOrder มีค่า แสดงว่าเราเป็นคน "ปิด" ออเดอร์นี้สำเร็จ -> มีสิทธิ์คืนสต็อก
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

        // 3. ยิงคำสั่งคืนสต็อกสินค้าทั้งหมดในทีเดียว (⚡ Bulk Write - N+1 Query Fix)
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
        const { addressId, shippingAddress: manualAddress, clientTotal } = req.body;
        let finalShippingAddress;

        // 🟢 Logic การเลือกที่อยู่
        if (manualAddress && manualAddress.fullName && manualAddress.phone && manualAddress.address) {
            finalShippingAddress = manualAddress;
        } else if (addressId) {
            const savedAddress = req.user.addresses.find(addr => addr._id.toString() === addressId);
            if (!savedAddress) {
                const error = new Error('ไม่พบที่อยู่ที่ระบุในโปรไฟล์ของคุณ');
                error.status = 400;
                return next(error);
            }
            finalShippingAddress = savedAddress;
        } else {
            const defaultAddress = req.user.addresses.find(addr => addr.isDefault) || req.user.addresses[0];
            if (!defaultAddress) {
                const error = new Error('กรุณาระบุที่อยู่สำหรับจัดส่ง หรือเพิ่มที่อยู่ในโปรไฟล์ก่อนสั่งซื้อ');
                error.status = 400;
                return next(error);
            }
            finalShippingAddress = defaultAddress;
        }

        const requiredFields = ['fullName', 'phone', 'address', 'province', 'district', 'subDistrict', 'postalCode'];
        for (const field of requiredFields) {
            if (!finalShippingAddress[field]) {
                const error = new Error(`ข้อมูลที่อยู่ไม่สมบูรณ์: ขาด ${field}`);
                error.status = 400;
                return next(error);
            }
        }

        await checkAndExpireOrders();

        // 🟢 On-Demand Cleanup: ยกเลิกออเดอร์เดิมที่ยังค้างชำระของผู้ใช้นี้ เพื่อคืนสต็อกก่อนสร้างออเดอร์ใหม่จากตะกร้า
        // ป้องกันบั๊กการกด Checkout รัวๆ แล้วจองสต็อกซ้ำซ้อน (Inventory Leak)
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
        // ดึงเฉพาะสินค้าที่ Active เท่านั้น
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
                    { _id: product._id, stock: { $gte: cartItem.quantity }, status: PRODUCT_STATUS.ACTIVE }, // 🔒 ล็อกเงื่อนไขสต็อกและสถานะ
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
            // 🚨 Atomic Rollback Mechanism (Bulk Write Fix)
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

        const shippingFee = (subtotal >= 1000 || subtotal === 0) ? 0 : 50;
        const total = subtotal + shippingFee;

        if (clientTotal && Number(clientTotal) !== total) {
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
            subtotal,
            shippingFee,
            total,
            status: ORDER_STATUS.PENDING,
            expiresAt
        });

        // 🚨 นำโค้ดล้างตะกร้าออกตามกฎ "Cart as the Last Stand" 
        // ตะกร้าจะถูกล้างเมื่อสถานะเปลี่ยนเป็น Paid เท่านั้น

        res.status(201).json({
            success: true,
            message: 'สร้างออเดอร์สำเร็จ กรุณาชำระเงินภายใน 15 นาที',
            data: order
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

        const order = await Order.findOne({
            _id: req.params.orderId,
            userId: req.user._id
        }).populate('items.productId', 'brand modelName image price').lean();

        if (!order) {
            const error = new Error('ไม่พบรายการคำสั่งซื้อนี้');
            error.status = 404;
            return next(error);
        }

        res.status(200).json({
            success: true,
            data: order
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
        // เช็คเผื่อออเดอร์หมดอายุไปแล้วระหว่างที่กำลังจะกดจ่าย
        await checkAndExpireOrders();

        // 🔒 ATOMIC LOCK: เปลี่ยนสถานะเป็น Paid เฉพาะในกรณีที่ยังเป็น Pending เท่านั้น
        // ป้องกัน Race Condition และ Double Submission ในระดับ Database
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
        );

        if (!order) {
            // เช็คว่าทำไมถึงหาไม่เจอ: ไม่มีออเดอร์ หรือจ่ายไปแล้ว หรือโดนยกเลิก
            const existingOrder = await Order.findOne({ _id: req.params.orderId, userId: req.user._id });
            
            if (!existingOrder) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            if (existingOrder.status === ORDER_STATUS.PAID) {
                return res.status(200).json({ 
                    success: true, 
                    message: 'ออเดอร์นี้ถูกชำระเงินไปเรียบร้อยแล้ว (Already Paid)', 
                    data: existingOrder 
                });
            }

            if (existingOrder.status === ORDER_STATUS.CANCELLED) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'ไม่สามารถชำระเงินได้ เนื่องจากออเดอร์หมดอายุและถูกยกเลิกไปแล้ว' 
                });
            }
        }

        // 🌟 BEST SELLER LOGIC: อัปเดตยอดขาย (soldCount) เมื่อชำระเงินสำเร็จ
        const bulkSoldOps = order.items.map(item => ({
            updateOne: {
                filter: { _id: item.productId },
                update: { $inc: { soldCount: item.quantity } }
            }
        }));

        if (bulkSoldOps.length > 0) {
            await Product.bulkWrite(bulkSoldOps);
        }

        // 🧹 DOUBLE-LOCK CART CLEARING (Layer 1 - Backend Driven)
        // เมื่อชำระเงินสำเร็จ ให้ล้างตะกร้าของ User คนนั้นทันที
        await Cart.findOneAndUpdate(
            { userId: req.user._id }, 
            { $set: { items: [], subtotal: 0, shippingFee: 0, total: 0 } }
        );

        res.status(200).json({
            success: true,
            message: 'ชำระเงินสำเร็จ! ยอดขายถูกบันทึกแล้ว',
            data: order
        });
    } catch (error) {
        next(error);
    }
};