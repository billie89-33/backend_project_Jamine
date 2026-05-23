import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    brand: {
        type: String,
        required: [true, 'Please add a brand']
    },
    modelName: {
        type: String,
        required: [true, 'Please add a model name']
    },
    price: {
        type: Number,
        required: [true, 'Please add a price']
    },
    image: {
        type: String,
        default: 'no-image.jpg'
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
        enum: ['Notebook', 'Keyboard', 'Computer', 'Monitor', 'Gaming Mouse']
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
