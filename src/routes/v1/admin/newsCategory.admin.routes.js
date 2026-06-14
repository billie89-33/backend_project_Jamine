import express from 'express';
import { 
    getAdminCategories, 
    createCategory, 
    updateCategory, 
    deleteCategory 
} from '../../../controllers/v1/admin/newsCategory.admin.controller.js';
import { validateMongoId } from '../../../middlewares/validateId.middleware.js';

const router = express.Router();

router.get('/', getAdminCategories);
router.post('/', createCategory);
router.patch('/:id', validateMongoId, updateCategory);
router.delete('/:id', validateMongoId, deleteCategory);

export default router;
