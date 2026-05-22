import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import connectDB from './config/mongodb.js';
import apiRoutes from './routes/index.js';
import errorHandler from './middlewares/error.middleware.js';

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

// Centralized Error Handler (ต้องอยู่หลัง Routes)
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
