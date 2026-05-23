import Cart from '../../models/cart.model.js';
import Product from '../../models/product.model.js';

/**
 * @desc    Helper function to calculate cart totals based on DB prices
 *          AND Validate/Adjust quantities against real-time stock
 * @param   {Array} items - Array of items (can be populated or not)
 * @param   {Boolean} autoAdjust - If true, will reduce quantity to match stock if stock is insufficient
 * @returns {Object} - { validatedItems, subtotal, shippingFee, total, isAdjusted }
 */
const validateAndCalculateCart = async (items, autoAdjust = false) => {
    let subtotal = 0;
    let isAdjusted = false;
    const validatedItems = [];

    // Get IDs (handle both populated and unpopulated cases)
    const productIds = items.map(item => item.productId._id || item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    for (const item of items) {
        const prodId = (item.productId._id || item.productId).toString();
        const product = productMap.get(prodId);
        
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
        }
    }

    const shippingFee = (subtotal >= 1000 || subtotal === 0) ? 0 : 50;
    const total = subtotal + shippingFee;

    return { validatedItems, subtotal, shippingFee, total, isAdjusted };
};

// @desc    Get user cart (Optimized: Populate once, Sync to DB)
// @route   GET /api/v1/cart
// @access  Private
export const getCart = async (req, res, next) => {
    try {
        // 1. Populate once at the start to get latest product data
        let cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');

        if (!cart) {
            cart = await Cart.create({ userId: req.user._id, items: [] });
            return res.status(200).json({ 
                success: true, 
                data: { _id: cart._id, userId: cart.userId, items: [], subtotal: 0, shippingFee: 0, total: 0 } 
            });
        }

        // 2. Validate and Auto-Adjust based on real-time stock
        const validation = await validateAndCalculateCart(cart.items, true);
        
        // 3. Update fields for saving (Mongoose will only save fields in schema)
        cart.items = validation.validatedItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity
        }));
        cart.subtotal = validation.subtotal;
        cart.shippingFee = validation.shippingFee;
        cart.total = validation.total;

        // Save the fresh state back to DB
        await cart.save();

        // 4. Re-populate to ensure the items in response have full product details
        // Note: We avoid findById by simply populating the existing doc if needed, 
        // or just return the mapped version. But for consistency with frontend expectations:
        const finalCart = await Cart.findById(cart._id).populate('items.productId');

        res.status(200).json({
            success: true,
            isStockAdjusted: validation.isAdjusted,
            data: finalCart
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add or Update item in cart
// @route   POST /api/v1/cart
// @access  Private
const MAX_CART_ITEMS = 50;

export const addToCart = async (req, res, next) => {
    try {
        const { productId, quantity } = req.body;

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        if (product.stock < quantity) {
            return res.status(400).json({ 
                success: false, 
                message: `สินค้าในสต็อกมีไม่เพียงพอ (เหลืออยู่ ${product.stock} ชิ้น)`,
                availableStock: product.stock
            });
        }

        let cart = await Cart.findOne({ userId: req.user._id });
        if (!cart) cart = new Cart({ userId: req.user._id, items: [] });

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity = quantity;
        } else {
            if (cart.items.length >= MAX_CART_ITEMS) {
                return res.status(400).json({
                    success: false,
                    message: `ตะกร้าเต็มแล้ว (จำกัดสูงสุด ${MAX_CART_ITEMS} รายการต่อคน)`
                });
            }
            cart.items.push({ productId, quantity });
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

        const finalCart = await Cart.findById(cart._id).populate('items.productId');

        res.status(200).json({
            success: true,
            isStockAdjusted: validation.isAdjusted,
            data: finalCart
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update item quantity in cart
// @route   PATCH /api/v1/cart/update-quantity
// @access  Private
export const updateCartQuantity = async (req, res, next) => {
    try {
        const { productId, quantity } = req.body;

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        if (product.stock < quantity) {
            return res.status(400).json({ 
                success: false, 
                message: `สินค้าในสต็อกมีไม่เพียงพอ (เหลืออยู่ ${product.stock} ชิ้น)`,
                availableStock: product.stock
            });
        }

        const cart = await Cart.findOne({ userId: req.user._id });
        if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
        if (itemIndex === -1) return res.status(404).json({ success: false, message: 'Item not in cart' });

        cart.items[itemIndex].quantity = quantity;

        const validation = await validateAndCalculateCart(cart.items, true);
        cart.items = validation.validatedItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity
        }));
        cart.subtotal = validation.subtotal;
        cart.shippingFee = validation.shippingFee;
        cart.total = validation.total;

        await cart.save();

        const finalCart = await Cart.findById(cart._id).populate('items.productId');

        res.status(200).json({
            success: true,
            isStockAdjusted: validation.isAdjusted,
            data: finalCart
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/:productId
// @access  Private
export const removeFromCart = async (req, res, next) => {
    try {
        const cart = await Cart.findOne({ userId: req.user._id });
        if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

        cart.items = cart.items.filter(item => item.productId.toString() !== req.params.productId);

        const validation = await validateAndCalculateCart(cart.items, true);
        cart.items = validation.validatedItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity
        }));
        cart.subtotal = validation.subtotal;
        cart.shippingFee = validation.shippingFee;
        cart.total = validation.total;

        await cart.save();

        const finalCart = await Cart.findById(cart._id).populate('items.productId');

        res.status(200).json({
            success: true,
            data: finalCart
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get Cart Summary
// @route   GET /api/v1/cart/summary
// @access  Private
export const getCartSummary = async (req, res, next) => {
    try {
        const cart = await Cart.findOne({ userId: req.user._id });
        if (!cart) return res.status(200).json({ success: true, data: { subtotal: 0, shippingFee: 0, total: 0, itemCount: 0 } });

        const validation = await validateAndCalculateCart(cart.items, true);
        
        // Update DB with latest summary
        cart.subtotal = validation.subtotal;
        cart.shippingFee = validation.shippingFee;
        cart.total = validation.total;
        await cart.save();

        res.status(200).json({
            success: true,
            isStockAdjusted: validation.isAdjusted,
            data: {
                subtotal: validation.subtotal,
                shippingFee: validation.shippingFee,
                total: validation.total,
                itemCount: validation.validatedItems.length
            }
        });
    } catch (error) {
        next(error);
    }
};
