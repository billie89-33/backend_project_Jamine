import Order from '../../../models/order.model.js';
import Product from '../../../models/product.model.js';
import User from '../../../models/user.model.js';
import { ORDER_STATUS, PRODUCT_STATUS, PAID_STATUSES } from '../../../constants/index.js';

/**
 * @desc    Get dashboard summary statistics
 * @route   GET /api/v1/admin/dashboard/summary
 */
export const getDashboardSummary = async (req, res, next) => {
    try {
        const { period = 'month' } = req.query;

        const now = new Date();
        let startDate = new Date();
        let prevStartDate = new Date();

        switch (period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                prevStartDate = new Date(startDate);
                prevStartDate.setDate(prevStartDate.getDate() - 1);
                break;
            case 'week':
                startDate.setDate(now.getDate() - 7);
                startDate.setHours(0, 0, 0, 0);
                prevStartDate = new Date(startDate);
                prevStartDate.setDate(prevStartDate.getDate() - 7);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
                break;
            default: // month
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                prevStartDate = new Date(now.getFullYear(), now.getMonth - 1, 1);
        }

        // 1. Balance (Revenue from Paid statuses)
        const revenueData = await Order.aggregate([
            { $match: { status: { $in: PAID_STATUSES } } },
            {
                $facet: {
                    current: [
                        { $match: { createdAt: { $gte: startDate } } },
                        { $group: { _id: null, total: { $sum: '$total' } } }
                    ],
                    previous: [
                        { $match: { createdAt: { $gte: prevStartDate, $lt: startDate } } },
                        { $group: { _id: null, total: { $sum: '$total' } } }
                    ],
                    totalAllTime: [
                        { $group: { _id: null, total: { $sum: '$total' } } }
                    ]
                }
            }
        ]);


        const currentRevenue = revenueData[0].current[0]?.total || 0;
        const prevRevenue = revenueData[0].previous[0]?.total || 0;
        const totalRevenue = revenueData[0].totalAllTime[0]?.total || 0;
        const revenueTrend = prevRevenue === 0 ? '+100%' : `${(((currentRevenue - prevRevenue) / prevRevenue) * 100).toFixed(0)}%`;

        // 2. Orders count
        const ordersData = await Order.aggregate([
            {
                $facet: {
                    current: [
                        { $match: { createdAt: { $gte: startDate } } },
                        { $count: 'count' }
                    ],
                    previous: [
                        { $match: { createdAt: { $gte: prevStartDate, $lt: startDate } } },
                        { $count: 'count' }
                    ],
                    totalAllTime: [
                        { $count: 'count' }
                    ]
                }
            }
        ]);

        const currentOrders = ordersData[0].current[0]?.count || 0;
        const prevOrders = ordersData[0].previous[0]?.count || 0;
        const totalOrders = ordersData[0].totalAllTime[0]?.count || 0;
        const ordersTrend = prevOrders === 0 ? '+100%' : `${(((currentOrders - prevOrders) / prevOrders) * 100).toFixed(0)}%`;

        // 3. Customers count
        const customersData = await User.aggregate([
            { $match: { role: 'user' } },
            {
                $facet: {
                    current: [
                        { $match: { createdAt: { $gte: startDate } } },
                        { $count: 'count' }
                    ],
                    previous: [
                        { $match: { createdAt: { $gte: prevStartDate, $lt: startDate } } },
                        { $count: 'count' }
                    ],
                    totalAllTime: [
                        { $count: 'count' }
                    ]
                }
            }
        ]);

        const currentCustomers = customersData[0].current[0]?.count || 0;
        const prevCustomers = customersData[0].previous[0]?.count || 0;
        const totalCustomers = customersData[0].totalAllTime[0]?.count || 0;
        const customersTrend = prevCustomers === 0 ? '+100%' : `${(((currentCustomers - prevCustomers) / prevCustomers) * 100).toFixed(0)}%`;

        const summary = {
            balance: { 
                value: currentRevenue, 
                trend: revenueTrend, 
                allTimeValue: totalRevenue 
            },
            orders: { 
                value: currentOrders, 
                trend: ordersTrend, 
                allTimeValue: totalOrders 
            },
            customers: { 
                value: currentCustomers, 
                trend: customersTrend, 
                allTimeValue: totalCustomers 
            }
        };

        if (res) {
            res.status(200).json({ success: true, data: summary });
        } else {
            return summary;
        }
    } catch (error) {
        if (next) next(error);
        else throw error;
    }
};

