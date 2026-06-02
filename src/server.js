import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import morgan from 'morgan';
import connectDB from './config/mongodb.js';
import apiRoutes from './routes/index.js';
import errorHandler from './middlewares/error.middleware.js';
import { globalLimiter } from './middlewares/rateLimit.middleware.js';

const app = express();
const PORT = process.env.PORT || 4001;
const isProd = process.env.NODE_ENV === 'production';


connectDB();

if (isProd) {
    app.set('trust proxy', 1);
}

// Middleware

app.use(cors({
    origin: isProd ? process.env.CLIENT_URL : 'http://localhost:5173', 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

// HTTP Request Logger (แสดงข้อมูลการยิง API ใน Terminal)
if (!isProd) {
    app.use(morgan('dev'));
}

app.use(globalLimiter); 


app.use(express.json());
app.use(cookieParser());


app.use('/api', apiRoutes);


app.use(errorHandler);


app.listen(PORT, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
