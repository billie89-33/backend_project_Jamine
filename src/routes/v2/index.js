import express from 'express';
import usersRoutesV2 from './users.routes.js';
// import productsRoutesV2 from './products.routes.js';

const router = express.Router();

router.use('/users', usersRoutesV2);
// router.use('/products', productsRoutesV2);

export default router;
