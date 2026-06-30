import express from 'express';
import { 
    getProducts, 
    getProduct, 
    getCategories, 
    getBrands, 
    getSpecKeys, 
    getSpecFilters 
} from '../../controllers/v2/products.controller.js';

const router = express.Router();

router.get('/categories', getCategories);
router.get('/brands', getBrands);
router.get('/spec-keys', getSpecKeys);
router.get('/spec-filters', getSpecFilters);

router.get('/', getProducts);
router.get('/:id', getProduct);

export default router;
