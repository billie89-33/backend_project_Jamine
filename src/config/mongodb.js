import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        
        if (!uri) {
            throw new Error("MONGODB_URI is not defined in environment variables. Please check your .env file or Render settings.");
        }

        const conn = await mongoose.connect(uri, { dbName: "jsd12-express-app" });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
