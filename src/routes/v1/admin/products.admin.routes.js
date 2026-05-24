import express from 'express';
import { createProduct, updateProduct, deleteProduct } from '../../../controllers/v1/admin/products.admin.controller.js';
import createUpload from '../../../middlewares/upload.middleware.js';
import { validateMongoId } from '../../../middlewares/validateId.middleware.js';

const router = express.Router();
const upload = createUpload('products');

router.post('/', createProduct);

// Upload Product Image (Admin Only)
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

router.put('/:id', validateMongoId, updateProduct);
router.patch('/:id', validateMongoId, updateProduct);
router.delete('/:id', validateMongoId, deleteProduct);

export default router;
