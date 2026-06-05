import express from 'express';
import { 
    getProducts, 
    getProduct,
    getCategories,
    getBrands,
    getSpecKeys
} from '../../controllers/v1/products.controller.js';
import { validateMongoId } from '../../middlewares/validateId.middleware.js';
import { queryValidationMiddleware } from '../../middlewares/validate.middleware.js';

const router = express.Router();

// Public routes (ใครก็ดูได้)
router.get('/', queryValidationMiddleware, getProducts);
router.get('/categories', getCategories);
router.get('/brands', getBrands);
router.get('/spec-keys', getSpecKeys);
router.get('/:id', validateMongoId, getProduct);

export default router;
