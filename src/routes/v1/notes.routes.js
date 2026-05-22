import express from 'express';

const router = express.Router();

// Placeholder for notes v1
router.get('/', (req, res) => {
    res.json({ message: 'Notes v1 placeholder' });
});

export default router;
