import express from 'express';
import { getCategoryCovers } from '../../controllers/v2/categoryMetas.controller.js';

const router = express.Router();

router.get('/', getCategoryCovers);

export default router;
