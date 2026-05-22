import express from 'express';
import { 
    getUsers, 
    registerUser, 
    getUser, 
    updateUser, 
    deleteUser 
} from '../../controllers/v1/users.controller.js';

const router = express.Router();

router.get('/', getUsers);
router.post('/register', registerUser);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
