import express from 'express';
import { 
    getAdminCategoryCovers, 
    upsertCategoryCover 
} from '../../../controllers/v2/admin/categoryMetas.admin.controller.js';
import createUpload from '../../../middlewares/upload.middleware.js';

const router = express.Router();
const upload = createUpload('category-covers');

router.get('/', getAdminCategoryCovers);
router.put('/:categoryName', upload.single('image'), upsertCategoryCover);

export default router;
