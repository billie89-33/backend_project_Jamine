import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

/**
 * @desc    Function to create multer upload middleware for specific Cloudinary folder
 * @param   {string} folderName - Name of the folder in Cloudinary (e.g., 'products', 'users')
 * @returns {multer.Multer} - Multer instance
 */
const createUpload = (folderName) => {
    const folderPrefix = process.env.CLOUDINARY_FOLDER_PREFIX || 'jamine_store';
    const storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: `${folderPrefix}/${folderName}`, // Prefix from env variable
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            transformation: [{ width: 1000, height: 1000, crop: 'limit' }] // Optimization
        },
    });

    return multer({ 
        storage: storage,
        limits: { fileSize: 5 * 1024 * 1024 } // Limit 5MB
    });
};

export default createUpload;
