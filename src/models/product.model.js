import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
    url: {
        type: String,
        required: [true, 'Image URL is required']
    },
    publicId: {
        type: String,
        required: [true, 'Image public ID is required']
    }
}, { _id: false });

const productSchema = new mongoose.Schema({
    brand: {
        type: String,
        required: [true, 'Please add a brand']
    },
    modelName: {
        type: String,
        required: [true, 'Please add a model name']
    },
    description: {
        type: String,
        required: [true, 'Please add a product description'],
        trim: true
    },
    price: {
        type: Number,
        required: [true, 'Please add a price']
    },
    image: {
        type: imageSchema,
        required: [true, 'Please add a product image']
    },
    sku: {
        type: String,
        required: [true, 'Please add a SKU'],
        unique: true,
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Please add a category'],
        enum: ['Notebook', 'Keyboard', 'Computer', 'Monitor', 'Gaming Mouse', 'Graphics Card', 'RAM', 'CPU', 'Mainboard'],
        index: true
    },
    tags: {
        type: [String],
        default: [],
        index: true
    },
    stock: {
        type: Number,
        required: [true, 'Please add stock quantity'],
        min: [0, 'Stock cannot be negative'],
        default: 0
    },
    specifications: {
        type: Map,
        of: String,
        default: {}
    }
}, {
    timestamps: true
});

const Product = mongoose.model('Product', productSchema);

export default Product;
