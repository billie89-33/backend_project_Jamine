import Product from '../../../models/product.model.js';
import cloudinary from '../../../config/cloudinary.js';

// @desc    Create new product
// @route   POST /api/v1/admin/products
// @access  Private (Admin only)
export const createProduct = async (req, res, next) => {
    try {
        const productData = { ...req.body };

        // 1. Image handling (Multer)
        if (req.file) {
            productData.image = {
                url: req.file.path,
                publicId: req.file.filename
            };
        } else {
            const error = new Error('Please upload a product image');
            error.status = 400;
            throw error;
        }

        // 2. Specifications handling (Safe Parse)
        if (typeof productData.specifications === 'string') {
            productData.specifications = JSON.parse(productData.specifications);
        }

        // 3. Tags handling
        if (productData.tags && typeof productData.tags === 'string') {
            productData.tags = productData.tags.split(',').map(tag => tag.trim()).filter(Boolean);
        }

        const product = await Product.create(productData);
        res.status(201).json({ success: true, data: product });
    } catch (error) {
        if (req.file) await cloudinary.uploader.destroy(req.file.filename);
        next(error);
    }
};

// @desc    Update product (Partial Update)
// @route   PATCH /api/v1/admin/products/:id
// @access  Private (Admin only)
export const updateProduct = async (req, res, next) => {
    try {
        const updateData = { ...req.body };
        const productId = req.params.id;

        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
            const error = new Error('Product not found');
            error.status = 404;
            throw error;
        }

        // 1. Image Update Logic
        if (req.file) {
            if (existingProduct.image?.publicId) {
                await cloudinary.uploader.destroy(existingProduct.image.publicId);
            }
            updateData.image = { url: req.file.path, publicId: req.file.filename };
        }

        // 2. Specifications Dynamic Handling ($set and $unset)
        const unsetObj = {};
        if (updateData.specifications) {
            let specs = updateData.specifications;
            if (typeof specs === 'string') specs = JSON.parse(specs);

            for (const [key, value] of Object.entries(specs)) {
                if (value === null || value === '') {
                    // หากส่งค่าว่างมา ให้เตรียมลบ Key นั้นออกจาก Map ใน DB
                    unsetObj[`specifications.${key}`] = 1;
                } else {
                    // หากมีค่า ให้ใช้ Dot Notation เพื่อแก้เฉพาะ Key ย่อย
                    updateData[`specifications.${key}`] = String(value);
                }
            }
            delete updateData.specifications; // ลบตัวเดิมออกเพื่อไม่ให้ไปทับทั้ง Map
        }

        // 3. Tags handling
        if (updateData.tags && typeof updateData.tags === 'string') {
            updateData.tags = updateData.tags.split(',').map(tag => tag.trim()).filter(Boolean);
        }

        // 4. Update with both $set and $unset
        const product = await Product.findByIdAndUpdate(
            productId,
            { 
                $set: updateData,
                ...(Object.keys(unsetObj).length > 0 && { $unset: unsetObj })
            },
            { new: true, runValidators: true }
        );

        res.status(200).json({ success: true, data: product });
    } catch (error) {
        if (req.file) await cloudinary.uploader.destroy(req.file.filename);
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
