import CategoryMeta from '../../../models/categoryMeta.model.js';
import cloudinary from '../../../config/cloudinary.js';

// @desc    Get all category covers for admin
// @route   GET /api/v1/admin/category-covers
export const getAdminCategoryCovers = async (req, res, next) => {
    try {
        const covers = await CategoryMeta.find().sort('-updatedAt').lean();
        res.status(200).json({ success: true, data: covers });
    } catch (error) {
        next(error);
    }
};

// @desc    Upsert (Create/Update) category cover
// @route   PUT /api/v1/admin/category-covers/:categoryName
export const upsertCategoryCover = async (req, res, next) => {
    try {
        const { categoryName } = req.params;

        if (!req.file) {
            const error = new Error('Please upload a cover image');
            error.status = 400;
            throw error;
        }

        // Check if category meta already exists
        let categoryMeta = await CategoryMeta.findOne({ categoryName });

        if (categoryMeta) {
            // Remove old image from Cloudinary
            await cloudinary.uploader.destroy(categoryMeta.image.publicId);

            categoryMeta.image = {
                url: req.file.path,
                publicId: req.file.filename
            };
            await categoryMeta.save();
        } else {
            categoryMeta = await CategoryMeta.create({
                categoryName,
                image: {
                    url: req.file.path,
                    publicId: req.file.filename
                }
            });
        }

        res.status(200).json({ success: true, data: categoryMeta });
    } catch (error) {
        if (req.file) await cloudinary.uploader.destroy(req.file.filename);
        next(error);
    }
};
