import NewsCategory from '../../models/newsCategory.model.js';

/**
 * @desc    Get all news categories (Public)
 * @route   GET /api/v1/news-categories
 * @access  Public
 */
export const getAllCategories = async (req, res, next) => {
    try {
        const categories = await NewsCategory.find().sort('name').lean();
        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        next(error);
    }
};
