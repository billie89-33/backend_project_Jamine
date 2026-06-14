import express from 'express';
import { getAllNews, getNewsById } from '../../controllers/v1/news.controller.js';
import { validateMongoId } from '../../middlewares/validateId.middleware.js';

const router = express.Router();

router.get('/', getAllNews);
router.get('/:id', validateMongoId, getNewsById);

export default router;
