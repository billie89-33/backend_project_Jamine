import Product from '../../../models/product.model.js';

// @desc    Create new product
// @route   POST /api/v1/admin/products
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

// @desc    Update product (Partial Update)
// @route   PATCH /api/v1/admin/products/:id
// @access  Private (Admin only)
export const updateProduct = async (req, res, next) => {
    try {
        const updateData = { ...req.body };

        // Handle nested specifications Map update using Dot Notation
        if (updateData.specifications && typeof updateData.specifications === 'object') {
            for (const [key, value] of Object.entries(updateData.specifications)) {
                updateData[`specifications.${key}`] = value;
            }
            delete updateData.specifications;
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            {
                new: true,
                runValidators: true
            }
        );

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
// @route   DELETE /api/v1/admin/products/:id
// @access  Private (Admin only)
export const deleteProduct = async (req, res, next) => {
    try {
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
