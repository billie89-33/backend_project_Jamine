import express from 'express';
import { 
    getAdminNews, 
    createNews, 
    updateNews, 
    deleteNews 
} from '../../../controllers/v1/admin/news.admin.controller.js';
import createUpload from '../../../middlewares/upload.middleware.js';
import { validateMongoId } from '../../../middlewares/validateId.middleware.js';

const router = express.Router();
const upload = createUpload('news'); // Store news images in 'news' folder on Cloudinary

router.get('/', getAdminNews);
router.post('/', upload.single('image'), createNews);
router.patch('/:id', validateMongoId, upload.single('image'), updateNews);
router.delete('/:id', validateMongoId, deleteNews);

export default router;
