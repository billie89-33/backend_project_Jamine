import Product from '../../models/product.model.js';

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
export const getProducts = async (req, res, next) => {
    try {
        const queryObj = {};

        // 1. กรองตามหมวดหมู่ (เมื่อกดจาก Navbar / Carousel ด้านบน)
        if (req.query.category) {
            queryObj.category = req.query.category;
        }

        // 2. กรองเฉพาะสินค้าที่มีในสต็อก (Checkbox: มีในสต็อก)
        if (req.query.inStock === 'true') {
            queryObj.stock = { $gt: 0 }; // สต็อกต้องมากกว่า 0
        }

        // 3. กรองตามช่วงราคา (Min - Max Price Input)
        if (req.query.minPrice || req.query.maxPrice) {
            queryObj.price = {};
            if (req.query.minPrice) queryObj.price.$gte = Number(req.query.minPrice); // ราคาตั้งแต่...
            if (req.query.maxPrice) queryObj.price.$lte = Number(req.query.maxPrice); // ราคาไม่เกิน...
        }

        // 4. กรองตามคุณสมบัติพิเศษ (Specifications Map)
        if (req.query.switchType) {
            queryObj['specifications.switchType'] = req.query.switchType;
        }
        if (req.query.layout) {
            queryObj['specifications.layout'] = req.query.layout;
        }

        // 5. ระบบแบ่งหน้า (Pagination) เพื่อป้องกันปัญหา RAM เต็ม (Crash)
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10; // ค่าเริ่มต้นดึงมา 10 รายการต่อหน้า
        const skip = (page - 1) * limit;

        // ค้นหาข้อมูลพร้อมใช้งาน Pagination และ Field Selection
        const products = await Product.find(queryObj)
            .select('-specifications') // ไม่ดึงฟิลด์ specifications มาในหน้ารวม เพื่อลดการใช้ RAM และ Bandwidth
            .skip(skip)
            .limit(limit);

        // นับจำนวนสินค้าทั้งหมดที่ตรงตามเงื่อนไข (เพื่อนำไปสร้างปุ่มแบ่งหน้าฝั่ง Frontend)
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

// @desc    Update product (Partial Update)
// @route   PATCH /api/v1/products/:id
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
// @route   DELETE /api/v1/products/:id
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
