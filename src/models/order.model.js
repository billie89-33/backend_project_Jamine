import mongoose from 'mongoose';

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
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
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
        enum: ['Awaiting Payment', 'Paid', 'Cancelled'],
        default: 'Awaiting Payment'
    },
    paymentDetails: {
        method: String,
        paidAt: Date,
        transactionId: String
    },
    expiresAt: { 
        type: Date, 
        required: true 
    } // เวลาหมดอายุเพื่อกวาดล้างและคืนสต็อก
}, {
    timestamps: true
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
