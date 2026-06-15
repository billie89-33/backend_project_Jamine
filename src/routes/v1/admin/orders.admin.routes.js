import express from 'express';
import { 
    getAllOrders, 
    getOrderById,
    updateOrderStatus, 
    deleteOrder 
} from '../../../controllers/v1/admin/orders.admin.controller.js';
import { validateMongoId } from '../../../middlewares/validateId.middleware.js';

const router = express.Router();

router.get('/', getAllOrders);
router.get('/:id', validateMongoId, getOrderById);
router.patch('/:id/status', validateMongoId, updateOrderStatus);
router.delete('/:id', validateMongoId, deleteOrder);

export default router;