/**
 * @desc    Get products with low stock
 * @route   GET /api/v1/admin/dashboard/low-stock
 */
export const getLowStockProducts = async (req, res, next) => {
    try {
        const threshold = parseInt(req.query.threshold, 10) || 5;
        const products = await Product.find({ 
            stock: { $lt: threshold },
            status: PRODUCT_STATUS.ACTIVE 
        })
        .sort('stock')
        .limit(10)
        .lean();

        const formatted = products.map(p => ({
            _id: p._id,
            name: p.modelName,
            brand: p.brand,
            stock: p.stock,
            image: p.image
        }));

        if (res) {
            res.status(200).json({ success: true, data: formatted });
        } else {
            return formatted;
        }
    } catch (error) {
        if (next) next(error);
        else throw error;
    }
};

/**
 * @desc    Get order status distribution
 * @route   GET /api/v1/admin/dashboard/order-status
 */
export const getOrderStatusDistribution = async (req, res, next) => {
    try {
        const stats = await Order.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    status: '$_id',
                    count: 1
                }
            }
        ]);

        if (res) {
            res.status(200).json({ success: true, data: stats });
        } else {
            return stats;
        }
    } catch (error) {
        if (next) next(error);
        else throw error;
    }
};

/**
 * @desc    Get user growth over time
 * @route   GET /api/v1/admin/dashboard/user-growth
 */
export const getUserGrowthChart = async (req, res, next) => {
    try {
        const { period = 'month' } = req.query;
        const now = new Date();
        let startDate = new Date();
        let groupByFormat;

        switch (period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                groupByFormat = '%H:00';
                break;
            case 'week':
                startDate.setDate(now.getDate() - 7);
                startDate.setHours(0, 0, 0, 0);
                groupByFormat = '%Y-%m-%d';
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                groupByFormat = '%Y-%m';
                break;
            default: // month
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                groupByFormat = '%Y-%m-%d';
        }

        const growthData = await User.aggregate([
            { $match: { role: 'user', createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: groupByFormat, date: '$createdAt' } },
                    count: { $sum: 1 },
                    date: { $first: '$createdAt' }
                }
            },
            { $sort: { date: 1 } },
            { $project: { _id: 0, date: '$_id', count: 1 } }
        ]);

        if (growthData.length === 1) {
            growthData.unshift({ 
                date: period === 'year' ? 'Jan' : 'Start', 
                count: 0 
            });
        }

        if (res) {
            res.status(200).json({ success: true, data: growthData });
        } else {
            return growthData;
        }
    } catch (error) {
        if (next) next(error);
        else throw error;
    }
};

/**
 * @desc    Get revenue time-series data for chart
 * @route   GET /api/v1/admin/dashboard/revenue-chart
 */
