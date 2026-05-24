import express from 'express';
import { protect, admin } from '../../../middlewares/auth.middleware.js';
import usersAdminRoutes from './users.admin.routes.js';
import productsAdminRoutes from './products.admin.routes.js';

const router = express.Router();

// 🔒 Centralized Admin Security
// ทุกเส้นทางที่อยู่ในโฟลเดอร์นี้ ต้องล็อกอิน และต้องเป็นแอดมินเท่านั้น
router.use(protect, admin);

router.use('/users', usersAdminRoutes);
router.use('/products', productsAdminRoutes);

export default router;
