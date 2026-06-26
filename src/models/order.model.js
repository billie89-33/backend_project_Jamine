import mongoose from 'mongoose';
import crypto from 'crypto';
import { ORDER_STATUS } from '../constants/index.js';

const orderItemSchema = new mongoose.Schema({
    productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product', 
        required: true 
    },
    brand: String,      // Snapshot: แบรนด์ ณ วันที่ซื้อ
    modelName: String,  // Snapshot: ชื่อรุ่น ณ วันที่ซื้อ
    image: String,      // Snapshot: URL รูปภาพ ณ วันที่ซื้อ
    quantity: { 
        type: Number, 
        required: true,  
        min: [1, 'Quantity can not be less then 1'] 
    },
    priceAtPurchase: { 
        type: Number, 
        required: true 
    } // ล็อกราคา ณ วินาทีที่กดซื้อ
}, { _id: false });

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true,
        index: true
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true
    },
    items: [orderItemSchema],
    shippingAddress: {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String, required: true },
        province: { type: String, required: true },
        district: { type: String, required: true },
        subDistrict: { type: String, required: true },
        postalCode: { type: String, required: true }
    },
    subtotal: { 
        type: Number, 
        required: true 
    },
    shippingFee: { 
        type: Number, 
        required: true 
    },
    total: { 
        type: Number, 
        required: true 
    },
    status: {
        type: String,
        enum: Object.values(ORDER_STATUS),
        default: ORDER_STATUS.PENDING
    },
    paymentDetails: {
        method: String,
        paidAt: Date,
        transactionId: String
    },
    expiresAt: { 
        type: Date, 
        required: true 
    }, // เวลาหมดอายุเพื่อกวาดล้างและคืนสต็อก
    trackingNumber: {
        type: String,
        default: null,
        trim: true
    },
    shippedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Pre-save Middleware เพื่อสร้าง orderNumber อัตโนมัติ
orderSchema.pre('save', function () {
    if (!this.isNew) return;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`; 

    const randomStr = crypto.randomBytes(2).toString('hex').toUpperCase();

    this.orderNumber = `ORD-${dateStr}-${randomStr}`;
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
