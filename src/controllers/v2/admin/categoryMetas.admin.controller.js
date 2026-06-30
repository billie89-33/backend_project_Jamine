import prisma from '../../../config/prisma.js';
import cloudinary from '../../../config/cloudinary.js';

// @desc    Get all category covers for admin
// @route   GET /api/v2/admin/category-covers
export const getAdminCategoryCovers = async (req, res, next) => {
    try {
        const covers = await prisma.categoryMeta.findMany({
            orderBy: { updatedAt: 'desc' }
        });
        res.status(200).json({ success: true, data: covers });
    } catch (error) {
        next(error);
    }
};

// @desc    Upsert (Create/Update) category cover
// @route   PUT /api/v2/admin/category-covers/:categoryName
export const upsertCategoryCover = async (req, res, next) => {
    try {
        const { categoryName } = req.params;

        if (!req.file) {
            const error = new Error('Please upload a cover image');
            error.status = 400;
            throw error;
        }

        const categoryMeta = await prisma.categoryMeta.findUnique({
            where: { categoryName }
        });

        let oldPublicId = null;

        let resultMeta;

        if (categoryMeta) {
            oldPublicId = categoryMeta.imagePublicId;
            resultMeta = await prisma.categoryMeta.update({
                where: { categoryName },
                data: {
                    imageUrl: req.file.path,
                    imagePublicId: req.file.filename
                }
            });
        } else {
            resultMeta = await prisma.categoryMeta.create({
                data: {
                    categoryName,
                    imageUrl: req.file.path,
                    imagePublicId: req.file.filename
                }
            });
        }

        if (oldPublicId) {
            try {
                await cloudinary.uploader.destroy(oldPublicId);
            } catch (cloudErr) {
                console.error("Cloudinary Delete Error:", cloudErr);
            }
        }

        res.status(200).json({ success: true, data: resultMeta });
    } catch (error) {
        if (req.file) {
            try { await cloudinary.uploader.destroy(req.file.filename); } catch (e) {}
        }
        next(error);
    }
};
