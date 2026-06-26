import express from 'express';
import { getCategoryCovers } from '../../controllers/v1/categoryMetas.controller.js';

const router = express.Router();

router.get('/', getCategoryCovers);

export default router;
