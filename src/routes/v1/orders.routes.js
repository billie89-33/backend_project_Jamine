import express from 'express';
import { 
    createOrder, 
    getOrderById, 
    mockPayment 
} from '../../controllers/v1/orders.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// ใช้ protect middleware คลุมทุกเส้นทาง เพราะคนที่จะซื้อได้ต้องล็อกอินแล้ว
router.use(protect);

router.post('/', createOrder);
router.get('/:orderId', getOrderById);
router.post('/:orderId/mock-payment', mockPayment);

export default router;
