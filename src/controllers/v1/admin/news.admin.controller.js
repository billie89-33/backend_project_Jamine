import News from '../../../models/news.model.js';
import cloudinary from '../../../config/cloudinary.js';

/**
 * @desc    Get all news (Admin)
 * @route   GET /api/v1/admin/news
 */
export const getAdminNews = async (req, res, next) => {
    try {
        const { limit, categoryId, isPublished, keyword } = req.query;
        let query = {};

        if (keyword) {
            const regex = new RegExp(keyword, 'i');
            query.title = regex;
        }

        if (categoryId && categoryId !== 'All') query.category = categoryId;
        if (isPublished) query.isPublished = isPublished === 'true';

        const news = await News.find(query)
            .populate('category', 'name slug')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit) || 100)
            .lean();

        res.status(200).json({ success: true, data: news });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create new news
 * @route   POST /api/v1/admin/news
 */
export const createNews = async (req, res, next) => {
    try {
        const newsData = { ...req.body };

        // 1. Image handling (Single-step Upload)
        if (req.file) {
            newsData.image = {
                url: req.file.path,
                publicId: req.file.filename
            };
        } else if (!newsData.image || !newsData.image.url) {
            const error = new Error('กรุณาอัปโหลดรูปภาพปกข่าว');
            error.status = 400;
            throw error;
        }

        // 2. Type Conversion (FormData sends strings)
        if (newsData.isPublished !== undefined) {
            newsData.isPublished = newsData.isPublished === 'true' || newsData.isPublished === true;
        }

        const news = await News.create(newsData);
        res.status(201).json({ success: true, data: news });
    } catch (error) {
        // Atomic Cleanup
        if (req.file) await cloudinary.uploader.destroy(req.file.filename);
        next(error);
    }
};

/**
 * @desc    Update news (Whitelisted)
 * @route   PATCH /api/v1/admin/news/:id
 */
export const updateNews = async (req, res, next) => {
    try {
        const updateData = { ...req.body };
        const news = await News.findById(req.params.id);

        if (!news) {
            const error = new Error('ไม่พบข่าวนี้');
            error.status = 404;
            throw error;
        }

        // 1. Image Update Logic
        if (req.file) {
            // Delete old image if exists
            if (news.image && news.image.publicId) {
                await cloudinary.uploader.destroy(news.image.publicId);
            }
            updateData.image = {
                url: req.file.path,
                publicId: req.file.filename
            };
        }

        // 2. Type Conversion & Whitelisting
        const allowedUpdates = ['title', 'content', 'category', 'image', 'isPublished', 'author'];
        const filteredUpdates = {};

        Object.keys(updateData).forEach(key => {
            if (allowedUpdates.includes(key)) {
                if (key === 'isPublished') {
                    filteredUpdates[key] = updateData[key] === 'true' || updateData[key] === true;
                } else {
                    filteredUpdates[key] = updateData[key];
                }
            }
        });

        const updatedNews = await News.findByIdAndUpdate(
            req.params.id,
            { $set: filteredUpdates },
            { new: true, runValidators: true, context: 'query' }
        ).populate('category', 'name slug');

        res.status(200).json({ success: true, data: updatedNews });
    } catch (error) {
        // Cleanup newly uploaded file on error
        if (req.file) await cloudinary.uploader.destroy(req.file.filename);
        next(error);
    }
};

/**
 * @desc    Delete news
 * @route   DELETE /api/v1/admin/news/:id
 */
export const deleteNews = async (req, res, next) => {
    try {
        const news = await News.findById(req.params.id);

        if (!news) {
            const error = new Error('ไม่พบข่าวนี้');
            error.status = 404;
            return next(error);
        }

        // Cleanup Cloudinary
        if (news.image && news.image.publicId) {
            await cloudinary.uploader.destroy(news.image.publicId);
        }

        await news.deleteOne();

        res.status(200).json({ success: true, message: 'ลบข่าวเรียบร้อยแล้ว' });
    } catch (error) {
        next(error);
    }
};
