import Product from '../../models/product.model.js';

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
export const getProducts = async (req, res, next) => {
    try {
        // 1. กรองเฉพาะสินค้าที่สถานะเป็น 'active' เท่านั้น (Public)
        const queryObj = { status: 'active' };

        // 2. กรองตามหมวดหมู่หลัก (Category)
        if (req.query.category) {
            queryObj.category = req.query.category;
        }

        // 3. กรองสินค้าแนะนำ (isFeatured)
        if (req.query.isFeatured) {
            queryObj.isFeatured = req.query.isFeatured === 'true';
        }

        // 4. กรองเฉพาะสินค้าที่มีในสต็อก (In Stock)
        if (req.query.inStock === 'true') {
            queryObj.stock = { $gt: 0 };
        }

        // 5. ระบบค้นหาด้วยข้อความ (Search Keyword)
        if (req.query.keyword) {
            const keyword = req.query.keyword;
            queryObj.$or = [
                { modelName: { $regex: keyword, $options: 'i' } },
                { brand: { $regex: keyword, $options: 'i' } },
                { tags: { $regex: keyword, $options: 'i' } },
                { description: { $regex: keyword, $options: 'i' } }
            ];
        }

        // 6. กรองตามช่วงราคา (Price Range: minPrice, maxPrice)
        if (req.query.minPrice || req.query.maxPrice) {
            queryObj.price = {};
            const minP = Number(req.query.minPrice);
            const maxP = Number(req.query.maxPrice);

            if (!isNaN(minP)) queryObj.price.$gte = minP;
            if (!isNaN(maxP)) queryObj.price.$lte = maxP;

            if (Object.keys(queryObj.price).length === 0) delete queryObj.price;
        }

        // 7. 🌟 Dynamic Specifications Filter
        Object.keys(req.query).forEach(key => {
            if (key.startsWith('spec_')) {
                const specName = key.replace('spec_', '');
                const specValue = req.query[key];
                const valuesArray = Array.isArray(specValue) ? specValue : [specValue];

                queryObj[`specifications.${specName}`] = {
                    $in: valuesArray.map(val => new RegExp(val, 'i'))
                };
            }
        });

        // 6. ระบบแบ่งหน้า (Pagination)
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, parseInt(req.query.limit, 10) || 12);
        const skip = (page - 1) * limit;

        // 7. ระบบเรียงลำดับ (Sorting)
        let sortBy = '-createdAt'; // ค่าเริ่มต้น: ใหม่สุดไปเก่าสุด
        if (req.query.sort === 'price_asc') sortBy = 'price';
        if (req.query.sort === 'price_desc') sortBy = '-price';
        if (req.query.sort === 'oldest') sortBy = 'createdAt';

        // ค้นหาข้อมูลพร้อมใช้งาน Pagination และ Sorting
        // นำ .select('-specifications') ออกตามแผน เพื่อให้ Frontend มีข้อมูลวาด UI
        const products = await Product.find(queryObj)
            .sort(sortBy)
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
