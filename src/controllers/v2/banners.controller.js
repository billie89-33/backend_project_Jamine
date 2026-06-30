import prisma from '../../config/prisma.js';

// @desc    Get all active banners
// @route   GET /api/v2/banners
// @access  Public
export const getBanners = async (req, res, next) => {
    try {
        const where = { isActive: true };

        if (req.query.placement) {
            where.placement = req.query.placement;
        }

        const banners = await prisma.banner.findMany({
            where,
            orderBy: [
                { order: 'asc' },
                { createdAt: 'desc' }
            ]
        });

        res.status(200).json({
            success: true,
            count: banners.length,
            data: banners
        });
    } catch (error) {
        next(error);
    }
};
