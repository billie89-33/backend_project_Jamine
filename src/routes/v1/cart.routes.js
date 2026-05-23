import express from 'express';
import { 
    getCart, 
    addToCart, 
    updateCartQuantity, 
    removeFromCart, 
    getCartSummary 
} from '../../controllers/v1/cart.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// All cart routes are protected (require login)
router.use(protect);

router.get('/', getCart);
router.post('/', addToCart);
router.patch('/update-quantity', updateCartQuantity);
router.delete('/:productId', removeFromCart);
router.get('/summary', getCartSummary);

export default router;
