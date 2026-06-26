import mongoose from 'mongoose';

/**
 * @desc    Category Meta Schema for storing premium dedicated category covers
 * @path    src/models/categoryMeta.model.js
 */
const categoryMetaSchema = new mongoose.Schema({
    categoryName: {
        type: String,
        required: [true, 'Please add a category name'],
        unique: true,
        trim: true,
        index: true
    },
    image: {
        url: { 
            type: String, 
            required: [true, 'Image URL is required'] 
        },
        publicId: { 
            type: String, 
            required: [true, 'Image Public ID is required'] 
        }
    }
}, { 
    timestamps: true 
});

const CategoryMeta = mongoose.model('CategoryMeta', categoryMetaSchema);

export default CategoryMeta;
