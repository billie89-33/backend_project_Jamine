import express from 'express';
import { 
    getAdminCategoryCovers, 
    upsertCategoryCover 
} from '../../../controllers/v1/admin/categoryMetas.admin.controller.js';
import createUpload from '../../../middlewares/upload.middleware.js';

const router = express.Router();
const upload = createUpload('categories'); // Store category covers in 'categories' folder on Cloudinary

router.get('/', getAdminCategoryCovers);
router.put('/:categoryName', upload.single('image'), upsertCategoryCover);

export default router;
