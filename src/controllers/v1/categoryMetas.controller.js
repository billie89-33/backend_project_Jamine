import CategoryMeta from '../../models/categoryMeta.model.js';

// @desc    Get all category covers
// @route   GET /api/v1/category-covers
// @access  Public
export const getCategoryCovers = async (req, res, next) => {
    try {
        const covers = await CategoryMeta.find().sort('-updatedAt').lean();
        res.status(200).json({
            success: true,
            count: covers.length,
            data: covers
        });
    } catch (error) {
        next(error);
    }
};
