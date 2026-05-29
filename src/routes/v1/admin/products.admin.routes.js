import express from 'express';
import { createProduct, updateProduct, deleteProduct } from '../../../controllers/v1/admin/products.admin.controller.js';
import createUpload from '../../../middlewares/upload.middleware.js';
import { validateMongoId } from '../../../middlewares/validateId.middleware.js';

const router = express.Router();
const upload = createUpload('products');

router.post('/', upload.single('image'), createProduct);

// Upload Product Image (Admin Only) - Keep as utility if needed, but main creation is now integrated
router.post('/upload', upload.single('image'), (req, res) => {
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

router.put('/:id', validateMongoId, upload.single('image'), updateProduct);
router.patch('/:id', validateMongoId, upload.single('image'), updateProduct);
router.delete('/:id', validateMongoId, deleteProduct);

export default router;
