import News from '../../models/news.model.js';

/**
 * @desc    Get all news (Public)
 * @route   GET /api/v1/news
 * @access  Public
 * @query   ?limit=10&categoryId=...&isPublished=true
 */
export const getAllNews = async (req, res, next) => {
    try {
        const { limit, categoryId, isPublished } = req.query;
        let query = {};

        // Default to showing only published news for public API
        query.isPublished = isPublished !== undefined ? isPublished === 'true' : true;

        if (categoryId && categoryId !== 'All') {
            query.category = categoryId;
        }

        const news = await News.find(query)
            .populate('category', 'name slug')
            .sort({ createdAt: -1 }) // Newest first
            .limit(parseInt(limit) || 10)
            .lean();

        res.status(200).json({
            success: true,
            count: news.length,
            data: news
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get news details and increment views (Public)
 * @route   GET /api/v1/news/:id
 * @access  Public
 */
export const getNewsById = async (req, res, next) => {
    try {
        // Atomic increment of views
        const news = await News.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        ).populate('category', 'name slug').lean();

        if (!news) {
            const error = new Error('ไม่พบข่าวนี้');
            error.status = 404;
            return next(error);
        }

        res.status(200).json({
            success: true,
            data: news
        });
    } catch (error) {
        next(error);
    }
};
