import Product from '../../../models/product.model.js';
import cloudinary from '../../../config/cloudinary.js';

// @desc    Get all products (Admin version - sees all statuses)
// @route   GET /api/v1/admin/products
// @access  Private (Admin only)
export const getAdminProducts = async (req, res, next) => {
    try {
        const queryObj = {};

        // Admin can filter by any status
        if (req.query.status) queryObj.status = req.query.status;
        if (req.query.category) queryObj.category = req.query.category;
        if (req.query.isFeatured) queryObj.isFeatured = req.query.isFeatured === 'true';

        if (req.query.keyword) {
            const regex = { $regex: req.query.keyword, $options: 'i' };
            queryObj.$or = [
                { modelName: regex },
                { brand: regex },
                { sku: regex }
            ];
        }

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 12;
        const skip = (page - 1) * limit;

        const products = await Product.find(queryObj)
            .sort('-createdAt')
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Product.countDocuments(queryObj);

        res.status(200).json({
            success: true,
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            data: products
        });
    } catch (error) {
        next(error);
    }
};

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

        // 3. Tags handling (Safe Parse)
        if (productData.tags && typeof productData.tags === 'string') {
            try {
                const parsedTags = JSON.parse(productData.tags);
                productData.tags = Array.isArray(parsedTags) ? parsedTags : [parsedTags];
            } catch (e) {
                productData.tags = productData.tags.split(',').map(tag => tag.trim()).filter(Boolean);
            }
        }

        // 4. Data Normalization (Final casting before DB)
        if (productData.price !== undefined) productData.price = Number(productData.price);
        if (productData.stock !== undefined) productData.stock = Number(productData.stock);
        if (productData.isFeatured !== undefined) {
            productData.isFeatured = productData.isFeatured === 'true' || productData.isFeatured === true;
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
                    unsetObj[`specifications.${key}`] = 1;
                } else {
                    updateData[`specifications.${key}`] = String(value);
                }
            }
            delete updateData.specifications;
        }

        // 3. Tags handling (Safe Parse)
        if (updateData.tags && typeof updateData.tags === 'string') {
            try {
                const parsedTags = JSON.parse(updateData.tags);
                updateData.tags = Array.isArray(parsedTags) ? parsedTags : [parsedTags];
            } catch (e) {
                updateData.tags = updateData.tags.split(',').map(tag => tag.trim()).filter(Boolean);
            }
        }

        // 4. Data Normalization (Final casting before DB)
        if (updateData.price !== undefined) updateData.price = Number(updateData.price);
        if (updateData.stock !== undefined) updateData.stock = Number(updateData.stock);
        if (updateData.isFeatured !== undefined) {
            updateData.isFeatured = updateData.isFeatured === 'true' || updateData.isFeatured === true;
        }

        // 5. Update with both $set and $unset
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

        if (product.image && product.image.publicId) {
            await cloudinary.uploader.destroy(product.image.publicId);
        }

        await product.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
