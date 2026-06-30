import express from 'express';
import { 
    getAdminCategories, 
    createCategory, 
    updateCategory, 
    deleteCategory 
} from '../../../controllers/v2/admin/newsCategory.admin.controller.js';
import { validateUuid } from '../../../middlewares/validateUuid.middleware.js';

const router = express.Router();

router.get('/', getAdminCategories);
router.post('/', createCategory);
router.patch('/:id', validateUuid, updateCategory);
router.delete('/:id', validateUuid, deleteCategory);

export default router;
