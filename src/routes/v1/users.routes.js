import express from 'express';
import { 
    getUsers, 
    registerUser, 
    loginUser,
    logoutUser,
    getUser, 
    updateUser, 
    deleteUser 
} from '../../controllers/v1/users.controller.js';
import { protect, admin } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

// Protected routes (ต้องล็อกอิน)
router.get('/:id', protect, getUser);
router.put('/:id', protect, updateUser);

// Admin only routes (ต้องล็อกอินและเป็นแอดมิน)
router.get('/', protect, admin, getUsers);
router.delete('/:id', protect, admin, deleteUser);

export default router;
