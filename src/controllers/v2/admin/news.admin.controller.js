import prisma from '../../../config/prisma.js';
import cloudinary from '../../../config/cloudinary.js';

/**
 * @desc    Get all news (Admin)
 * @route   GET /api/v2/admin/news
 */
export const getAdminNews = async (req, res, next) => {
    try {
        const { limit, categoryId, isPublished, keyword } = req.query;
        let where = {};

        if (keyword) {
            where.title = { contains: keyword, mode: 'insensitive' };
        }

        if (categoryId && categoryId !== 'All') where.categoryId = categoryId;
        if (isPublished !== undefined) where.isPublished = isPublished === 'true';

        const news = await prisma.news.findMany({
            where,
            include: { category: true },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit) || 100
        });

        // Format for frontend compatibility
        const formattedNews = news.map(n => ({
            ...n,
            category: n.category ? { _id: n.category.id, name: n.category.name, slug: n.category.slug } : null
        }));

        res.status(200).json({ success: true, data: formattedNews });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create new news
 * @route   POST /api/v2/admin/news
 */
export const createNews = async (req, res, next) => {
    try {
        const newsData = { ...req.body };

        if (req.file) {
            newsData.imageUrl = req.file.path;
            newsData.imagePublicId = req.file.filename;
        } else if (!newsData.imageUrl) {
            const error = new Error('กรุณาอัปโหลดรูปภาพปกข่าว');
            error.status = 400;
            throw error;
        }

        if (newsData.isPublished !== undefined) {
            newsData.isPublished = newsData.isPublished === 'true' || newsData.isPublished === true;
        }

        const categoryId = newsData.categoryId || newsData.category;

        const news = await prisma.news.create({
            data: {
                title: newsData.title,
                content: newsData.content,
                categoryId: categoryId,
                imageUrl: newsData.imageUrl,
                imagePublicId: newsData.imagePublicId,
                author: newsData.author || 'Admin',
                isPublished: newsData.isPublished
            }
        });

        res.status(201).json({ success: true, data: news });
    } catch (error) {
        if (req.file) await cloudinary.uploader.destroy(req.file.filename);
        next(error);
    }
};

/**
 * @desc    Update news (Whitelisted)
 * @route   PATCH /api/v2/admin/news/:id
 */
export const updateNews = async (req, res, next) => {
    try {
        const updateData = { ...req.body };
        const newsId = req.params.id;

        const news = await prisma.news.findUnique({ where: { id: newsId } });

        if (!news) {
            const error = new Error('ไม่พบข่าวนี้');
            error.status = 404;
            throw error;
        }

        let oldPublicId = null;
        if (req.file) {
            if (news.imagePublicId) {
                oldPublicId = news.imagePublicId;
            }
            updateData.imageUrl = req.file.path;
            updateData.imagePublicId = req.file.filename;
        }

        const filteredUpdates = {};
        const allowedUpdates = ['title', 'content', 'categoryId', 'category', 'imageUrl', 'imagePublicId', 'isPublished', 'author'];

        Object.keys(updateData).forEach(key => {
            if (allowedUpdates.includes(key)) {
                if (key === 'isPublished') {
                    filteredUpdates[key] = updateData[key] === 'true' || updateData[key] === true;
                } else if (key === 'category') {
                    filteredUpdates['categoryId'] = updateData[key];
                } else {
                    filteredUpdates[key] = updateData[key];
                }
            }
        });

        const updatedNews = await prisma.news.update({
            where: { id: newsId },
            data: filteredUpdates,
            include: { category: true }
        });

        if (oldPublicId) {
            try {
                await cloudinary.uploader.destroy(oldPublicId);
            } catch (cloudErr) {
                console.error("Cloudinary Delete Error:", cloudErr);
            }
        }

        res.status(200).json({ 
            success: true, 
            data: {
                ...updatedNews,
                category: updatedNews.category ? { _id: updatedNews.category.id, name: updatedNews.category.name, slug: updatedNews.category.slug } : null
            }
        });
    } catch (error) {
        if (req.file) {
            try { await cloudinary.uploader.destroy(req.file.filename); } catch (e) {}
        }
        next(error);
    }
};

/**
 * @desc    Delete news
 * @route   DELETE /api/v2/admin/news/:id
 */
export const deleteNews = async (req, res, next) => {
    try {
        const newsId = req.params.id;
        const news = await prisma.news.findUnique({ where: { id: newsId } });

        if (!news) {
            const error = new Error('ไม่พบข่าวนี้');
            error.status = 404;
            return next(error);
        }

        if (news.imagePublicId) {
            await cloudinary.uploader.destroy(news.imagePublicId);
        }

        await prisma.news.delete({ where: { id: newsId } });

        res.status(200).json({ success: true, message: 'ลบข่าวเรียบร้อยแล้ว' });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Upload image for Rich Text Editor (React Quill)
 * @route   POST /api/v2/admin/news/upload-image
 * @access  Private (Admin)
 */
export const uploadNewsImage = async (req, res, next) => {
    try {
        if (!req.file) {
            const error = new Error('กรุณาอัปโหลดรูปภาพ');
            error.status = 400;
            return next(error);
        }

        res.status(200).json({
            success: true,
            url: req.file.path,
            publicId: req.file.filename 
        });
    } catch (error) {
        next(error);
    }
};
