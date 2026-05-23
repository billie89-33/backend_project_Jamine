import express from 'express';
import { 
    getProducts, 
    getProduct, 
    createProduct, 
    updateProduct, 
    deleteProduct 
} from '../../controllers/v1/products.controller.js';
import { protect, admin } from '../../middlewares/auth.middleware.js';
import createUpload from '../../middlewares/upload.middleware.js';
import { validateMongoId } from '../../middlewares/validateId.middleware.js';

const router = express.Router();
const upload = createUpload('products');

// Public routes
router.get('/', getProducts);
router.get('/:id', validateMongoId, getProduct);

// Protected & Admin only routes
router.post('/', protect, admin, createProduct);

// Upload Product Image (Admin Only)
router.post('/upload', protect, admin, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please upload a file' });
    }
    res.status(200).json({
        success: true,
        data: {
            url: req.file.path, // Cloudinary URL
            publicId: req.file.filename // Cloudinary Public ID
        }
    });
});

router.put('/:id', protect, admin, validateMongoId, updateProduct);
router.patch('/:id', protect, admin, validateMongoId, updateProduct);
router.delete('/:id', protect, admin, validateMongoId, deleteProduct);

export default router;
