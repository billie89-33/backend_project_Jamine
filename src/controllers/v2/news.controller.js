import prisma from '../../config/prisma.js';

/**
 * @desc    Get all news (Public)
 * @route   GET /api/v2/news
 * @access  Public
 * @query   ?limit=10&categoryId=...&isPublished=true&keyword=...
 */
export const getAllNews = async (req, res, next) => {
    try {
        const { limit, categoryId, isPublished, keyword } = req.query;
        let where = {};

        if (keyword) {
            where.title = { contains: keyword, mode: 'insensitive' };
        }

        where.isPublished = isPublished !== undefined ? isPublished === 'true' : true;

        if (categoryId && categoryId !== 'All') {
            where.categoryId = categoryId;
        }

        const news = await prisma.news.findMany({
            where,
            include: { category: true },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit) || 10
        });

        const formattedNews = news.map(n => ({
            ...n,
            category: n.category ? { _id: n.category.id, name: n.category.name, slug: n.category.slug } : null
        }));

        res.status(200).json({
            success: true,
            count: news.length,
            data: formattedNews
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get news details and increment views (Public)
 * @route   GET /api/v2/news/:id
 * @access  Public
 */
export const getNewsById = async (req, res, next) => {
    try {
        const newsId = req.params.id;

        const updatedNews = await prisma.news.update({
            where: { id: newsId },
            data: { views: { increment: 1 } },
            include: { category: true }
        });

        res.status(200).json({
            success: true,
            data: {
                ...updatedNews,
                category: updatedNews.category ? { _id: updatedNews.category.id, name: updatedNews.category.name, slug: updatedNews.category.slug } : null
            }
        });
    } catch (error) {
        if (error.code === 'P2025') {
            const err = new Error('ไม่พบข่าวนี้');
            err.status = 404;
            return next(err);
        }
        next(error);
    }
};
