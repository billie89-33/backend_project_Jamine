import prisma from '../../../config/prisma.js';
import cloudinary from '../../../config/cloudinary.js';
import { CATEGORIES } from '../../../constants/index.js';

// Helper for Data Normalization
const normalizeProductData = (data) => {
    const fieldsToNormalize = ['brand', 'category'];
    const abbreviations = ['RAM', 'CPU', 'GPU', 'VGA', 'SSD', 'HDD', 'RGB', 'PSU', 'UPS'];

    fieldsToNormalize.forEach(field => {
        if (data[field]) {
            let val = data[field].trim();

            const upperVal = val.toUpperCase();
            if (abbreviations.includes(upperVal)) {
                data[field] = upperVal;
            } else {
                data[field] = val.split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
            }

            if (field === 'category') {
                const matchedCategory = CATEGORIES.find(
                    c => c.toLowerCase() === val.toLowerCase()
                );
                if (matchedCategory) data[field] = matchedCategory;
            }
        }
    });
    return data;
};

// @desc    Get all products (Admin version - sees all statuses)
// @route   GET /api/v2/admin/products
// @access  Private (Admin only)
export const getAdminProducts = async (req, res, next) => {
    try {
        const where = {};

        if (req.query.status) where.status = req.query.status;
        if (req.query.category) where.category = { equals: req.query.category, mode: 'insensitive' };
        if (req.query.isFeatured) where.isFeatured = req.query.isFeatured === 'true';

        if (req.query.keyword) {
            const keyword = req.query.keyword;
            where.OR = [
                { modelName: { contains: keyword, mode: 'insensitive' } },
                { brand: { contains: keyword, mode: 'insensitive' } },
                { sku: { contains: keyword, mode: 'insensitive' } }
            ];
        }

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 12;
        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.product.count({ where })
        ]);

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
// @route   POST /api/v2/admin/products
// @access  Private (Admin only)
export const createProduct = async (req, res, next) => {
    try {
        let productData = { ...req.body };
        productData = normalizeProductData(productData);

        if (req.file) {
            productData.imageUrl = req.file.path;
            productData.imagePublicId = req.file.filename;
        } else {
            const error = new Error('Please upload a product image');
            error.status = 400;
            throw error;
        }

        if (typeof productData.specifications === 'string') {
            productData.specifications = JSON.parse(productData.specifications);
        }

        if (productData.tags && typeof productData.tags === 'string') {
            try {
                const parsedTags = JSON.parse(productData.tags);
                productData.tags = Array.isArray(parsedTags) ? parsedTags : [parsedTags];
            } catch (e) {
                productData.tags = productData.tags.split(',').map(tag => tag.trim()).filter(Boolean);      
            }
        }

        if (productData.price !== undefined) productData.price = Number(productData.price);
        if (productData.stock !== undefined) productData.stock = Number(productData.stock);
        if (productData.isFeatured !== undefined) {
            productData.isFeatured = productData.isFeatured === 'true' || productData.isFeatured === true;  
        }

        const product = await prisma.product.create({ data: productData });
        res.status(201).json({ success: true, data: product });
    } catch (error) {
        if (req.file) await cloudinary.uploader.destroy(req.file.filename);
        next(error);
    }
};

// @desc    Update product (Partial Update)
// @route   PATCH /api/v2/admin/products/:id
// @access  Private (Admin only)
export const updateProduct = async (req, res, next) => {
    try {
        const productId = req.params.id;
        const existingProduct = await prisma.product.findUnique({ where: { id: productId } });

        if (!existingProduct) {
            const error = new Error('Product not found');
            error.status = 404;
            throw error;
        }

        const updateData = {};
        const normalizedBody = normalizeProductData({ ...req.body });

        let oldPublicId = null;
        if (req.file) {
            if (existingProduct.imagePublicId) {
                oldPublicId = existingProduct.imagePublicId;
            }
            updateData.imageUrl = req.file.path;
            updateData.imagePublicId = req.file.filename;
        }

        if (req.body.specifications) {
            let specs = req.body.specifications;
            if (typeof specs === 'string') specs = JSON.parse(specs);
            
            // In Prisma, we can just merge JSON objects
            let existingSpecs = existingProduct.specifications || {};
            if (typeof existingSpecs === 'string') existingSpecs = JSON.parse(existingSpecs);

            for (let [key, value] of Object.entries(specs)) {
                if (value === null || value === '') {
                    delete existingSpecs[key];
                } else {
                    existingSpecs[key] = String(value);
                }
            }
            updateData.specifications = existingSpecs;
        }

        if (req.body.tags) {
            try {
                const parsedTags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
                updateData.tags = Array.isArray(parsedTags) ? parsedTags : [parsedTags];
            } catch (e) {
                updateData.tags = req.body.tags.split(',').map(tag => tag.trim()).filter(Boolean);
            }
        }

        const fields = ['brand', 'modelName', 'description', 'sku', 'price', 'stock', 'category', 'status', 'isFeatured'];
        fields.forEach(field => {
            if (normalizedBody[field] !== undefined) {
                let val = normalizedBody[field];
                if (field === 'price' || field === 'stock') val = Number(val);
                if (field === 'isFeatured') val = (val === 'true' || val === true);
                updateData[field] = val;
            }
        });

        if (Object.keys(updateData).length === 0) {
            return res.status(200).json({ success: true, data: existingProduct, message: 'No changes detected' });
        }

        const product = await prisma.product.update({
            where: { id: productId },
            data: updateData
        });

        if (oldPublicId) {
            try {
                await cloudinary.uploader.destroy(oldPublicId);
            } catch (cloudErr) {
                console.error("Cloudinary Delete Error:", cloudErr);
            }
        }

        res.status(200).json({ success: true, data: product });
    } catch (error) {
        if (req.file) {
            try { await cloudinary.uploader.destroy(req.file.filename); } catch (e) {}
        }
        next(error);
    }
};

// @desc    Delete product
// @route   DELETE /api/v2/admin/products/:id
// @access  Private (Admin only)
export const deleteProduct = async (req, res, next) => {
    try {
        const product = await prisma.product.findUnique({ where: { id: req.params.id } });

        if (!product) {
            const error = new Error('Product not found');
            error.status = 404;
            return next(error);
        }

        if (product.imagePublicId) {
            await cloudinary.uploader.destroy(product.imagePublicId);
        }

        await prisma.product.delete({ where: { id: req.params.id } });

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
