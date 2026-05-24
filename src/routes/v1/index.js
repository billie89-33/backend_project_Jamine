import express from 'express';
import usersRoutes from './users.routes.js';
import productsRoutes from './products.routes.js';
import notesRoutes from './notes.routes.js';
import cartRoutes from './cart.routes.js';
import ordersRoutes from './orders.routes.js';
import adminRoutes from './admin/index.js';

const router = express.Router();

router.use('/users', usersRoutes);
router.use('/products', productsRoutes);
router.use('/notes', notesRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', ordersRoutes);
router.use('/admin', adminRoutes); // เชื่อมต่อระบบ Admin ทั้งหมด

export default router;
