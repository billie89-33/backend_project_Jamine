import prisma from '../../config/prisma.js';
import { PRODUCT_STATUS } from '../../constants/index.js';

// @desc    Get all products
// @route   GET /api/v2/products
// @access  Public
export const getProducts = async (req, res, next) => {
    try {
        const where = {
            status: { in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.OUT_OF_STOCK] }
        };

        // Category Filter
        if (req.query.category && req.query.category !== 'All') {
            where.category = { equals: req.query.category, mode: 'insensitive' };
        }

        // Brand Filter
        if (req.query.brand) {
            const brandsArray = req.query.brand.split(',').map(b => b.trim()).filter(Boolean);
            if (brandsArray.length > 0) {
                // Prisma currently requires exact match for 'in' with mode insensitive, 
                // but we can map them to OR for safe insensitive matching
                where.OR = where.OR || [];
                brandsArray.forEach(b => {
                    where.OR.push({ brand: { equals: b, mode: 'insensitive' } });
                });
            }
        }

        // Featured Filter
        if (req.query.isFeatured) {
            where.isFeatured = req.query.isFeatured === 'true';
        }

        // InStock Filter
        if (req.query.inStock === 'true') {
            where.stock = { gt: 0 };
        }

        // Keyword Search
        if (req.query.keyword) {
            const keyword = req.query.keyword;
            where.OR = where.OR || [];
            where.OR.push(
                { modelName: { contains: keyword, mode: 'insensitive' } },
                { brand: { contains: keyword, mode: 'insensitive' } },
                { description: { contains: keyword, mode: 'insensitive' } }
            );
            // Notice: tags array in Prisma can be searched via hasSome / has
            where.OR.push({ tags: { has: keyword } }); 
        }

        // Price Filter
        if (req.query.minPrice || req.query.maxPrice) {
            where.price = {};
            const minP = Number(req.query.minPrice);
            const maxP = Number(req.query.maxPrice);

            if (!isNaN(minP)) where.price.gte = minP;
            if (!isNaN(maxP)) where.price.lte = maxP;
        }

        // Dynamic Specification Filter (JSON)
        Object.keys(req.query).forEach(key => {
            if (key.startsWith('spec_')) {
                const specName = key.replace('spec_', '');
                const specValue = req.query[key];
                const valuesArray = Array.isArray(specValue) ? specValue : [specValue];

                // JSON filtering in Prisma requires specific formatting
                where.AND = where.AND || [];
                
                // Construct an OR condition for each possible value of this spec
                const specOrConditions = valuesArray.map(val => ({
                    specifications: {
                        path: [specName],
                        equals: val
                    }
                }));

                where.AND.push({ OR: specOrConditions });
            }
        });

        // Pagination
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, parseInt(req.query.limit, 10) || 12);
        const skip = (page - 1) * limit;

        // Sorting
        let orderBy = { createdAt: 'desc' };
        if (req.query.sort === 'price_asc') orderBy = { price: 'asc' };
        if (req.query.sort === 'price_desc') orderBy = { price: 'desc' };
        if (req.query.sort === 'oldest') orderBy = { createdAt: 'asc' };
        if (req.query.sort === 'best_seller') orderBy = { soldCount: 'desc' };

        // Query Database
        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                orderBy,
                skip,
                take: limit
            }),
            prisma.product.count({ where })
        ]);

        res.status(200).json({
            success: true,
            count: products.length,
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            data: products
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single product detail
// @route   GET /api/v2/products/:id
// @access  Public
export const getProduct = async (req, res, next) => {
    try {
        const product = await prisma.product.update({
            where: { id: req.params.id },
            data: { viewCount: { increment: 1 } }
        });

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        // Handle Not Found Error in Prisma
        if (error.code === 'P2025' || error.code === 'P2023') {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        next(error);
    }
};

// @desc    Get all unique categories with representative images
// @route   GET /api/v2/products/categories
// @access  Public
export const getCategories = async (req, res, next) => {
    try {
        // Prisma allows fetching distinct values directly
        const categories = await prisma.product.findMany({
            where: {
                status: { in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.OUT_OF_STOCK] }
            },
            distinct: ['category'],
            select: {
                category: true,
                imageUrl: true
            },
            orderBy: {
                createdAt: 'desc' // Gets the newest image for the category
            }
        });

        // Map to match frontend expectation { name: '...', image: '...' }
        const formattedCategories = categories.map(c => ({
            name: c.category,
            image: c.imageUrl
        })).sort((a, b) => a.name.localeCompare(b.name));

        res.status(200).json({
            success: true,
            data: formattedCategories
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all unique brands (optionally filtered by category)
// @route   GET /api/v2/products/brands
// @access  Public
export const getBrands = async (req, res, next) => {
    try {
        const where = {
            status: { in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.OUT_OF_STOCK] }
        };

        if (req.query.category && req.query.category !== 'All') {
            where.category = { equals: req.query.category, mode: 'insensitive' };
        }

        const brands = await prisma.product.findMany({
            where,
            distinct: ['brand'],
            select: { brand: true }
        });

        res.status(200).json({
            success: true,
            data: brands.map(b => b.brand)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all unique specification keys used in a category
// @route   GET /api/v2/products/spec-keys
// @access  Public
export const getSpecKeys = async (req, res, next) => {
    try {
        const { category } = req.query;

        if (!category) {
            return res.status(400).json({ success: false, message: 'Category is required' });
        }

        // Using PostgreSQL Raw Query to extract unique keys from JSONB column
        // Extremely efficient for parsing JSON keys
        const result = await prisma.$queryRaw`
            SELECT DISTINCT key
            FROM "Product", jsonb_each_text("specifications")
            WHERE category ILIKE ${category}
            ORDER BY key ASC
        `;

        const keys = result.map(row => row.key);

        res.status(200).json({
            success: true,
            data: keys
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all unique specification values for filters
// @route   GET /api/v2/products/spec-filters
// @access  Public
export const getSpecFilters = async (req, res, next) => {
    try {
        const { category } = req.query;

        if (!category || category === "All") {
            return res.status(200).json({ success: true, data: {} });
        }

        // Using PostgreSQL Raw Query to extract grouped key-values from JSONB
        const result = await prisma.$queryRaw`
            SELECT key, jsonb_agg(DISTINCT value) as values
            FROM "Product", jsonb_each_text("specifications") as spec(key, value)
            WHERE category ILIKE ${category} 
              AND status IN (${PRODUCT_STATUS.ACTIVE}, ${PRODUCT_STATUS.OUT_OF_STOCK})
            GROUP BY key
        `;

        const filters = result.reduce((acc, curr) => {
            acc[curr.key] = curr.values.sort();
            return acc;
        }, {}); 

        res.status(200).json({
            success: true,
            data: filters
        });
    } catch (error) {
        next(error);
    }
};
