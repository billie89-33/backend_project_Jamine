import Cart from '../../models/cart.model.js';
import Product from '../../models/product.model.js';

/**
 * @desc    Helper function to calculate cart totals based on DB prices
 * @param   {Array} items - Array of items { productId, quantity }
 * @returns {Object} - { items, subtotal, shippingFee, total }
 */
const calculateCartTotals = async (items) => {
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
        const product = await Product.findById(item.productId);
        if (product) {
            // Secure Price Verification: Use price from DB, not from request
            const itemTotal = product.price * item.quantity;
            subtotal += itemTotal;
            validatedItems.push({
                productId: product._id,
                quantity: item.quantity,
                priceAtCalculation: product.price // Optional: snapshot price
            });
        }
    }

    // Shipping: 50 THB, free if subtotal >= 1000 THB
    const shippingFee = subtotal >= 1000 || subtotal === 0 ? 0 : 50;
    const total = subtotal + shippingFee;

    return { items: validatedItems, subtotal, shippingFee, total };
};

// @desc    Get user cart
// @route   GET /api/v1/cart
// @access  Private
export const getCart = async (req, res, next) => {
    try {
        let cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');

        if (!cart) {
            // Create empty cart if not exists
            cart = await Cart.create({ userId: req.user._id, items: [] });
        }

        res.status(200).json({
            success: true,
            data: cart
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add or Update item in cart
// @route   POST /api/v1/cart
// @access  Private
export const addToCart = async (req, res, next) => {
    try {
        const { productId, quantity } = req.body;

        // 1. Real-time Stock Validation
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (product.stock < quantity) {
            return res.status(400).json({ 
                success: false, 
                message: `สินค้าในสต็อกมีไม่เพียงพอ (เหลืออยู่ ${product.stock} ชิ้น)`,
                availableStock: product.stock
            });
        }

        let cart = await Cart.findOne({ userId: req.user._id });
        if (!cart) {
            cart = new Cart({ userId: req.user._id, items: [] });
        }

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (itemIndex > -1) {
            // If item exists, update quantity
            // Check stock again for the combined quantity
            const newQuantity = quantity; // We assume front-end sends absolute quantity for update
            if (product.stock < newQuantity) {
                 return res.status(400).json({ 
                    success: false, 
                    message: `สินค้าในสต็อกมีไม่เพียงพอ (เหลืออยู่ ${product.stock} ชิ้น)`,
                    availableStock: product.stock
                });
            }
            cart.items[itemIndex].quantity = newQuantity;
        } else {
            // New item
            cart.items.push({ productId, quantity });
        }

        // 2. Dynamic Price Calculation
        const totals = await calculateCartTotals(cart.items);
        cart.items = totals.items;
        cart.subtotal = totals.subtotal;
        cart.shippingFee = totals.shippingFee;
        cart.total = totals.total;

        await cart.save();

        res.status(200).json({
            success: true,
            data: cart
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
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Real-time Stock Validation
        if (product.stock < quantity) {
            return res.status(400).json({ 
                success: false, 
                message: `สินค้าในสต็อกมีไม่เพียงพอ (เหลืออยู่ ${product.stock} ชิ้น)`,
                availableStock: product.stock
            });
        }

        const cart = await Cart.findOne({ userId: req.user._id });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Item not in cart' });
        }

        cart.items[itemIndex].quantity = quantity;

        // Dynamic Price Calculation
        const totals = await calculateCartTotals(cart.items);
        cart.items = totals.items;
        cart.subtotal = totals.subtotal;
        cart.shippingFee = totals.shippingFee;
        cart.total = totals.total;

        await cart.save();

        res.status(200).json({
            success: true,
            data: cart
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

        const totals = await calculateCartTotals(cart.items);
        cart.subtotal = totals.subtotal;
        cart.shippingFee = totals.shippingFee;
        cart.total = totals.total;

        await cart.save();

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
// @access  Private
export const getCartSummary = async (req, res, next) => {
    try {
        const cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
        if (!cart) return res.status(200).json({ success: true, data: { items: [], subtotal: 0, total: 0 } });

        // Force recalculation to ensure current DB prices
        const totals = await calculateCartTotals(cart.items);
        
        res.status(200).json({
            success: true,
            data: {
                subtotal: totals.subtotal,
                shippingFee: totals.shippingFee,
                total: totals.total,
                itemCount: cart.items.length
            }
        });
    } catch (error) {
        next(error);
    }
};
