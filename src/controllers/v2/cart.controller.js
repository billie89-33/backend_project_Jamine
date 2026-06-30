import prisma from '../../config/prisma.js';
import { PRODUCT_STATUS } from '../../constants/index.js';
import { calculateTotals } from '../../utils/orderHelper.js';

/**
 * @desc    Helper function to calculate cart totals based on DB prices
 *          AND Validate/Adjust quantities against real-time stock and status
 */
const validateAndCalculateCart = async (items, autoAdjust = false) => {
    let subtotal = 0;
    let isAdjusted = false;
    const validatedItems = [];

    const productIds = items.map(item => item.productId);
    
    // ดึงข้อมูลสินค้าเฉพาะที่ active เท่านั้น
    const products = await prisma.product.findMany({
        where: {
            id: { in: productIds },
            status: PRODUCT_STATUS.ACTIVE
        }
    });
    
    const productMap = new Map(products.map(p => [p.id, p]));

    for (const item of items) {
        const prodId = item.productId;
        const product = productMap.get(prodId);
        
        if (product) {
            let finalQuantity = item.quantity;
            let stockStatus = 'available';

            if (product.stock < item.quantity) {
                isAdjusted = true;
                stockStatus = product.stock === 0 ? PRODUCT_STATUS.OUT_OF_STOCK : 'insufficient';
                if (autoAdjust) finalQuantity = product.stock;
            }

            if (finalQuantity > 0) {
                const itemTotal = product.price * finalQuantity;
                subtotal += itemTotal;
                
                validatedItems.push({
                    productId: product.id,
                    quantity: finalQuantity,
                    priceAtCalculation: product.price,
                    stockStatus: stockStatus,
                    availableStock: product.stock,
                    product: product // pass product data for formatting response
                });
            } else if (!autoAdjust && product.stock === 0) {
                validatedItems.push({
                    productId: product.id,
                    quantity: item.quantity,
                    priceAtCalculation: product.price,
                    stockStatus: PRODUCT_STATUS.OUT_OF_STOCK,
                    availableStock: product.stock,
                    product: product
                });
            }
        } else {
            // สินค้าหายไปจากระบบ ตะกร้าจะปรับตัวอัตโนมัติ
            isAdjusted = true;
        }
    }

    const totals = calculateTotals(subtotal);

    return { 
        validatedItems, 
        ...totals, 
        isAdjusted 
    };
};

const formatCartResponse = (cart, validation) => {
    return {
        id: cart.id,
        userId: cart.userId,
        subtotal: cart.subtotal,
        shippingFee: cart.shippingFee,
        total: cart.total,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
        items: validation.validatedItems.map(item => ({
            id: item.productId, // Mock object structure for frontend compatibility
            productId: {
                _id: item.product.id, // Frontend uses _id
                modelName: item.product.modelName,
                price: item.product.price,
                image: { url: item.product.imageUrl },
                stock: item.product.stock,
                status: item.product.status
            },
            quantity: item.quantity
        })),
        discount: validation.discount,
        totalAmount: cart.total
    };
};

// @desc    Get user cart
// @route   GET /api/v2/cart
export const getCart = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        
        let cart = await prisma.cart.findUnique({
            where: { userId },
            include: { items: true }
        });

        if (!cart) {
            cart = await prisma.cart.create({
                data: { userId },
                include: { items: true }
            });
            return res.status(200).json({ 
                success: true, 
                data: {
                    ...cart,
                    items: [],
                    discount: 0,
                    totalAmount: 0
                } 
            });
        }

        const validation = await validateAndCalculateCart(cart.items, true);
        
        const isChanged = validation.isAdjusted || cart.subtotal !== validation.subtotal || cart.total !== validation.total;

        if (isChanged) {
            cart = await prisma.cart.update({
                where: { id: cart.id },
                data: {
                    subtotal: validation.subtotal,
                    shippingFee: validation.shippingFee,
                    total: validation.total,
                    items: {
                        deleteMany: {}, // ลบของเก่าออกให้หมด
                        create: validation.validatedItems.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity
                        }))
                    }
                },
                include: { items: true }
            });
        }

        res.status(200).json({
            success: true,
            isStockAdjusted: validation.isAdjusted,
            data: formatCartResponse(cart, validation)
        });
    } catch (error) {
        next(error);
    }
};

const MAX_CART_ITEMS = 50;

