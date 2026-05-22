import express from 'express';
import mongoose from 'mongoose';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import connectDB from './config/mongodb.js';
import apiRoutes from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 4001;

// Connect Database
connectDB();

// Middleware
app.use(cors({
    origin: 'http://localhost:5173', 
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api', apiRoutes);

// Basic Route
app.get('/', (req, res) => {
    res.send('Jamine Backend API is running');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
