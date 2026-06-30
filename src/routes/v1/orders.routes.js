import express from 'express';
import { 
    createOrder, 
    getMyOrders,
    getOrderById, 
    mockPayment,
    cancelOrder
} from '../../controllers/v1/orders.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { orderLimiter } from '../../middlewares/rateLimit.middleware.js';

const router = express.Router();

// ใช้ protect middleware คลุมทุกเส้นทาง เพราะคนที่จะซื้อได้ต้องล็อกอินแล้ว
router.use(protect);

router.post('/', orderLimiter, createOrder);
router.get('/me', getMyOrders);
router.get('/:orderId', getOrderById);
router.post('/:orderId/mock-payment', orderLimiter, mockPayment);
router.post('/:orderId/cancel', cancelOrder);

export default router;
