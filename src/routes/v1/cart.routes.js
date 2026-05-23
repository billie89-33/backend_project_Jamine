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

/**
 * 🔒 Authentication Barrier
 * All cart operations MUST be performed by a logged-in user.
 * The 'protect' middleware ensures a valid JWT is present in HttpOnly cookies.
 */
router.use(protect);

// --- 1. Static Routes (ต้องวางไว้ด้านบน) ---
router.get('/', getCart);
router.get('/summary', getCartSummary); // ย้ายขึ้นมาไว้ก่อน dynamic parameter
router.patch('/update-quantity', updateCartQuantity);

// --- 2. Dynamic Routes (ต้องวางไว้ด้านล่าง) ---
router.post('/', addToCart);
router.delete('/:productId', removeFromCart);

export default router;
