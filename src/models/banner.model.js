import mongoose from 'mongoose';

/**
 * @desc    Banner Schema for Dynamic Advertising
 * @path    src/models/banner.model.js
 */
const bannerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a banner title'],
        trim: true
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
    },
    linkUrl: {
        type: String,
        default: ''
    },
    placement: {
        type: String,
        required: [true, 'Please specify banner placement'],
        enum: {
            values: ['home_hero', 'category_hero', 'promotion_bar', 'side_ad'],
            message: 'Placement must be home_hero, category_hero, promotion_bar, or side_ad'
        },
        index: true
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, { 
    timestamps: true 
});

// Indexing for faster retrieval
bannerSchema.index({ placement: 1, isActive: 1, order: 1 });

const Banner = mongoose.model('Banner', bannerSchema);

export default Banner;
