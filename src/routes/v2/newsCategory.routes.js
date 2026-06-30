import express from 'express';
import { getAllCategories } from '../../controllers/v2/newsCategory.controller.js';

const router = express.Router();

router.get('/', getAllCategories);

export default router;
