import cloudinary from '../config/cloudinary.js';

/**
 * Validation Utility for Product Data
 */
export const validateProduct = (data, isUpdate = false) => {
    const errors = [];
    const categories = ['Notebook', 'Keyboard', 'Computer', 'Monitor', 'Gaming Mouse', 'Graphics Card', 'RAM', 'CPU', 'Mainboard'];

    if (!isUpdate) {
        if (!data.brand) errors.push('Brand is required');
        if (!data.modelName) errors.push('Model name is required');
        if (!data.description) errors.push('Description is required');
        if (!data.price) errors.push('Price is required');
        if (!data.sku) errors.push('SKU is required');
        if (!data.category) errors.push('Category is required');
    }

    if (data.price !== undefined && (isNaN(Number(data.price)) || Number(data.price) < 0)) {
        errors.push('Price must be a positive number');
    }

    if (data.stock !== undefined && (isNaN(Number(data.stock)) || Number(data.stock) < 0)) {
        errors.push('Stock cannot be negative');
    }

    if (data.category && !categories.includes(data.category)) {
        errors.push(`Invalid category. Must be one of: ${categories.join(', ')}`);
    }

    // Specification Validation: Must be a flat object of strings
    if (data.specifications) {
        let specs = data.specifications;
        if (typeof specs === 'string') {
            try {
                specs = JSON.parse(specs);
            } catch (e) {
                errors.push('Specifications must be a valid JSON string');
            }
        }
        
        if (specs && typeof specs === 'object' && !Array.isArray(specs)) {
            for (const [key, value] of Object.entries(specs)) {
                if (typeof value === 'object' && value !== null) {
                    errors.push(`Nested objects are not allowed in specifications (Key: ${key})`);
                }
            }
        } else if (specs !== undefined) {
            errors.push('Specifications must be an object');
        }
    }

    return { isValid: errors.length === 0, errors };
};

/**
 * Middleware for Product POST/PATCH/PUT
 */
export const productValidationMiddleware = async (req, res, next) => {
    const isUpdate = req.method === 'PATCH' || req.method === 'PUT';
    const { isValid, errors } = validateProduct(req.body, isUpdate);

    if (!isValid) {
        // 🔥 CRITICAL: If validation fails, delete the file uploaded by Multer immediately
        if (req.file && req.file.filename) {
            try {
                await cloudinary.uploader.destroy(req.file.filename);
            } catch (cloudErr) {
                console.error('Cloudinary Cleanup Error:', cloudErr);
            }
        }
        const error = new Error(errors.join(', '));
        error.status = 400;
        return next(error);
    }

    next();
};

/**
 * Middleware for Product GET (Query Params)
 */
export const queryValidationMiddleware = (req, res, next) => {
    const { minPrice, maxPrice, page, limit } = req.query;
    const errors = [];

    if (minPrice && (isNaN(Number(minPrice)) || Number(minPrice) < 0)) errors.push('minPrice must be a positive number');
    if (maxPrice && (isNaN(Number(maxPrice)) || Number(maxPrice) < 0)) errors.push('maxPrice must be a positive number');
    if (page && (isNaN(Number(page)) || Number(page) < 1)) errors.push('page must be at least 1');
    if (limit && (isNaN(Number(limit)) || Number(limit) < 1)) errors.push('limit must be at least 1');

    if (errors.length > 0) {
        const error = new Error(errors.join(', '));
        error.status = 400;
        return next(error);
    }
    next();
};
