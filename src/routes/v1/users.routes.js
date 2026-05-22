import express from 'express';

const router = express.Router();

// Mock data (จะนำไปแยกใส่ src/fakeData/fakeUser.js ภายหลัง)
let users = [
    { id: "1", username: "mockuser", email: "mock@example.com" }
];

// @desc    Get all users (v1 - Memory only)
router.get('/', (req, res) => {
    res.json({ success: true, data: users });
});

export default router;
