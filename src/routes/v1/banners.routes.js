import express from 'express';
import { getBanners } from '../../controllers/v1/banners.controller.js';

const router = express.Router();

// Public route: Get active banners (filterable by ?placement=...)
router.get('/', getBanners);

export default router;
