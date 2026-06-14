import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'กรุณาระบุหัวข้อข่าว'], 
        trim: true 
    },
    content: { 
        type: String, 
        required: [true, 'กรุณาระบุเนื้อหาข่าว'] 
    }, // HTML String
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NewsCategory',
        required: [true, 'กรุณาระบุหมวดหมู่']
    },
    image: {
        publicId: { type: String, default: null },
        url: { type: String, required: [true, 'กรุณาระบุรูปภาพปกข่าว'] } // ภาพปก (Cloudinary)
    },
    author: { 
        type: String, 
        default: 'Admin' 
    },
    isPublished: { 
        type: Boolean, 
        default: true 
    },
    views: { 
        type: Number, 
        default: 0 
    }
}, { 
    timestamps: true 
});

// Performance Index
newsSchema.index({ category: 1 });
newsSchema.index({ createdAt: -1 });
newsSchema.index({ title: 'text', content: 'text' });

const News = mongoose.model('News', newsSchema);

export default News;
