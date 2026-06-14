import express from 'express';
import { getAllCategories } from '../../controllers/v1/newsCategory.controller.js';

const router = express.Router();

router.get('/', getAllCategories);

export default router;
