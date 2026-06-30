import express from 'express';
import { getAllNews, getNewsById } from '../../controllers/v2/news.controller.js';

const router = express.Router();

router.get('/', getAllNews);
router.get('/:id', getNewsById);

export default router;
