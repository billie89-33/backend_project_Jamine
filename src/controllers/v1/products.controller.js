import Product from '../../models/product.model.js';
import { PRODUCT_STATUS } from '../../constants/index.js';

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
export const getProducts = async (req, res, next) => {
    try {
        // 1. à¸à¸£à¸­à¸‡à¸ªà¸´à¸™à¸„à¹‰à¸²à¸—à¸µà¹ˆà¸žà¸£à¹‰à¸­à¸¡à¹à¸ªà¸”à¸‡à¸œà¸¥ (Active à¸«à¸£à¸·à¸­ Out of Stock)
        const queryObj = {
            status: { $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.OUT_OF_STOCK] }
        };

        // 2. à¸à¸£à¸­à¸‡à¸•à¸²à¸¡à¸«à¸¡à¸§à¸”à¸«à¸¡à¸¹à¹ˆà¸«à¸¥à¸±à¸ (Category) - à¸£à¸­à¸‡à¸£à¸±à¸š Case Insensitive
        if (req.query.category && req.query.category !== 'All') {
            queryObj.category = { $regex: `^${req.query.category}$`, $options: 'i' };
        }

        // ðŸŒŸ à¸à¸£à¸­à¸‡à¸•à¸²à¸¡à¹à¸šà¸£à¸™à¸”à¹Œ (à¸£à¸­à¸‡à¸£à¸±à¸šà¸«à¸¥à¸²à¸¢à¹à¸šà¸£à¸™à¸”à¹Œ)     
        if (req.query.brand) {
            // à¸«à¸™à¹‰à¸²à¸šà¹‰à¸²à¸™à¸ªà¹ˆà¸‡à¸¡à¸²à¹€à¸›à¹‡à¸™ "Logitech,Razer" à¹€à¸£à¸²à¸•à¹‰à¸­à¸‡à¸«à¸±à¹ˆà¸™à¹€à¸›à¹‡à¸™ Array
            const brandsArray = req.query.brand.split(',').map(b => b.trim()).filter(Boolean);

            if (brandsArray.length > 0) {
                // à¸ªà¸£à¹‰à¸²à¸‡à¹€à¸‡à¸·à¹ˆà¸­à¸™à¹„à¸‚ Regex à¹€à¸žà¸·à¹ˆà¸­à¹ƒà¸«à¹‰à¸„à¹‰à¸™à¸«à¸²à¹à¸šà¸š Case Insensitive (à¹„à¸¡à¹ˆà¸ªà¸™à¸žà¸´à¸¡à¸žà¹Œà¹€à¸¥à¹‡à¸/à¹ƒà¸«à¸à¹ˆ)
                queryObj.brand = {
                    $in: brandsArray.map(b => new RegExp(`^${b}$`, 'i'))
                };
            }
        }

        // 3. à¸à¸£à¸­à¸‡à¸ªà¸´à¸™à¸„à¹‰à¸²à¹à¸™à¸°à¸™à¸³ (isFeatured)
        if (req.query.isFeatured) {
            queryObj.isFeatured = req.query.isFeatured === 'true';
        }

        // 4. à¸à¸£à¸­à¸‡à¹€à¸‰à¸žà¸²à¸°à¸ªà¸´à¸™à¸„à¹‰à¸²à¸—à¸µà¹ˆà¸¡à¸µà¹ƒà¸™à¸ªà¸•à¹‡à¸­à¸ (In Stock)    
        if (req.query.inStock === 'true') {
            queryObj.stock = { $gt: 0 };
        }

        // 5. à¸£à¸°à¸šà¸šà¸„à¹‰à¸™à¸«à¸²à¸”à¹‰à¸§à¸¢à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡ (Search Keyword)
        if (req.query.keyword) {
            const keyword = req.query.keyword;
            queryObj.$or = [
                { modelName: { $regex: keyword, $options: 'i' } },
                { brand: { $regex: keyword, $options: 'i' } },
                { tags: { $regex: keyword, $options: 'i' } },
                { description: { $regex: keyword, $options: 'i' } }
            ];
        }

        // 6. à¸à¸£à¸­à¸‡à¸•à¸²à¸¡à¸Šà¹ˆà¸§à¸‡à¸£à¸²à¸„à¸² (Price Range: minPrice, maxPrice)
        if (req.query.minPrice || req.query.maxPrice) {
            queryObj.price = {};
            const minP = Number(req.query.minPrice);
            const maxP = Number(req.query.maxPrice);

            if (!isNaN(minP)) queryObj.price.$gte = minP;
            if (!isNaN(maxP)) queryObj.price.$lte = maxP;

            if (Object.keys(queryObj.price).length === 0) delete queryObj.price;
        }

        // 7. ðŸŒŸ Dynamic Specifications Filter
        Object.keys(req.query).forEach(key => {
            if (key.startsWith('spec_')) {
                const specName = key.replace('spec_', '');
                const specValue = req.query[key];
                const valuesArray = Array.isArray(specValue) ? specValue : [specValue];

                queryObj[`specifications.${specName}`] = {
                    $in: valuesArray.map(val => new RegExp(val, 'i'))
                };
            }
        });

        // 6. à¸£à¸°à¸šà¸šà¹à¸šà¹ˆà¸‡à¸«à¸™à¹‰à¸² (Pagination)
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, parseInt(req.query.limit, 10) || 12);
        const skip = (page - 1) * limit;

        // 7. à¸£à¸°à¸šà¸šà¹€à¸£à¸µà¸¢à¸‡à¸¥à¸³à¸”à¸±à¸š (Sorting)
        let sortBy = '-createdAt'; // à¸„à¹ˆà¸²à¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™: à¹ƒà¸«à¸¡à¹ˆà¸ªà¸¸à¸”à¹„à¸›à¹€à¸à¹ˆà¸²à¸ªà¸¸à¸”
        if (req.query.sort === 'price_asc') sortBy = 'price';
        if (req.query.sort === 'price_desc') sortBy = '-price';
        if (req.query.sort === 'oldest') sortBy = 'createdAt';
        if (req.query.sort === 'best_seller') sortBy = '-soldCount';

        // à¸„à¹‰à¸™à¸«à¸²à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸žà¸£à¹‰à¸­à¸¡à¹ƒà¸Šà¹‰à¸‡à¸²à¸™ Pagination à¹à¸¥à¸° Sorting   
        // à¸™à¸³ .select('-specifications') à¸­à¸­à¸à¸•à¸²à¸¡à¹à¸œà¸™ à¹€à¸žà¸·à¹ˆà¸­à¹ƒà¸«à¹‰ Frontend à¸¡à¸µà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸§à¸²à¸” UI
        const products = await Product.find(queryObj)
            .sort(sortBy)
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Product.countDocuments(queryObj);

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
// @route   GET /api/v1/products/:id
// @access  Public
export const getProduct = async (req, res, next) => {
    try {
        // ðŸŒŸ à¸­à¸±à¸›à¹€à¸”à¸•à¸¢à¸­à¸”à¸§à¸´à¸§ (viewCount) à¸—à¸¸à¸à¸„à¸£à¸±à¹‰à¸‡à¸—à¸µà¹ˆà¸¡à¸µà¸„à¸™à¸à¸”à¸”à¸¹à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { $inc: { viewCount: 1 } },
            { new: true }
        ).lean();

        if (!product) {
            const error = new Error('Product not found');
            error.status = 404;
            return next(error);
        }

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all unique categories with representative images
// @route   GET /api/v1/products/categories
// @access  Public
export const getCategories = async (req, res, next) => {
    try {
        const categories = await Product.aggregate([
            {
                $match: {
                    status: { $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.OUT_OF_STOCK] }
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $group: {
                    _id: "$category",
                    image: { $first: "$image.url" }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: "$_id",
                    image: 1
                }
            },
            {
                $sort: { name: 1 }
            }
        ]);
        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all unique brands (optionally filtered by category)
// @route   GET /api/v1/products/brands
// @access  Public
export const getBrands = async (req, res, next) => {
    try {
        const queryObj = {
            status: { $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.OUT_OF_STOCK] }
        };

        if (req.query.category && req.query.category !== 'All') {
            // Performance Optimization: Use exact match first if possible
            // If the frontend sends the canonical category name, this is much faster than regex
            queryObj.category = { $regex: `^${req.query.category}$`, $options: 'i' };
        }

        const brands = await Product.distinct('brand', queryObj);
        res.status(200).json({
            success: true,
            data: brands
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all unique specification keys used in a category
// @route   GET /api/v1/products/spec-keys
// @access  Public
export const getSpecKeys = async (req, res, next) => {
    try {
        const { category } = req.query;

        if (!category) {
            const error = new Error('Category is required');
            error.status = 400;
            return next(error);
        }

        // ðŸ§  à¹ƒà¸Šà¹‰ MongoDB Aggregation Pipeline à¹€à¸žà¸·à¹ˆà¸­à¸”à¸¶à¸‡ Unique Keys à¸­à¸­à¸à¸¡à¸²à¸ˆà¸²à¸ Map 'specifications'
        // à¹€à¸£à¸²à¹„à¸¡à¹ˆà¸à¸£à¸­à¸‡ Status à¸­à¸­à¸ à¹€à¸žà¸·à¹ˆà¸­à¹ƒà¸«à¹‰ Admin à¹„à¸”à¹‰ Template à¸—à¸µà¹ˆà¸„à¸£à¸šà¸–à¹‰à¸§à¸™à¸—à¸µà¹ˆà¸ªà¸¸à¸”à¸ˆà¸²à¸à¸ªà¸´à¸™à¸„à¹‰à¸²à¸—à¸¸à¸à¸•à¸±à¸§à¹ƒà¸™à¸«à¸¡à¸§à¸”à¸™à¸±à¹‰à¸™
        const result = await Product.aggregate([
            // 1. à¸à¸£à¸­à¸‡à¹€à¸­à¸²à¹€à¸‰à¸žà¸²à¸°à¸ªà¸´à¸™à¸„à¹‰à¸²à¹ƒà¸™à¸«à¸¡à¸§à¸”à¸«à¸¡à¸¹à¹ˆà¸—à¸µà¹ˆà¹€à¸¥à¸·à¸­à¸ (Case Insensitive)
            {
                $match: {
                    category: { $regex: `^${category}$`, $options: 'i' }
                }
            },

            // 2. à¹à¸›à¸¥à¸‡ specifications (Map Object) à¹ƒà¸«à¹‰à¸à¸¥à¸²à¸¢à¹€à¸›à¹‡à¸™ Array à¸‚à¸­à¸‡ Key
            {
                $project: {
                    specKeys: {
                        $map: {
                            input: { $objectToArray: "$specifications" },
                            as: "item",
                            in: "$$item.k"
                        }
                    }
                }
            },

            // 3. à¹à¸•à¸ Array à¸‚à¸­à¸‡ Key à¹ƒà¸«à¹‰à¸à¸¥à¸²à¸¢à¹€à¸›à¹‡à¸™ Document à¸¢à¹ˆà¸­à¸¢à¹†     
            { $unwind: "$specKeys" },

            // 4. à¸ˆà¸±à¸”à¸à¸¥à¸¸à¹ˆà¸¡à¸à¸¥à¸±à¸šà¸¡à¸²à¹€à¸žà¸·à¹ˆà¸­à¸à¸£à¸­à¸‡à¹€à¸­à¸²à¹€à¸‰à¸žà¸²à¸°à¸„à¹ˆà¸²à¸—à¸µà¹ˆà¹„à¸¡à¹ˆà¸‹à¹‰à¸³à¸à¸±à¸™ (Unique Keys) à¹à¸¥à¸°à¹€à¸£à¸µà¸¢à¸‡à¸¥à¸³à¸”à¸±à¸š
            {
                $group: {
                    _id: null,
                    uniqueKeys: { $addToSet: "$specKeys" }
                }
            },

            // 5. à¸›à¸±à¸”à¹€à¸¨à¸©à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹ƒà¸«à¹‰à¹€à¸«à¸¥à¸·à¸­à¹à¸„à¹ˆ Array à¸‚à¸­à¸‡ String (Optional: à¸ªà¸²à¸¡à¸²à¸£à¸–à¸—à¸³ Sort à¸—à¸µà¹ˆà¸™à¸µà¹ˆà¹„à¸”à¹‰)
            { $unwind: "$uniqueKeys" },
            { $sort: { "uniqueKeys": 1 } },
            { $group: { _id: null, data: { $push: "$uniqueKeys" } } }
        ]);

        const keys = result.length > 0 ? result[0].data : [];

        res.status(200).json({
            success: true,
            data: keys
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all unique specification values for filters
// @route   GET /api/v1/products/spec-filters
// @access  Public
export const getSpecFilters = async (req, res, next) => {
    try {
        const { category } = req.query;

        if (!category || category === "All") {
            return res.status(200).json({ success: true, data: {} });
        }

        const result = await Product.aggregate([
            {
                $match: {
                    category: { $regex: `^${category}$`, $options: "i" },
                    status: { $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.OUT_OF_STOCK] }
                }
            },
            {
                $project: {
                    specs: { $objectToArray: "$specifications" }
                }
            },
            { $unwind: "$specs" },
            {
                $group: {
                    _id: "$specs.k",
                    values: { $addToSet: "$specs.v" }
                }
            },
            {
                $project: {
                    _id: 0,
                    key: "$_id",
                    values: 1
                }
            }
        ]);

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

