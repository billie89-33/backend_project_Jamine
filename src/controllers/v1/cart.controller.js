import Cart from '../../models/cart.model.js';
import Product from '../../models/product.model.js';
import { PRODUCT_STATUS } from '../../constants/index.js';

/**
 * @desc    Helper function to calculate cart totals based on DB prices
 *          AND Validate/Adjust quantities against real-time stock and status
 */
const validateAndCalculateCart = async (items, autoAdjust = false) => {
    let subtotal = 0;
    let isAdjusted = false;
    const validatedItems = [];

    const productIds = items.map(item => item.productId._id || item.productId);
    // ดึงข้อมูลสินค้าเฉพาะที่ active เท่านั้น (ถ้า inactive หรือ draft จะไม่ถูกดึงมา)
    const products = await Product.find({ _id: { $in: productIds }, status: PRODUCT_STATUS.ACTIVE }).lean();
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    for (const item of items) {
        const prodId = (item.productId._id || item.productId).toString();
        const product = productMap.get(prodId);
        
        // ถ้า product ไม่มี (อาจจะโดนลบ หรือถูกปรับเป็น inactive/draft)
        if (product) {
            let finalQuantity = item.quantity;
            let stockStatus = 'available';

            if (product.stock < item.quantity) {
                isAdjusted = true;
                stockStatus = product.stock === 0 ? 'out_of_stock' : 'insufficient';
                if (autoAdjust) finalQuantity = product.stock;
            }

            if (finalQuantity > 0) {
                const itemTotal = product.price * finalQuantity;
                subtotal += itemTotal;
                
                validatedItems.push({
                    productId: product._id,
                    quantity: finalQuantity,
                    priceAtCalculation: product.price,
                    stockStatus: stockStatus,
                    availableStock: product.stock
                });
            } else if (!autoAdjust && product.stock === 0) {
                validatedItems.push({
                    productId: product._id,
                    quantity: item.quantity,
                    priceAtCalculation: product.price,
                    stockStatus: 'out_of_stock',
                    availableStock: product.stock
                });
            }
        } else {
            // สินค้าหายไปจากระบบ (ลบ/ซ่อน) ตะกร้าจะปรับตัวอัตโนมัติ (ไม่เอาใส่ validatedItems)
            isAdjusted = true;
        }
    }

    const shippingFee = (subtotal >= 1000 || subtotal === 0) ? 0 : 50;
    const total = subtotal + shippingFee;

    return { validatedItems, subtotal, shippingFee, total, isAdjusted };
};

// @desc    Get user cart
// @route   GET /api/v1/cart
export const getCart = async (req, res, next) => {
    try {
        let cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');

        if (!cart) {
            cart = await Cart.create({ userId: req.user._id, items: [] });
            return res.status(200).json({ 
                success: true, 
                data: cart 
            });
        }

        const validation = await validateAndCalculateCart(cart.items, true);
        
        cart.items = validation.validatedItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity
        }));
        cart.subtotal = validation.subtotal;
        cart.shippingFee = validation.shippingFee;
        cart.total = validation.total;

        await cart.save();
        await cart.populate({
            path: 'items.productId',
            select: 'modelName price image stock status'
        });

        res.status(200).json({
            success: true,
            isStockAdjusted: validation.isAdjusted,
            data: cart
        });
    } catch (error) {
        next(error);
    }
};

const MAX_CART_ITEMS = 50;

