import NewsCategory from '../../../models/newsCategory.model.js';

/**
 * @desc    Get all news categories (Admin)
 * @route   GET /api/v1/admin/news-categories
 */
export const getAdminCategories = async (req, res, next) => {
    try {
        const categories = await NewsCategory.find().sort('name').lean();
        res.status(200).json({ success: true, data: categories });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create new news category
 * @route   POST /api/v1/admin/news-categories
 */
export const createCategory = async (req, res, next) => {
    try {
        const { name, description } = req.body;

        // 🛡️ Logic สร้าง Slug ที่รองรับภาษาไทยแบบ 100%
        let slug = name.trim().toLowerCase()
            .replace(/\s+/g, '-')           // เปลี่ยนช่องว่างเป็นขีดกลาง
            .replace(/[^\u0E00-\u0E7F\w-]+/g, ''); // เก็บแค่ ไทย, อังกฤษ, ตัวเลข, ขีดกลาง

        // 🚨 ป้องกันกรณี slug ว่าง (ถ้าใส่แต่สัญลักษณ์พิเศษ)
        const finalSlug = slug || `category-${Date.now()}`;

        const category = await NewsCategory.create({
            name,
            slug: finalSlug,
            description
        });

        res.status(201).json({ success: true, data: category });
    } catch (error) {
        if (error.code === 11000) {
            const err = new Error('ชื่อหมวดหมู่นี้หรือ URL นี้ถูกใช้งานแล้ว');
            err.status = 400;
            return next(err);
        }
        next(error);
    }
};

/**
 * @desc    Update news category
 * @route   PATCH /api/v1/admin/news-categories/:id
 */
export const updateCategory = async (req, res, next) => {
    try {
        const { name, description } = req.body;
        const updateData = { description };

        if (name) {
            updateData.name = name;
            // 🛡️ Logic สร้าง Slug ที่รองรับภาษาไทย
            let slug = name.trim().toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\u0E00-\u0E7F\w-]+/g, '');
            
            updateData.slug = slug || `category-${Date.now()}`;
        }

        const category = await NewsCategory.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!category) {
            const error = new Error('ไม่พบหมวดหมู่นี้');
            error.status = 404;
            return next(error);
        }

        res.status(200).json({ success: true, data: category });
    } catch (error) {
        if (error.code === 11000) {
            const err = new Error('ชื่อหมวดหมู่หรือ URL นี้ถูกใช้งานแล้ว');
            err.status = 400;
            return next(err);
        }
        next(error);
    }
};

/**
 * @desc    Delete news category
 * @route   DELETE /api/v1/admin/news-categories/:id
 */
export const deleteCategory = async (req, res, next) => {
    try {
        const category = await NewsCategory.findByIdAndDelete(req.params.id);

        if (!category) {
            const error = new Error('ไม่พบหมวดหมู่นี้');
            error.status = 404;
            return next(error);
        }

        res.status(200).json({ success: true, message: 'ลบหมวดหมู่เรียบร้อยแล้ว' });
    } catch (error) {
        next(error);
    }
};
