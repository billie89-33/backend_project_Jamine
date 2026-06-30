import express from 'express';
import { getBanners } from '../../controllers/v2/banners.controller.js';

const router = express.Router();

router.get('/', getBanners);

export default router;
