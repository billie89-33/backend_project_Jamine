import Product from '../../models/product.model.js';

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
export const getProducts = async (req, res, next) => {
    try {
        const queryObj = {};

        // Helper to handle Array or String from query
        const getSingleValue = (val) => Array.isArray(val) ? val[0] : val;

        // 1. กรองตามหมวดหมู่
        if (req.query.category) {
            queryObj.category = getSingleValue(req.query.category);
        }

        // 2. กรองเฉพาะสินค้าที่มีในสต็อก
        if (req.query.inStock === 'true') {
            queryObj.stock = { $gt: 0 };
        }

        // 3. กรองตามช่วงราคา (Min - Max Price Input) - ป้องกัน NaN
        if (req.query.minPrice || req.query.maxPrice) {
            queryObj.price = {};
            const minP = Number(getSingleValue(req.query.minPrice));
            const maxP = Number(getSingleValue(req.query.maxPrice));
            
            if (!isNaN(minP)) queryObj.price.$gte = minP;
            if (!isNaN(maxP)) queryObj.price.$lte = maxP;
            
            // ถ้าพังทั้งคู่ ลบ field price ออกจาก query
            if (Object.keys(queryObj.price).length === 0) delete queryObj.price;
        }

        // 4. กรองตามคุณสมบัติพิเศษ (Specifications Map)
        if (req.query.switchType) {
            queryObj['specifications.switchType'] = getSingleValue(req.query.switchType);
        }
        if (req.query.layout) {
            queryObj['specifications.layout'] = getSingleValue(req.query.layout);
        }

        // 5. ระบบแบ่งหน้า (Pagination) - ป้องกัน Skip ติดลบ
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
        const skip = (page - 1) * limit;

        // ค้นหาข้อมูลพร้อมใช้งาน Pagination และ Field Selection + .lean() เพื่อประหยัด RAM
        const products = await Product.find(queryObj)
            .select('-specifications')
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Product.countDocuments(queryObj);

        res.status(200).json({
            success: true,
            count: products.length,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: products
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single product detail
// @route   GET /api/v1/products/:id
// @access  Public
export const getProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id).lean();

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
