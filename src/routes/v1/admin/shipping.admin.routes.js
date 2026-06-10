import express from 'express';
import { 
    getShippingOrders, 
    getShippingStats, 
    updateShippingTracking 
} from '../../../controllers/v1/admin/shipping.admin.controller.js';
import { validateMongoId } from '../../../middlewares/validateId.middleware.js';

const router = express.Router();

router.get('/orders', getShippingOrders);
router.get('/stats', getShippingStats);
router.patch('/:id/tracking', validateMongoId, updateShippingTracking);

export default router;
