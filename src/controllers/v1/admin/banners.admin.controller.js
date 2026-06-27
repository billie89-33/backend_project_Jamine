import Banner from '../../../models/banner.model.js';
import cloudinary from '../../../config/cloudinary.js';

// @desc    Get all banners (Admin only)
// @route   GET /api/v1/admin/banners
export const getAdminBanners = async (req, res, next) => {
    try {
        const banners = await Banner.find().sort('placement order -createdAt').lean();
        res.status(200).json({ success: true, data: banners });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new banner
// @route   POST /api/v1/admin/banners
export const createBanner = async (req, res, next) => {
    try {
        const bannerData = { ...req.body };

        // 1. Image handling
        if (req.file) {
            bannerData.image = {
                url: req.file.path,
                publicId: req.file.filename
            };
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

        const banner = await Banner.create(bannerData);
        res.status(201).json({ success: true, data: banner });
    } catch (error) {
        // Atomic Cleanup
        if (req.file) await cloudinary.uploader.destroy(req.file.filename);
        next(error);
    }
};

// @desc    Update banner (Partial)
// @route   PATCH /api/v1/admin/banners/:id
export const updateBanner = async (req, res, next) => {
    try {
        const updateData = { ...req.body };
        const banner = await Banner.findById(req.params.id);

        if (!banner) {
            const error = new Error('Banner not found');
            error.status = 404;
            throw error;
        }

        // 1. Image Update Logic
        let oldPublicId = null;
        if (req.file) {
            oldPublicId = banner.image?.publicId;
            updateData.image = {
                url: req.file.path,
                publicId: req.file.filename
            };
        }

        // 2. Type Conversion
        if (updateData.isActive !== undefined) {
            updateData.isActive = updateData.isActive === 'true' || updateData.isActive === true;
        }
        if (updateData.order !== undefined) {
            updateData.order = Number(updateData.order);
        }

        const updatedBanner = await Banner.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        // Remove old image from Cloudinary ONLY after successful database update
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
// @route   DELETE /api/v1/admin/banners/:id
export const deleteBanner = async (req, res, next) => {
    try {
        const banner = await Banner.findById(req.params.id);

        if (!banner) {
            const error = new Error('Banner not found');
            error.status = 404;
            return next(error);
        }

        // Cleanup Cloudinary
        await cloudinary.uploader.destroy(banner.image.publicId);
        await banner.deleteOne();

        res.status(200).json({ success: true, message: 'Banner deleted successfully' });
    } catch (error) {
        next(error);
    }
};
