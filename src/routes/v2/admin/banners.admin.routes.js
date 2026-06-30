import express from 'express';
import { 
    getAdminBanners, 
    createBanner, 
    updateBanner, 
    deleteBanner 
} from '../../../controllers/v2/admin/banners.admin.controller.js';
import createUpload from '../../../middlewares/upload.middleware.js';
import { validateUuid } from '../../../middlewares/validateUuid.middleware.js';

const router = express.Router();
const upload = createUpload('banners'); 

router.get('/', getAdminBanners);
router.post('/', upload.single('image'), createBanner);
router.patch('/:id', validateUuid, upload.single('image'), updateBanner);
router.delete('/:id', validateUuid, deleteBanner);

export default router;
