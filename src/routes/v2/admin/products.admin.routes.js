import express from 'express';
import { createProduct, updateProduct, deleteProduct, getAdminProducts } from '../../../controllers/v2/admin/products.admin.controller.js';
import createUpload from '../../../middlewares/upload.middleware.js';
import { validateUuid } from '../../../middlewares/validateUuid.middleware.js';
import { productValidationMiddleware, queryValidationMiddleware } from '../../../middlewares/validate.middleware.js';

const router = express.Router();
const upload = createUpload('products');

router.get('/', queryValidationMiddleware, getAdminProducts);
router.post('/', upload.single('image'), productValidationMiddleware, createProduct);

router.patch('/:id', validateUuid, upload.single('image'), productValidationMiddleware, updateProduct);
router.put('/:id', validateUuid, upload.single('image'), productValidationMiddleware, updateProduct);
router.delete('/:id', validateUuid, deleteProduct);

export default router;
