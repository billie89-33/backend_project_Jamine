import express from 'express';

const router = express.Router();

// Placeholder for products v1
router.get('/', (req, res) => {
    res.json({ message: 'Products v1 placeholder' });
});

export default router;
