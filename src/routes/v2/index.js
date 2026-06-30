import express from 'express';
import usersRoutes from './users.routes.js';
import productsRoutes from './products.routes.js';
import cartRoutes from './cart.routes.js';
import ordersRoutes from './orders.routes.js';
import bannersRoutes from './banners.routes.js';
import newsRoutes from './news.routes.js';
import newsCategoryRoutes from './newsCategory.routes.js';
import categoryMetasRoutes from './categoryMetas.routes.js';
import adminRoutes from './admin/index.js';

const router = express.Router();

router.use('/users', usersRoutes);
router.use('/products', productsRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', ordersRoutes);
router.use('/banners', bannersRoutes);
router.use('/news', newsRoutes);
router.use('/news-categories', newsCategoryRoutes);
router.use('/category-covers', categoryMetasRoutes);

router.use('/admin', adminRoutes);

export default router;
