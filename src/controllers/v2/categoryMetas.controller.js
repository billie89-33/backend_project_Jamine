import prisma from '../../config/prisma.js';

// @desc    Get all category covers
// @route   GET /api/v2/category-covers
// @access  Public
export const getCategoryCovers = async (req, res, next) => {
    try {
        const covers = await prisma.categoryMeta.findMany({
            orderBy: { updatedAt: 'desc' }
        });
        res.status(200).json({
            success: true,
            count: covers.length,
            data: covers
        });
    } catch (error) {
        next(error);
    }
};
