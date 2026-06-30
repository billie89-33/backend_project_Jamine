import express from 'express';
import { 
    createOrder, 
    getMyOrders, 
    getOrderById, 
    mockPayment,
    cancelOrder
} from '../../controllers/v2/orders.controller.js';
import { protect } from '../../middlewares/authV2.middleware.js';

const router = express.Router();

router.use(protect); // All order routes require login

router.post('/', createOrder);
router.get('/me', getMyOrders);
router.get('/:orderId', getOrderById);
router.post('/:orderId/mock-payment', mockPayment);
router.post('/:orderId/cancel', cancelOrder);

export default router;
