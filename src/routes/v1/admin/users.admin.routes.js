import express from 'express';
import { 
    getUsers, 
    exportCustomers,
    getCustomerSummary, 
    updateUserByAdmin,
    updateCustomerStatus, 
    deleteUser 
} from '../../../controllers/v1/admin/users.admin.controller.js';

const router = express.Router();

// 1. ดึงรายชื่อลูกค้าพร้อม Pagination และ Search
router.get('/', getUsers);

// 2. ส่งออกข้อมูลลูกค้าเป็น CSV/JSON
router.get('/export', exportCustomers);

// 3. ดึงข้อมูลสรุปของลูกค้า 1 คน (Profile + Stats + Addresses)
router.get('/:id/summary', getCustomerSummary);

// 4. แก้ไขข้อมูลลูกค้าโดย Admin (Full Edit: Name, Email, Phone, Status)
router.patch('/:id', updateUserByAdmin);

// 5. (Legacy Surgical Update) อัปเดตสถานะลูกค้า (Active <-> Banned)
router.patch('/:id/status', updateCustomerStatus);

// 6. ลบข้อมูลลูกค้า
router.delete('/:id', deleteUser);

export default router;
