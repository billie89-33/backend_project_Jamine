import express from 'express';
import usersRoutes from './users.routes.js';
import productsRoutes from './products.routes.js';
import notesRoutes from './notes.routes.js';
import cartRoutes from './cart.routes.js';
import ordersRoutes from './orders.routes.js';

const router = express.Router();

router.use('/users', usersRoutes);
router.use('/products', productsRoutes);
router.use('/notes', notesRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', ordersRoutes); // เชื่อมต่อ orders route

export default router;