export const getRevenueChart = async (req, res, next) => {
    try {
        const { period = 'month' } = req.query;
        const now = new Date();
        let startDate = new Date();
        let groupByFormat;

        switch (period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                groupByFormat = '%H:00'; // à¸ˆà¸±à¸”à¸à¸¥à¸¸à¹ˆà¸¡à¸•à¸²à¸¡à¸Šà¸±à¹ˆà¸§à¹‚à¸¡à¸‡
                break;
            case 'week':
                startDate.setDate(now.getDate() - 7);
                startDate.setHours(0, 0, 0, 0);
                groupByFormat = '%Y-%m-%d'; // à¸ˆà¸±à¸”à¸à¸¥à¸¸à¹ˆà¸¡à¸•à¸²à¸¡à¸§à¸±à¸™
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1); // 1 à¸¡à¸à¸£à¸²à¸„à¸¡ à¸‚à¸­à¸‡à¸›à¸µà¸™à¸µà¹‰
                groupByFormat = '%Y-%m'; // à¸ˆà¸±à¸”à¸à¸¥à¸¸à¹ˆà¸¡à¸•à¸²à¸¡à¹€à¸”à¸·à¸­à¸™
                break;
            default: // month
                startDate = new Date(now.getFullYear(), now.getMonth(), 1); // à¸§à¸±à¸™à¸—à¸µà¹ˆ 1 à¸‚à¸­à¸‡à¹€à¸”à¸·à¸­à¸™à¸™à¸µà¹‰
                groupByFormat = '%Y-%m-%d'; // à¸ˆà¸±à¸”à¸à¸¥à¸¸à¹ˆà¸¡à¸•à¸²à¸¡à¸§à¸±à¸™
        }

        const chartData = await Order.aggregate([
            { $match: { status: { $in: PAID_STATUSES }, createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: groupByFormat, date: '$createdAt' } },
                    revenue: { $sum: '$total' },
                    date: { $first: '$createdAt' }
                }
            },
            { $sort: { date: 1 } },
            { $project: { _id: 0, date: '$_id', revenue: 1 } }
        ]);

        // âš ï¸ à¸ªà¸³à¸„à¸±à¸à¸ªà¸³à¸«à¸£à¸±à¸šà¸à¸²à¸£à¸§à¸²à¸”à¸à¸£à¸²à¸Ÿà¹€à¸ªà¹‰à¸™:
        // à¸–à¹‰à¸² Backend à¸„à¸´à¸§à¸£à¸µà¹ˆà¸¡à¸²à¹à¸¥à¹‰à¸§à¹„à¸”à¹‰à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹à¸„à¹ˆ "à¸ˆà¸¸à¸”à¹€à¸”à¸µà¸¢à¸§" 
        // à¸à¸£à¸¸à¸“à¸²à¹à¸™à¸šà¸ˆà¸¸à¸”à¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™à¸ˆà¸³à¸¥à¸­à¸‡ (Dummy Start Point) à¸ªà¹ˆà¸‡à¸à¸¥à¸±à¸šà¸¡à¸²à¹ƒà¸«à¹‰à¸«à¸™à¹‰à¸²à¸šà¹‰à¸²à¸™à¸”à¹‰à¸§à¸¢
        if (chartData.length === 1) {
            chartData.unshift({ 
                date: period === 'year' ? 'Jan' : 'Start', 
                revenue: 0 
            });
        }

        if (res) {
            res.status(200).json({ success: true, data: chartData });
        } else {
            return chartData;
        }
    } catch (error) {
        if (next) next(error);
        else throw error;
    }
};

/**
 * @desc    Get sales breakdown by category
 * @route   GET /api/v1/admin/dashboard/category-sales
 */
export const getCategorySales = async (req, res, next) => {
    try {
        const { period = 'month' } = req.query;
        const now = new Date();
        let startDate = new Date();

        switch (period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(now.getDate() - 7);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default: // month
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const categorySales = await Order.aggregate([
            { $match: { status: { $in: PAID_STATUSES }, createdAt: { $gte: startDate } } },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $group: {
                    _id: '$product.category',
                    sales: { $sum: '$items.quantity' }
                }
            },
            { $sort: { sales: -1 } },
            {
                $project: {
                    _id: 0,
                    category: '$_id',
                    sales: 1
                }
            }
        ]);

        // Add some random colors for the frontend donut chart
        const colors = ['bg-purple-600', 'bg-indigo-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-pink-500'];
        const dataWithColors = categorySales.map((item, index) => ({
            ...item,
            color: colors[index % colors.length]
        }));

        if (res) {
            res.status(200).json({ success: true, data: dataWithColors });
        } else {
            return dataWithColors;
        }
    } catch (error) {
        if (next) next(error);
        else throw error;
    }
};

/**
 * @desc    Get recent orders
 * @route   GET /api/v1/admin/dashboard/recent-orders
 */
export const getRecentOrders = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 5;
        const orders = await Order.find({})
            .sort('-createdAt')
            .limit(limit)
            .populate('userId', 'username email')
            .lean();

        const formattedOrders = orders.map(order => ({
            _id: order.orderNumber || order._id,
            customerName: order.userId?.username || 'Guest',
            amount: order.total,
            status: order.status,
            date: order.createdAt
        }));

        if (res) {
            res.status(200).json({ success: true, data: formattedOrders });
        } else {
            return formattedOrders;
        }
    } catch (error) {
        if (next) next(error);
        else throw error;
    }
};

