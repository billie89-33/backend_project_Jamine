import express from 'express';
import { 
    getDashboardSummary, 
    getRevenueChart, 
    getCategorySales, 
    getRecentOrders, 
    getTopProducts,
    getDashboardAll,
    getLowStockProducts,
    getOrderStatusDistribution,
    getUserGrowthChart
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

// @route   GET /api/v1/admin/dashboard/low-stock
router.get('/low-stock', getLowStockProducts);

// @route   GET /api/v1/admin/dashboard/order-status
router.get('/order-status', getOrderStatusDistribution);

// @route   GET /api/v1/admin/dashboard/user-growth
router.get('/user-growth', getUserGrowthChart);

export default router;
