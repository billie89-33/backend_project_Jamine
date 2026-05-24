import express from 'express';
import { getUsers, deleteUser } from '../../../controllers/v1/admin/users.admin.controller.js';

const router = express.Router();

router.get('/', getUsers);
router.delete('/:id', deleteUser);

export default router;
