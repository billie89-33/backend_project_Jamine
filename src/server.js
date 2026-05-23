import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import connectDB from './config/mongodb.js';
import apiRoutes from './routes/index.js';
import errorHandler from './middlewares/error.middleware.js';

const app = express();
const PORT = process.env.PORT || 4001;
const isProd = process.env.NODE_ENV === 'production';

// Connect Database
connectDB();

// Trust Proxy สำหรับการรันหลัง Reverse Proxy อย่าง Render เพื่อให้ Cookie ทำงานถูกต้อง (secure: true)
if (isProd) {
    app.set('trust proxy', 1);
}

// Middleware
app.use(cors({
    origin: isProd ? process.env.CLIENT_URL : 'http://localhost:5173', 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api', apiRoutes);

// Centralized Error Handler (ต้องอยู่หลัง Routes)
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
