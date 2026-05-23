/**
 * @desc    Middleware to validate MongoDB ObjectId format
 */
export const validateMongoId = (req, res, next) => {
    const id = req.params.id || req.params.productId;

    if (id && !id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
            success: false,
            message: `Invalid ID format: ${id}`
        });
    }
    next();
};