// @desc    Add or Update item in cart
// @route   POST /api/v1/cart
export const addToCart = async (req, res, next) => {
    try {
        const { productId, quantity } = req.body;

        let cart = await Cart.findOne({ userId: req.user._id });
        if (!cart) cart = new Cart({ userId: req.user._id, items: [] });

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        let targetQuantity = quantity;
        if (itemIndex > -1) {
            targetQuantity = cart.items[itemIndex].quantity + quantity;
            cart.items[itemIndex].quantity = targetQuantity;
        } else {
            if (cart.items.length >= MAX_CART_ITEMS) {
                return res.status(400).json({ success: false, message: `ตะกร้าเต็มแล้ว (จำกัดสูงสุด ${MAX_CART_ITEMS} รายการต่อคน)` });
            }
            cart.items.push({ productId, quantity });
        }

        const validation = await validateAndCalculateCart(cart.items, true);
        
        const addedItem = validation.validatedItems.find(item => item.productId.toString() === productId);
        
        if (!addedItem && validation.validatedItems.length < cart.items.length) {
             return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (addedItem && addedItem.quantity < targetQuantity) {
            return res.status(400).json({ 
                success: false, 
                message: `สินค้าในสต็อกมีไม่เพียงพอ (คุณมีอยู่แล้วในตะกร้า ${itemIndex > -1 ? (targetQuantity - quantity) : 0} ชิ้น และคลังเหลือรวมทั้งหมดแค่ ${addedItem.availableStock} ชิ้น)`,
                availableStock: addedItem.availableStock
            });
        }

        cart.items = validation.validatedItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity
        }));
        cart.subtotal = validation.subtotal;
        cart.shippingFee = validation.shippingFee;
        cart.total = validation.total;

        await cart.save();
        await cart.populate({
            path: 'items.productId',
            select: 'modelName price image stock status'
        });

        res.status(200).json({
            success: true,
            isStockAdjusted: validation.isAdjusted,
            data: cart
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update item quantity (Absolute value)
// @route   PATCH /api/v1/cart/update-quantity
export const updateCartQuantity = async (req, res, next) => {
    try {
        const { productId, quantity } = req.body;

        const cart = await Cart.findOne({ userId: req.user._id });
        if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
        if (itemIndex === -1) return res.status(404).json({ success: false, message: 'Item not in cart' });

        if (quantity <= 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            cart.items[itemIndex].quantity = quantity;
        }

        const validation = await validateAndCalculateCart(cart.items, true);
        
        const updatedItem = validation.validatedItems.find(item => item.productId.toString() === productId);
        if (quantity > 0 && (!updatedItem || updatedItem.quantity < quantity)) {
            return res.status(400).json({
                success: false,
                message: `สินค้าในสต็อกมีไม่เพียงพอ`,
                availableStock: updatedItem ? updatedItem.availableStock : 0
            });
        }

        cart.items = validation.validatedItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity
        }));
        cart.subtotal = validation.subtotal;
        cart.shippingFee = validation.shippingFee;
        cart.total = validation.total;

        await cart.save();
        await cart.populate({
            path: 'items.productId',
            select: 'modelName price image stock status'
        });

        res.status(200).json({
            success: true,
            isStockAdjusted: validation.isAdjusted,
            data: cart
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/:productId
export const removeFromCart = async (req, res, next) => {
    try {
        const cart = await Cart.findOne({ userId: req.user._id });
        if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

        const targetProductId = req.params.productId;

        const isItemExist = cart.items.some(item => item.productId.toString() === targetProductId);
        if (!isItemExist) {
            return res.status(404).json({ success: false, message: 'Product not found in your cart' });
        }

        cart.items = cart.items.filter(item => item.productId.toString() !== targetProductId);

        const validation = await validateAndCalculateCart(cart.items, true);
        
        cart.items = validation.validatedItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity
        }));
        cart.subtotal = validation.subtotal;
        cart.shippingFee = validation.shippingFee;
        cart.total = validation.total;

        await cart.save();
        await cart.populate({
            path: 'items.productId',
            select: 'modelName price image stock status'
        });

        res.status(200).json({
            success: true,
            data: cart
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get Cart Summary
// @route   GET /api/v1/cart/summary
export const getCartSummary = async (req, res, next) => {
    try {
        const cart = await Cart.findOne({ userId: req.user._id });
        if (!cart) return res.status(200).json({ success: true, data: { subtotal: 0, shippingFee: 0, total: 0, itemCount: 0 } });

        // 1. ส่งคำนวณสต็อกและค่าเงินล่าสุด
        const validation = await validateAndCalculateCart(cart.items, true);
        
        // 2. อัปเดตข้อมูลทุกฟิลด์กลับลงฐานข้อมูลให้ตรงกัน (ป้องกันข้อมูลขัดแย้ง)
        cart.items = validation.validatedItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity
        }));
        cart.subtotal = validation.subtotal;
        cart.shippingFee = validation.shippingFee;
        cart.total = validation.total;
        
        await cart.save();

        // 3. คำนวณจำนวนชิ้นสินค้าทั้งหมดรวมกัน (Total Pieces)
        const totalPieces = validation.validatedItems.reduce((sum, item) => sum + item.quantity, 0);

        // 4. ส่งข้อมูลสรุปที่ถูกต้องกลับไปหน้าบ้าน
        res.status(200).json({
            success: true,
            isStockAdjusted: validation.isAdjusted,
            data: {
                subtotal: cart.subtotal,
                shippingFee: cart.shippingFee,
                total: cart.total,
                itemCount: totalPieces // ได้จำนวนชิ้นรวมที่ถูกต้องแล้ว เช่น 5 ชิ้น ไม่ใช่ 2 ชนิด
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Clear entire cart (Double-Lock Cart Clearing - Layer 2)
// @route   DELETE /api/v1/cart/clear
export const clearCart = async (req, res, next) => {
    try {
        await Cart.findOneAndUpdate(
            { userId: req.user._id }, 
            { $set: { items: [], subtotal: 0, shippingFee: 0, total: 0 } }
        );

        res.status(200).json({
            success: true,
            message: 'ล้างตะกร้าสินค้าเรียบร้อยแล้ว'
        });
    } catch (error) {
        next(error);
    }
};
