import express from 'express';
import { 
    getCart, 
    addToCart, 
    updateCartQuantity, 
    removeFromCart, 
    getCartSummary, 
    clearCart 
} from '../../controllers/v2/cart.controller.js';
import { protect } from '../../middlewares/authV2.middleware.js';

const router = express.Router();

router.use(protect); // All cart routes require login

router.get('/', getCart);
router.post('/', addToCart);
router.patch('/update-quantity', updateCartQuantity);
router.get('/summary', getCartSummary);
router.delete('/clear', clearCart);
router.delete('/:productId', removeFromCart);

export default router;
