import express from 'express';
import { 
    getUsers, 
    registerUser, 
    loginUser,
    logoutUser,
    getMe,
    getUser, 
    updateUser, 
    deleteUser,
    addAddress,
    deleteAddress
} from '../../controllers/v1/users.controller.js';
import { protect, admin } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

// Protected routes (ต้องล็อกอิน)
router.get('/me', protect, getMe);
router.get('/:id', protect, getUser);
router.put('/:id', protect, updateUser);

// Address Management
router.post('/addresses', protect, addAddress);
router.delete('/addresses/:addressId', protect, deleteAddress);

// Admin only routes (ต้องล็อกอินและเป็นแอดมิน)
router.get('/', protect, admin, getUsers);
// router.delete('/:id', protect, admin, deleteUser); // ปิดไว้ชั่วคราวตามความต้องการของผู้ใช้

export default router;
