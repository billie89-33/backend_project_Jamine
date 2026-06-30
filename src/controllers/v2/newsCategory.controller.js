import prisma from '../../config/prisma.js';

/**
 * @desc    Get all news categories (Public)
 * @route   GET /api/v2/news-categories
 * @access  Public
 */
export const getAllCategories = async (req, res, next) => {
    try {
        const categories = await prisma.newsCategory.findMany({
            orderBy: { name: 'asc' }
        });
        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        next(error);
    }
};
