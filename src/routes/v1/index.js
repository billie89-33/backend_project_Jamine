import express from 'express';
import usersRoutes from './users.routes.js';
import productsRoutes from './products.routes.js';
import notesRoutes from './notes.routes.js';
import cartRoutes from './cart.routes.js';

const router = express.Router();

router.use('/users', usersRoutes);
router.use('/products', productsRoutes); // เชื่อมต่อ products route
router.use('/notes', notesRoutes);
router.use('/cart', cartRoutes);

export default router;
