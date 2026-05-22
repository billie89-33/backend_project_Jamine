import Product from '../../models/product.model.js';

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
export const getProducts = async (req, res, next) => {
    try {
        const products = await Product.find();
        res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Public
export const getProduct = async (req, res, next) => {
    try {
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Product ID format'
            });
        }

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new product
// @route   POST /api/v1/products
// @access  Private (Admin only)
export const createProduct = async (req, res, next) => {
    try {
        const product = await Product.create(req.body);
        res.status(201).json({
            success: true,
            data: product
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private (Admin only)
export const updateProduct = async (req, res, next) => {
    try {
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Product ID format'
            });
        }

        const updateData = { ...req.body };

        // แปลงข้อมูล specifications ให้เป็น Dot Notation เพื่ออัปเดตเฉพาะฟิลด์ย่อย
        if (updateData.specifications) {
            for (const [key, value] of Object.entries(updateData.specifications)) {
                updateData[`specifications.${key}`] = value;
            }
            delete updateData.specifications; // ลบเพื่อป้องกันการเขียนทับทั้ง Object
        }

        const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private (Admin only)
export const deleteProduct = async (req, res, next) => {
    try {
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Product ID format'
            });
        }

        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
