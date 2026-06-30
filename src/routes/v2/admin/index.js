import express from 'express';
import { protect, admin } from '../../../middlewares/authV2.middleware.js';
import productsAdminRoutes from './products.admin.routes.js';
import bannersAdminRoutes from './banners.admin.routes.js';
import newsAdminRoutes from './news.admin.routes.js';
import newsCategoryAdminRoutes from './newsCategory.admin.routes.js';
import categoryMetasAdminRoutes from './categoryMetas.admin.routes.js';

const router = express.Router();

// 🔒 Centralized Admin Security
// Require login and admin role for all V2 admin routes
router.use(protect, admin);

router.use('/products', productsAdminRoutes);
router.use('/banners', bannersAdminRoutes);
router.use('/news', newsAdminRoutes);
router.use('/news-categories', newsCategoryAdminRoutes);
router.use('/category-covers', categoryMetasAdminRoutes);

export default router;