// @desc    Add or Update item in cart
// @route   POST /api/v2/cart
export const addToCart = async (req, res, next) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.user.id || req.user._id;

        let cart = await prisma.cart.findUnique({
            where: { userId },
            include: { items: true }
        });

        if (!cart) {
            cart = await prisma.cart.create({
                data: { userId },
                include: { items: true }
            });
        }

        const itemIndex = cart.items.findIndex(item => item.productId === productId);
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
        const addedItem = validation.validatedItems.find(item => item.productId === productId);
        
        if (!addedItem && validation.validatedItems.length < cart.items.length) {
             return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (addedItem && addedItem.quantity < targetQuantity) {
            return res.status(400).json({ 
                success: false, 
                message: `สินค้าในสต็อกมีไม่เพียงพอ (คลังเหลือรวมทั้งหมดแค่ ${addedItem.availableStock} ชิ้น)`,
                availableStock: addedItem.availableStock
            });
        }

        // Save changes cleanly using Prisma transaction-like update
        cart = await prisma.cart.update({
            where: { id: cart.id },
            data: {
                subtotal: validation.subtotal,
                shippingFee: validation.shippingFee,
                total: validation.total,
                items: {
                    deleteMany: {}, 
                    create: validation.validatedItems.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity
                    }))
                }
            },
            include: { items: true }
        });

        res.status(200).json({
            success: true,
            isStockAdjusted: validation.isAdjusted,
            data: formatCartResponse(cart, validation)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update item quantity (Absolute value)
// @route   PATCH /api/v2/cart/update-quantity
export const updateCartQuantity = async (req, res, next) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.user.id || req.user._id;

        const cart = await prisma.cart.findUnique({
            where: { userId },
            include: { items: true }
        });

        if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

        const itemIndex = cart.items.findIndex(item => item.productId === productId);
        if (itemIndex === -1) return res.status(404).json({ success: false, message: 'Item not in cart' });

        if (quantity <= 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            cart.items[itemIndex].quantity = quantity;
        }

        const validation = await validateAndCalculateCart(cart.items, true);
        const updatedItem = validation.validatedItems.find(item => item.productId === productId);
        
        if (quantity > 0 && (!updatedItem || updatedItem.quantity < quantity)) {
            return res.status(400).json({
                success: false,
                message: `สินค้าในสต็อกมีไม่เพียงพอ`,
                availableStock: updatedItem ? updatedItem.availableStock : 0
            });
        }

        const updatedCart = await prisma.cart.update({
            where: { id: cart.id },
            data: {
                subtotal: validation.subtotal,
                shippingFee: validation.shippingFee,
                total: validation.total,
                items: {
                    deleteMany: {}, 
                    create: validation.validatedItems.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity
                    }))
                }
            },
            include: { items: true }
        });

        res.status(200).json({
            success: true,
            isStockAdjusted: validation.isAdjusted,
            data: formatCartResponse(updatedCart, validation)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Remove item from cart
// @route   DELETE /api/v2/cart/:productId
export const removeFromCart = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        const cart = await prisma.cart.findUnique({
            where: { userId },
            include: { items: true }
        });

        if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

        const targetProductId = req.params.productId;
        const isItemExist = cart.items.some(item => item.productId === targetProductId);
        
        if (!isItemExist) {
            return res.status(404).json({ success: false, message: 'Product not found in your cart' });
        }

        cart.items = cart.items.filter(item => item.productId !== targetProductId);
        const validation = await validateAndCalculateCart(cart.items, true);
        
        const updatedCart = await prisma.cart.update({
            where: { id: cart.id },
            data: {
                subtotal: validation.subtotal,
                shippingFee: validation.shippingFee,
                total: validation.total,
                items: {
                    deleteMany: {}, 
                    create: validation.validatedItems.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity
                    }))
                }
            },
            include: { items: true }
        });

        res.status(200).json({
            success: true,
            isStockAdjusted: validation.isAdjusted,
            data: formatCartResponse(updatedCart, validation)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get Cart Summary
// @route   GET /api/v2/cart/summary
export const getCartSummary = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        const cart = await prisma.cart.findUnique({
            where: { userId },
            include: { items: true }
        });

        if (!cart) return res.status(200).json({ success: true, data: { subtotal: 0, shippingFee: 0, discount: 0, total: 0, totalAmount: 0, itemCount: 0 } });

        const validation = await validateAndCalculateCart(cart.items, true);
        
        await prisma.cart.update({
            where: { id: cart.id },
            data: {
                subtotal: validation.subtotal,
                shippingFee: validation.shippingFee,
                total: validation.total,
                items: {
                    deleteMany: {}, 
                    create: validation.validatedItems.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity
                    }))
                }
            }
        });

        const totalPieces = validation.validatedItems.reduce((sum, item) => sum + item.quantity, 0);

        res.status(200).json({
            success: true,
            isStockAdjusted: validation.isAdjusted,
            data: {
                subtotal: cart.subtotal,
                shippingFee: cart.shippingFee,
                discount: validation.discount,
                total: cart.total,
                totalAmount: cart.total,
                itemCount: totalPieces 
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Clear entire cart
// @route   DELETE /api/v2/cart/clear
export const clearCart = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        const cart = await prisma.cart.findUnique({ where: { userId } });
        
        if (cart) {
            await prisma.cart.update({
                where: { id: cart.id },
                data: {
                    subtotal: 0,
                    shippingFee: 0,
                    total: 0,
                    items: { deleteMany: {} }
                }
            });
        }

        res.status(200).json({
            success: true,
            message: 'ล้างตะกร้าสินค้าเรียบร้อยแล้ว'
        });
    } catch (error) {
        next(error);
    }
};