/**
 * @desc    Get top selling products
 * @route   GET /api/v1/admin/dashboard/top-products
 */
export const getTopProducts = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 5;

        // âœ… 1. à¸à¸£à¸­à¸‡à¹€à¸‰à¸žà¸²à¸°à¸ªà¸´à¸™à¸„à¹‰à¸²à¸—à¸µà¹ˆà¸¡à¸µà¸à¸²à¸£à¸‚à¸²à¸¢à¸ˆà¸£à¸´à¸‡ (soldCount > 0)
        // âœ… 2. à¹€à¸žà¸´à¹ˆà¸¡ Tie-breaker: à¸«à¸²à¸à¸¢à¸­à¸”à¸‚à¸²à¸¢à¹€à¸—à¹ˆà¸²à¸à¸±à¸™ à¹ƒà¸«à¹‰à¹€à¸­à¸²à¸•à¸±à¸§à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆà¸¡à¸²à¸™à¸²à¸™à¸à¸§à¹ˆà¸²à¸‚à¸¶à¹‰à¸™à¸à¹ˆà¸­à¸™ (createdAt: 1)
        const products = await Product.find({
            soldCount: { $gt: 0 }
        })
        .sort({ soldCount: -1, createdAt: 1 })
        .limit(limit)
        .lean();

        const formattedProducts = products.map(p => ({
            _id: p._id,
            name: p.modelName,
            brand: p.brand,
            price: p.price,
            sold: p.soldCount,
            image: p.image
        }));

        if (res) {
            res.status(200).json({ success: true, data: formattedProducts });
        } else {
            return formattedProducts;
        }
    } catch (error) {
        if (next) next(error);
        else throw error;
    }
};

/**
 * @desc    Get all dashboard data in one request
 * @route   GET /api/v1/admin/dashboard/all
 */
export const getDashboardAll = async (req, res, next) => {
    try {
        // ðŸ”¥ à¸”à¸¶à¸‡ period à¸­à¸­à¸à¸¡à¸²à¸•à¸£à¸‡à¸™à¸µà¹‰à¹€à¸¥à¸¢
        const { period = 'week' } = req.query; 

        // ðŸ”¥ à¸ªà¸£à¹‰à¸²à¸‡ Mock Request Object à¸—à¸µà¹ˆà¸¡à¸µà¹à¸„à¹ˆ query.period à¹€à¸žà¸·à¹ˆà¸­à¸ªà¹ˆà¸‡à¹ƒà¸«à¹‰à¸Ÿà¸±à¸‡à¸à¹Œà¸Šà¸±à¸™à¸¥à¸¹à¸
        const mockReq = { query: { period } }; 

        const [
            summary, 
            revenueChart, 
            categorySales, 
            recentOrders, 
            topProducts,
            lowStock,
            orderStatus,
            userGrowth
        ] = await Promise.all([
            getDashboardSummary(mockReq, null, null), // à¸ªà¹ˆà¸‡ mockReq à¹à¸—à¸™ req
            getRevenueChart(mockReq, null, null),
            getCategorySales(mockReq, null, null),
            getRecentOrders(mockReq, null, null), // à¹„à¸¡à¹ˆà¹€à¸à¸µà¹ˆà¸¢à¸§à¹€à¸£à¸·à¹ˆà¸­à¸‡à¹€à¸§à¸¥à¸² à¹à¸•à¹ˆà¸ªà¹ˆà¸‡à¹„à¸›à¸à¹‡à¹„à¸¡à¹ˆà¹€à¸›à¹‡à¸™à¹„à¸£à¹€à¸žà¸£à¸²à¸° query.limit à¹„à¸¡à¹ˆà¸žà¸±à¸‡ (à¹ƒà¸Šà¹‰à¸„à¹ˆà¸² default)
            getTopProducts(mockReq, null, null),
            getLowStockProducts(mockReq, null, null),
            getOrderStatusDistribution(mockReq, null, null),
            getUserGrowthChart(mockReq, null, null)
        ]);

        res.status(200).json({
            success: true,
            data: {
                summary,
                revenueChart,
                categorySales,
                recentOrders,
                topProducts,
                lowStock,
                orderStatus,
                userGrowth
            }
        });
    } catch (error) {
        next(error);
    }
};
