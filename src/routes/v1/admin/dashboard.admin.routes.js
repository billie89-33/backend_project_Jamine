import express from 'express';
import { 
    getDashboardSummary, 
    getRevenueChart, 
    getCategorySales, 
    getRecentOrders, 
    getTopProducts,
    getDashboardAll
} from '../../../controllers/v1/admin/dashboard.admin.controller.js';

const router = express.Router();

// @route   GET /api/v1/admin/dashboard/all
router.get('/all', getDashboardAll);

// @route   GET /api/v1/admin/dashboard/summary
router.get('/summary', getDashboardSummary);

// @route   GET /api/v1/admin/dashboard/revenue-chart
router.get('/revenue-chart', getRevenueChart);

// @route   GET /api/v1/admin/dashboard/category-sales
router.get('/category-sales', getCategorySales);

// @route   GET /api/v1/admin/dashboard/recent-orders
router.get('/recent-orders', getRecentOrders);

// @route   GET /api/v1/admin/dashboard/top-products
router.get('/top-products', getTopProducts);

export default router;
