import express from 'express';
import { createProduct, updateProduct, deleteProduct } from '../../../controllers/v1/admin/products.admin.controller.js';
import createUpload from '../../../middlewares/upload.middleware.js';
import { validateMongoId } from '../../../middlewares/validateId.middleware.js';
import { productValidationMiddleware } from '../../../middlewares/validate.middleware.js';

const router = express.Router();
const upload = createUpload('products');

router.post('/', upload.single('image'), productValidationMiddleware, createProduct);

// ... (upload route remains same)

router.patch('/:id', validateMongoId, upload.single('image'), productValidationMiddleware, updateProduct);
router.put('/:id', validateMongoId, upload.single('image'), productValidationMiddleware, updateProduct);
router.delete('/:id', validateMongoId, deleteProduct);

export default router;
