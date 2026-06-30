import prisma from '../../../config/prisma.js';
import cloudinary from '../../../config/cloudinary.js';

// @desc    Get all banners (Admin only)
// @route   GET /api/v2/admin/banners
export const getAdminBanners = async (req, res, next) => {
    try {
        const banners = await prisma.banner.findMany({
            orderBy: [
                { placement: 'asc' },
                { order: 'asc' },
                { createdAt: 'desc' }
            ]
        });
        res.status(200).json({ success: true, data: banners });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new banner
// @route   POST /api/v2/admin/banners
export const createBanner = async (req, res, next) => {
    try {
        const bannerData = { ...req.body };

        // 1. Image handling
        if (req.file) {
            bannerData.imageUrl = req.file.path;
            bannerData.imagePublicId = req.file.filename;
        } else {
            const error = new Error('Please upload a banner image');
            error.status = 400;
            throw error;
        }

        // 2. Type Conversion (FormData sends strings)
        if (bannerData.isActive !== undefined) {
            bannerData.isActive = bannerData.isActive === 'true' || bannerData.isActive === true;
        }
        if (bannerData.order !== undefined) {
            bannerData.order = Number(bannerData.order);
        }

        const banner = await prisma.banner.create({ data: bannerData });
        res.status(201).json({ success: true, data: banner });
    } catch (error) {
        if (req.file) await cloudinary.uploader.destroy(req.file.filename);
        next(error);
    }
};

// @desc    Update banner (Partial)
// @route   PATCH /api/v2/admin/banners/:id
export const updateBanner = async (req, res, next) => {
    try {
        const updateData = { ...req.body };
        const bannerId = req.params.id;

        const banner = await prisma.banner.findUnique({ where: { id: bannerId } });

        if (!banner) {
            const error = new Error('Banner not found');
            error.status = 404;
            throw error;
        }

        let oldPublicId = null;
        if (req.file) {
            oldPublicId = banner.imagePublicId;
            updateData.imageUrl = req.file.path;
            updateData.imagePublicId = req.file.filename;
        }

        if (updateData.isActive !== undefined) {
            updateData.isActive = updateData.isActive === 'true' || updateData.isActive === true;
        }
        if (updateData.order !== undefined) {
            updateData.order = Number(updateData.order);
        }

        const updatedBanner = await prisma.banner.update({
            where: { id: bannerId },
            data: updateData
        });

        if (oldPublicId) {
            try {
                await cloudinary.uploader.destroy(oldPublicId);
            } catch (cloudErr) {
                console.error("Cloudinary Delete Error:", cloudErr);
            }
        }

        res.status(200).json({ success: true, data: updatedBanner });
    } catch (error) {
        if (req.file) {
            try { await cloudinary.uploader.destroy(req.file.filename); } catch (e) {}
        }
        next(error);
    }
};

// @desc    Delete banner
// @route   DELETE /api/v2/admin/banners/:id
export const deleteBanner = async (req, res, next) => {
    try {
        const bannerId = req.params.id;
        const banner = await prisma.banner.findUnique({ where: { id: bannerId } });

        if (!banner) {
            const error = new Error('Banner not found');
            error.status = 404;
            return next(error);
        }

        if (banner.imagePublicId) {
            await cloudinary.uploader.destroy(banner.imagePublicId);
        }
        
        await prisma.banner.delete({ where: { id: bannerId } });

        res.status(200).json({ success: true, message: 'Banner deleted successfully' });
    } catch (error) {
        next(error);
    }
};
