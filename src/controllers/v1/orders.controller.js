import Order from '../../models/order.model.js';
import Product from '../../models/product.model.js';
import Cart from '../../models/cart.model.js';

// @desc    Helper Function: กวาดล้างออเดอร์หมดอายุ (Auto-Timeout Order)
//          ทำงานแบบ Lazy เช็คทุกครั้งที่มีคนเรียก API ที่เกี่ยวข้อง
const checkAndExpireOrders = async () => {
    try {
        const now = new Date();

        // 1. ชิงเปลี่ยนสถานะออเดอร์ที่หมดอายุใน DB ให้เป็น 'Cancelled' ทันที (ดักปัญหาแย่งกันรันซ้อน)
        const expiredOrders = await Order.find({
            status: 'Awaiting Payment',
            expiresAt: { $lt: now }
        });

        if (expiredOrders.length === 0) return;

        const orderIds = expiredOrders.map(order => order._id);
        
        // ล็อกสถานะในฐานข้อมูลก่อนเลย ป้องกันฟังก์ชันอื่นมาดึงซ้ำ (Race Condition Fix)
        await Order.updateMany(
            { _id: { $in: orderIds } },
            { $set: { status: 'Cancelled' } }
        );

        // 2. รวบรวมรายการสินค้าทั้งหมดเพื่อเตรียมอัปเดตคืนสต็อกรอบเดียว (Bulk Write - N+1 Query Fix)
        const bulkOps = [];
        
        for (const order of expiredOrders) {
            for (const item of order.items) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: item.productId },
                        update: { $inc: { stock: item.quantity } } // บวกสต็อกคืนระบบ
                    }
                });
            }
        }

        // 3. ยิงคำสั่งคืนสต็อกสินค้าทั้งหมดในทีเดียว (⚡ ทำงานไวและประหยัด RAM บน Render)
        if (bulkOps.length > 0) {
            await Product.bulkWrite(bulkOps);
        }

        console.log(`[Auto-Timeout] คืนสต็อกและยกเลิกออเดอร์สำเร็จจำนวน ${expiredOrders.length} รายการ`);
    } catch (error) {
        // ดักจับ Error ไม่ให้แอปพลิเคชันหลักค้างหรือหยุดทำงาน (Error Handling Fix)
        console.error('เกิดข้อผิดพลาดในระบบล้างออเดอร์หมดอายุ:', error);
    }
};

