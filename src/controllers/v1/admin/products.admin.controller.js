import Product from '../../../models/product.model.js';
import cloudinary from '../../../config/cloudinary.js';
import { CATEGORIES } from '../../../constants/index.js';

// Helper for Data Normalization
const normalizeProductData = (data) => {
    // 1. Normalize Brand & Category
    const fieldsToNormalize = ['brand', 'category'];
    const abbreviations = ['RAM', 'CPU', 'GPU', 'VGA', 'SSD', 'HDD', 'RGB', 'PSU', 'UPS'];

    fieldsToNormalize.forEach(field => {
        if (data[field]) {
            let val = data[field].trim();

            // Check if it's an abbreviation
            const upperVal = val.toUpperCase();
            if (abbreviations.includes(upperVal)) {
                data[field] = upperVal;
            } else {
                // Title Case: "gaming mouse" -> "Gaming Mouse"
                data[field] = val.split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
            }

            // Sync with CATEGORIES enum if exists (canonical version)
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

/**
 * 🛡️ Helper for sanitizing specification keys
 * MongoDB forbids dots (.) in field names (and Map keys).
 * We replace dots with a full-width dot (．) which is visually similar but safe.
 */
const sanitizeSpecKeys = (specs) => {
    if (!specs || typeof specs !== 'object') return specs;
    return Object.entries(specs).reduce((acc, [key, value]) => {
        const safeKey = key.replace(/\./g, '\uFF0E');
        acc[safeKey] = value;
        return acc;
    }, {});
};

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
        let productData = { ...req.body };

        // 0. Data Normalization
        productData = normalizeProductData(productData);

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

        // 2. Specifications handling (Safe Parse & Sanitize)
        if (typeof productData.specifications === 'string') {
            productData.specifications = JSON.parse(productData.specifications);
        }
        // 🛡️ Sanitize keys for MongoDB compatibility
        productData.specifications = sanitizeSpecKeys(productData.specifications);

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
        const productId = req.params.id;
        const existingProduct = await Product.findById(productId);

        if (!existingProduct) {
            const error = new Error('Product not found');
            error.status = 404;
            throw error;
        }

        // 🛡️ สร้าง Object สำหรับเก็บเฉพาะข้อมูลที่จะเปลี่ยนจริงๆ
        const updateData = {};
        const unsetObj = {};

        // 0. Data Normalization (for brand/category if they exist in body)
        const normalizedBody = normalizeProductData({ ...req.body });

        // 1. Image Update (ถ้ามีไฟล์ใหม่มา)
        if (req.file) {
            if (existingProduct.image?.publicId) {
                try {
                    await cloudinary.uploader.destroy(existingProduct.image.publicId);
                } catch (e) { console.error("Cloudinary Delete Error:", e); }
            }
            updateData.image = { url: req.file.path, publicId: req.file.filename };
        }

        // 2. Specifications Dynamic Handling
        if (req.body.specifications) {
            let specs = req.body.specifications;
            if (typeof specs === 'string') specs = JSON.parse(specs);

            for (let [key, value] of Object.entries(specs)) {
                // 🛡️ Sanitize key: MongoDB doesn't allow dots in keys
                key = key.replace(/\./g, '\uFF0E');

                if (value === null || value === '') {
                    unsetObj[`specifications.${key}`] = 1;
                } else {
                    updateData[`specifications.${key}`] = String(value);
                }
            }
        }

        // 3. Tags Handling
        if (req.body.tags) {
            try {
                const parsedTags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
                updateData.tags = Array.isArray(parsedTags) ? parsedTags : [parsedTags];
            } catch (e) {
                updateData.tags = req.body.tags.split(',').map(tag => tag.trim()).filter(Boolean);
            }
        }

        // 4. Map อื่นๆ ที่เหลือจาก req.body (สกัดเอาเฉพาะฟิลด์ที่มีค่ามาจริงๆ)
        const fields = ['brand', 'modelName', 'description', 'sku', 'price', 'stock', 'category', 'status', 'isFeatured'];
        fields.forEach(field => {
            if (normalizedBody[field] !== undefined) {
                let val = normalizedBody[field];
                if (field === 'price' || field === 'stock') val = Number(val);
                if (field === 'isFeatured') val = (val === 'true' || val === true);
                updateData[field] = val;
            }
        });

        // 5. ⚡ หัวใจการแก้ไข: ใช้ findByIdAndUpdate แบบแยก $set และ $unset
        // และ 'context: query' เพื่อให้ validator รู้ว่าเป็นอัปเดตเฉพาะจุด
        const updateQuery = {};
        if (Object.keys(updateData).length > 0) updateQuery.$set = updateData;
        if (Object.keys(unsetObj).length > 0) updateQuery.$unset = unsetObj;

        if (Object.keys(updateQuery).length === 0) {
            return res.status(200).json({ success: true, data: existingProduct, message: 'No changes detected' });
        }

        const product = await Product.findByIdAndUpdate(
            productId,
            updateQuery,
            {
                new: true,
                runValidators: true,
                context: 'query' // 🔥 สำคัญ: บอก Mongoose ว่านี่คือ Query Validation ไม่ใช่การสร้างใหม่
            }
        );

        res.status(200).json({ success: true, data: product });
    } catch (error) {
        if (req.file) {
            try { await cloudinary.uploader.destroy(req.file.filename); } catch (e) {}
        }
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
