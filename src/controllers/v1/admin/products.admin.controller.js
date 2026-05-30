import Product from '../../../models/product.model.js';
import cloudinary from '../../../config/cloudinary.js';

// @desc    Create new product
// @route   POST /api/v1/admin/products
// @access  Private (Admin only)
export const createProduct = async (req, res, next) => {
    try {
        const productData = { ...req.body };

        // 1. จัดการรูปภาพที่ Multer อัปโหลดไว้ให้ชั่วคราว (Single-step Upload)
        if (req.file) {
            productData.image = {
                url: req.file.path,
                publicId: req.file.filename
            };
        } else {
            // กรณีไม่ได้ส่งรูปมา (Schema บังคับ แต่ดักไว้ก่อนเพื่อให้ Error ชัดเจน)
            const error = new Error('Please upload a product image');
            error.status = 400;
            throw error;
        }

        // 2. แปลงข้อมูล specifications และ tags (เพราะ multipart/form-data ส่งมาเป็น string)
        if (productData.specifications && typeof productData.specifications === 'string') {
            try {
                productData.specifications = JSON.parse(productData.specifications);
            } catch (err) {
                // ถ้า JSON Parse พัง ต้องลบรูปที่อัปโหลดไปแล้วทิ้งทันที (Cleanup)
                if (req.file && req.file.filename) {
                    await cloudinary.uploader.destroy(req.file.filename);
                }
                const error = new Error('Invalid format for specifications. Must be a valid JSON string.');
                error.status = 400;
                throw error;
            }
        }

        // จัดการฟิลด์ tags (ถ้าส่งมาเป็น string เช่น "New, Wireless")
        if (productData.tags && typeof productData.tags === 'string') {
            productData.tags = productData.tags
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag !== '');
        }

        // 3. สร้างสินค้าลง Database
        const product = await Product.create(productData);

        res.status(201).json({
            success: true,
            data: product
        });
    } catch (error) {
        // 🔥 ATOMIC CLEANUP: หากเกิด Error ใดๆ ในขั้นตอนนี้ (เช่น SKU ซ้ำ, Validation พัง)
        // ต้องลบรูปที่ค้างบน Cloudinary ทิ้งทันทีเพื่อป้องกัน Storage Leak
        if (req.file && req.file.filename) {
            await cloudinary.uploader.destroy(req.file.filename);
        }
        next(error);
    }
};

// @desc    Update product (Partial Update)
// @route   PATCH /api/v1/admin/products/:id
// @access  Private (Admin only)
export const updateProduct = async (req, res, next) => {
    try {
        const updateData = { ...req.body };
        const productId = req.params.id;

        // 1. ดึงข้อมูลสินค้าเดิมมาตรวจสอบ (จำเป็นต้องมีเพื่อจัดการรูปภาพ)
        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
            const error = new Error('Product not found');
            error.status = 404;
            throw error;
        }

        // 2. จัดการรูปภาพใหม่ (ถ้ามีการอัปโหลดผ่าน Single-step)
        if (req.file) {
            // ลบรูปเก่าใน Cloudinary ทันที
            if (existingProduct.image && existingProduct.image.publicId) {
                await cloudinary.uploader.destroy(existingProduct.image.publicId);
            }
            // ใส่ข้อมูลรูปใหม่ลงใน updateData
            updateData.image = {
                url: req.file.path,
                publicId: req.file.filename
            };
        } else if (updateData.image && typeof updateData.image === 'object' && updateData.image.publicId) {
            // กรณีส่งข้อมูลรูปภาพมาแบบ JSON (Two-step fallback หรือการแก้ไข field อื่นใน image)
            if (existingProduct.image && existingProduct.image.publicId !== updateData.image.publicId) {
                await cloudinary.uploader.destroy(existingProduct.image.publicId);
            }
        }

        // 3. แปลงข้อมูล specifications (Handle ทั้งแบบ JSON object และ JSON string จาก Form-data)
        let specs = updateData.specifications;
        if (specs && typeof specs === 'string') {
            try {
                specs = JSON.parse(specs);
            } catch (err) {
                // ถ้า Parse พัง และเพิ่งอัปรูปไป ต้องลบรูปใหม่ทิ้งด้วย
                if (req.file) await cloudinary.uploader.destroy(req.file.filename);
                const error = new Error('Invalid format for specifications. Must be a valid JSON string.');
                error.status = 400;
                throw error;
            }
        }

        // แปลง specifications ให้อยู่ในรูป Dot Notation เพื่อทำ Partial Update (ตามกฎ Agent.md)
        if (specs && typeof specs === 'object') {
            for (const [key, value] of Object.entries(specs)) {
                updateData[`specifications.${key}`] = value;
            }
            delete updateData.specifications;
        }

        // จัดการฟิลด์ tags (ถ้าส่งมาเป็น string เช่น "New, Wireless")
        if (updateData.tags && typeof updateData.tags === 'string') {
            updateData.tags = updateData.tags
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag !== '');
        }

        // 4. อัปเดตข้อมูลลง Database
        const product = await Product.findByIdAndUpdate(
            productId,
            { $set: updateData },
            {
                new: true,
                runValidators: true
            }
        );

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        // 🔥 หากเกิด Error และมีการอัปโหลดรูปใหม่ไปแล้ว ให้ลบรูปใหม่ทิ้งเพื่อกันขยะ
        if (req.file && req.file.filename) {
            await cloudinary.uploader.destroy(req.file.filename);
        }
        next(error);
    }
};

// @desc    Delete product
// @route   DELETE /api/v1/admin/products/:id
// @access  Private (Admin only)
export const deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            const error = new Error('Product not found');
            error.status = 404;
            return next(error);
        }

        // 1. ลบรูปภาพออกจาก Cloudinary ทันที (Storage Leak Fix)
        if (product.image && product.image.publicId) {
            await cloudinary.uploader.destroy(product.image.publicId);
        }

        // 2. ลบข้อมูลใน Database
        await product.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
