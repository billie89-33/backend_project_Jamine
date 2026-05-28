import Product from '../../../models/product.model.js';
import cloudinary from '../../../config/cloudinary.js';

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

        // 1. ตรวจสอบการอัปเดตรูปภาพใหม่เพื่อลบรูปเก่าใน Cloudinary (Storage Leak Fix)
        if (updateData.image && updateData.image.publicId) {
            const oldProduct = await Product.findById(req.params.id).select('image').lean();
            if (oldProduct && oldProduct.image && oldProduct.image.publicId !== updateData.image.publicId) {
                // ลบรูปเก่าทิ้งจาก Cloud
                await cloudinary.uploader.destroy(oldProduct.image.publicId);
            }
        }

        // 2. แปลงข้อมูล specifications Map ให้อยู่ในรูป Dot Notation (Partial Update Rule)
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
            const error = new Error('Product not found');
            error.status = 404;
            return next(error);
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
        const product = await Product.findById(req.params.id);

        if (!product) {
            const error = new Error('Product not found');
            error.status = 404;
            return next(error);
        }

        // 1. ลบรูปภาพออกจาก Cloudinary ทันที (Storage Leak Fix)
        if (product.image && product.image.publicId) {
            await cloudinary.uploader.destroy(product.image.publicId);
        }

        // 2. ลบข้อมูลใน Database
        await product.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
