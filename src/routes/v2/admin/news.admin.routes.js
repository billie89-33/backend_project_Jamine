import express from 'express';
import { 
    getAdminNews, 
    createNews, 
    updateNews, 
    deleteNews,
    uploadNewsImage
} from '../../../controllers/v2/admin/news.admin.controller.js';
import createUpload from '../../../middlewares/upload.middleware.js';
import { validateUuid } from '../../../middlewares/validateUuid.middleware.js';

const router = express.Router();
const upload = createUpload('news'); 

router.get('/', getAdminNews);
router.post('/', upload.single('image'), createNews);
router.patch('/:id', validateUuid, upload.single('image'), updateNews);
router.delete('/:id', validateUuid, deleteNews);
router.post('/upload-image', upload.single('image'), uploadNewsImage);

export default router;
