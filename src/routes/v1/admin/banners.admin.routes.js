import express from 'express';
import { 
    getAdminBanners, 
    createBanner, 
    updateBanner, 
    deleteBanner 
} from '../../../controllers/v1/admin/banners.admin.controller.js';
import createUpload from '../../../middlewares/upload.middleware.js';
import { validateMongoId } from '../../../middlewares/validateId.middleware.js';

const router = express.Router();
const upload = createUpload('banners'); // Store banners in 'banners' folder on Cloudinary

router.get('/', getAdminBanners);
router.post('/', upload.single('image'), createBanner);
router.patch('/:id', validateMongoId, upload.single('image'), updateBanner);
router.delete('/:id', validateMongoId, deleteBanner);

export default router;
