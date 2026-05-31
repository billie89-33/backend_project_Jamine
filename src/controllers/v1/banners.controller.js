import Banner from '../../models/banner.model.js';

// @desc    Get all active banners
// @route   GET /api/v1/banners
// @access  Public
export const getBanners = async (req, res, next) => {
    try {
        const queryObj = { isActive: true };

        // Filter by placement if provided
        if (req.query.placement) {
            queryObj.placement = req.query.placement;
        }

        // Sort by order (ASC) then newest first
        const banners = await Banner.find(queryObj)
            .sort('order -createdAt')
            .lean();

        res.status(200).json({
            success: true,
            count: banners.length,
            data: banners
        });
    } catch (error) {
        next(error);
    }
};
