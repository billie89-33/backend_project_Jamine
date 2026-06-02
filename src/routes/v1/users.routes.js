import express from 'express';
import { 
    registerUser, 
    loginUser,
    logoutUser,
    getMe,
    getUser, 
    updateUser, 
    addAddress,
    deleteAddress
} from '../../controllers/v1/users.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authLimiter } from '../../middlewares/rateLimit.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.post('/logout', logoutUser);

// Protected routes (ต้องล็อกอิน)
router.get('/me', protect, getMe);
router.get('/:id', protect, getUser);
router.put('/:id', protect, updateUser);

// Address Management
router.post('/addresses', protect, addAddress);
router.delete('/addresses/:addressId', protect, deleteAddress);

export default router;