// @desc    Create new order (Checkout)
// @route   POST /api/v1/orders
// @access  Private
export const createOrder = async (req, res, next) => {
    try {
        // ⚡ รับค่ายอดเงินที่ลูกค้าเห็นบนหน้าจอ (clientTotal) มารีเช็คด้วยเพื่อความโปร่งใส
        const { shippingAddress, clientTotal } = req.body;

        if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.address) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลที่อยู่สำหรับจัดส่งให้ครบถ้วน' });
        }

        // 1. กวาดล้างออเดอร์หมดอายุเพื่อคืนสต็อกเผื่อใครกำลังเล็งของชิ้นเดียวกันอยู่
        await checkAndExpireOrders();

        // 2. ดึงข้อมูลตะกร้าของผู้ใช้
        const cart = await Cart.findOne({ userId: req.user._id });
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'ตะกร้าสินค้าว่างเปล่า' });
        }

        const productIds = cart.items.map(item => item.productId);
        const products = await Product.find({ _id: { $in: productIds } });
        const productMap = new Map(products.map(p => [p._id.toString(), p]));

        const orderItems = [];
        let subtotal = 0;
        const reservedItems = []; // สำหรับเก็บประวัติการหักสต็อก เผื่อต้อง Rollback คืน

        try {
            // 3. Inventory Reservation (หักสต็อกทีละรายการแบบปลอดภัย)
            for (const cartItem of cart.items) {
                const prodIdStr = cartItem.productId.toString();
                const product = productMap.get(prodIdStr);

                if (!product) {
                    throw new Error(`ไม่พบข้อมูลสินค้า (ID: ${prodIdStr}) อาจถูกลบไปแล้ว`);
                }

                // 🔒 ใช้ $inc ร่วมกับเงื่อนไขดักสต็อกติดลบแบบ Atomic
                const updatedProduct = await Product.findOneAndUpdate(
                    { _id: product._id, stock: { $gte: cartItem.quantity } },
                    { $inc: { stock: -cartItem.quantity } }, // หักออก
                    { new: true }
                );

                if (!updatedProduct) {
                    throw new Error(`สินค้า "${product.modelName}" ในคลังมีไม่เพียงพอ (อาจถูกซื้อตัดหน้าไปแล้ว)`);
                }

                // จำไว้ว่าเราหักชิ้นไหนไปแล้วบ้าง เผื่อชิ้นถัดไปพังจะได้คืนชิ้นนี้ได้ถูก
                reservedItems.push(cartItem);

                // บันทึกราคา ณ วินาทีที่กดซื้อ
                const itemTotal = product.price * cartItem.quantity;
                subtotal += itemTotal;

                orderItems.push({
                    productId: product._id,
                    brand: product.brand,       // Snapshot แบรนด์
                    modelName: product.modelName, // Snapshot ชื่อรุ่น
                    image: product.image.url,   // Snapshot รูปภาพ
                    quantity: cartItem.quantity,
                    priceAtPurchase: product.price // ล็อกราคาสินค้าไว้เลย ห้ามเปลี่ยน
                });
            }
        } catch (error) {
            // 🚨 Rollback Mechanism: ถ้าหักสต็อกพังกลางคัน ต้องคืนสต็อกสินค้าก่อนหน้าที่หักไปแล้วทั้งหมด
            for (const reserved of reservedItems) {
                await Product.findByIdAndUpdate(reserved.productId, {
                    $inc: { stock: reserved.quantity }
                });
            }
            return res.status(400).json({ success: false, message: error.message });
        }

        // คำนวณยอดเงินรวมสุทธิหลังบ้าน (กฎเดียวกับหน้าตะกร้า)
        const shippingFee = (subtotal >= 1000 || subtotal === 0) ? 0 : 50;
        const total = subtotal + shippingFee;

        // 🛡️ ⚡ ตรวจสอบราคาสินค้าเปลี่ยนตัดหน้าก่อนเปิดบิลจริง (Secure Price Verification)
        if (clientTotal && Number(clientTotal) !== total) {
            // เจอปัญหาราคาไม่ตรงกัน ทำการคืนสต็อกที่เพิ่งหักไปทั้งหมดทันที (Rollback)
            for (const reserved of reservedItems) {
                await Product.findByIdAndUpdate(reserved.productId, { $inc: { stock: reserved.quantity } });
            }
            return res.status(400).json({ 
                success: false, 
                message: 'ราคาสินค้าหรือค่าจัดส่งในระบบมีการอัปเดต โปรดรีเฟรชหน้าตะกร้าสินค้าและทำรายการใหม่อีกครั้ง' 
            });
        }

        // 4. บันทึก Order และตั้งเวลาหมดอายุ +15 นาที
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        const order = await Order.create({
            userId: req.user._id,
            items: orderItems,
            shippingAddress,
            subtotal,
            shippingFee,
            total,
            status: 'Awaiting Payment',
            expiresAt
        });

        // 5. ล้างข้อมูลในตะกร้าทันทีที่สร้างออเดอร์สำเร็จ
        cart.items = [];
        cart.subtotal = 0;
        cart.shippingFee = 0;
        cart.total = 0;
        await cart.save();

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
        // อัปเดตสถานะแบบเรียลไทม์
        await checkAndExpireOrders();

        const order = await Order.findOne({
            _id: req.params.orderId,
            userId: req.user._id // ดึงได้เฉพาะของตัวเองเท่านั้น
        }).populate('items.productId', 'brand modelName image price');

        if (!order) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายการคำสั่งซื้อนี้' });
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

        const order = await Order.findOne({
            _id: req.params.orderId,
            userId: req.user._id
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // ตรวจสอบ Idempotency ป้องกันกดรัวๆ ซ้ำซ้อน
        if (order.status === 'Paid') {
            return res.status(200).json({ 
                success: true, 
                message: 'ออเดอร์นี้ถูกชำระเงินไปเรียบร้อยแล้ว (Already Paid)', 
                data: order 
            });
        }

        if (order.status === 'Cancelled') {
            return res.status(400).json({ 
                success: false, 
                message: 'ไม่สามารถชำระเงินได้ เนื่องจากออเดอร์หมดอายุและถูกยกเลิกไปแล้ว' 
            });
        }

        // เปลี่ยนสถานะ
        order.status = 'Paid';
        await order.save();

        res.status(200).json({
            success: true,
            message: 'ชำระเงินสำเร็จ!',
            data: order
        });
    } catch (error) {
        next(error);
    }
};