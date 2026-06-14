import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'กรุณาระบุชื่อหมวดหมู่'], 
        unique: true, 
        trim: true 
    },
    slug: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true 
    },
    description: { 
        type: String,
        trim: true 
    }
}, { 
    timestamps: true 
});

// Middleware to auto-generate slug if not provided (optional, usually handled in controller)
// categorySchema.pre('validate', function(next) { ... });

const NewsCategory = mongoose.model('NewsCategory', categorySchema);

export default NewsCategory;
