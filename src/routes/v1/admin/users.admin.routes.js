import express from 'express';
import { 
    getUsers, 
    getCustomerSummary, 
    updateCustomerStatus, 
    deleteUser 
} from '../../../controllers/v1/admin/users.admin.controller.js';

const router = express.Router();

// 1. ดึงรายชื่อลูกค้าพร้อม Pagination และ Search
router.get('/', getUsers);

// 2. ดึงข้อมูลสรุปของลูกค้า 1 คน (Profile + ยอดรวมสั่งซื้อ)
router.get('/:id/summary', getCustomerSummary);

// 3. (Surgical Update) อัปเดตสถานะลูกค้า (Active <-> Banned)
router.patch('/:id/status', updateCustomerStatus);

// 4. ลบข้อมูลลูกค้า
router.delete('/:id', deleteUser);

export default router;
