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
