# 🚚 Backend Spec: Simplified Shipping Tracking (Updated)

**เป้าหมาย:** เพิ่มระบบบันทึก "เลขพัสดุ (Tracking Number)" เข้าไปในออเดอร์ เมื่อแอดมินทำการจัดส่งสินค้า (เปลี่ยนสถานะเป็น Shipped) โดยมีระบบตรวจสอบความถูกต้อง (Validation) ที่รัดกุม

---

## ⚠️ 1. อัปเดต Constants (ป้องกัน Enum Conflict)
**ไฟล์ที่ต้องแก้ไข:** `src/constants/order.js` (หรือไฟล์ที่เก็บค่าคงที่ของสถานะออเดอร์)

**สิ่งที่ต้องทำ:** ต้องแน่ใจว่า Array หรือ Object ที่ใช้กำหนดสถานะออเดอร์ มีสถานะใหม่ครบถ้วน เพื่อป้องกัน Mongoose โยน Error `ValidationError` เมื่อพยายามบันทึกสถานะ `Shipped`

```javascript
// ตัวอย่างการเพิ่มสถานะให้ครบ
export const ORDER_STATUS = {
    PENDING: 'Awaiting Payment',
    PAID: 'Paid',
    PROCESSING: 'Processing', // ➕ เพิ่ม
    SHIPPED: 'Shipped',       // ➕ เพิ่ม
    DELIVERED: 'Delivered',   // ➕ เพิ่ม
    CANCELLED: 'Cancelled'
};
// หรืออัปเดต Array ที่ใช้ใน Enum ให้มีค่าเหล่านี้ครบถ้วน
```

---

## 🏗️ 2. อัปเดต Order Model (Database Schema)
ต้องเพิ่มฟิลด์สำหรับเก็บเลขพัสดุเข้าไปใน Schema ของ Order

**ไฟล์ที่ต้องแก้ไข:** `src/models/order.model.js`

```javascript
// เพิ่มฟิลด์ trackingNumber เข้าไปใน orderSchema
const orderSchema = new mongoose.Schema({
    // ... ฟิลด์เดิมที่มีอยู่แล้ว ...
    
    // ➕ ฟิลด์ใหม่ที่ต้องเพิ่ม:
    trackingNumber: {
        type: String,
        default: null,
        trim: true
    }
}, {
    timestamps: true
});

// 💡 หมายเหตุ: ตรวจสอบให้แน่ใจว่าฟิลด์ 'status' ใน Schema ดึงค่า Enum จาก Constants ในข้อ 1 มาใช้อย่างถูกต้อง
```

---

## ⚙️ 3. ปรับปรุงการอัปเดตสถานะ (Update Order Controller)
ปรับปรุงฟังก์ชัน `updateOrderStatus` ให้รับค่า `trackingNumber` และ **บังคับ (Require)** ให้ต้องใส่เลขพัสดุเมื่อเปลี่ยนสถานะเป็น `Shipped`

**เส้นทาง API:** `PATCH /api/v1/admin/orders/:id/status`

**ไฟล์ที่ต้องแก้ไข:** `src/controllers/v1/admin/orders.admin.controller.js` (แก้ที่ฟังก์ชัน `updateOrderStatus`)

```javascript
export const updateOrderStatus = async (req, res, next) => {
    try {
        // ➕ 1. รับค่า trackingNumber เพิ่มเติมจาก req.body
        const { status, trackingNumber } = req.body; 
        
        // 💡 แนะนำให้ดึง allowedStatuses มาจาก Constants ในข้อ 1 แทนการ Hardcode
        const allowedStatuses = ['Awaiting Payment', 'Paid', 'Cancelled', 'Processing', 'Shipped', 'Delivered'];

        if (!allowedStatuses.includes(status)) {
            const error = new Error('Invalid status');
            error.status = 400;
            throw error;
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            const error = new Error('Order not found');
            error.status = 404;
            throw error;
        }

        // ... (Logic เดิมของ การคืนสต็อก Cancelled และการบวกยอดขาย Paid ยังคงเหมือนเดิม) ...

        // ➕ 2. Logic การบันทึกและตรวจสอบเลขพัสดุ (Strict Validation)
        if (status === 'Shipped') {
            // บังคับว่าถ้าจะส่งของ ต้องมีเลขพัสดุเสมอ
            if (!trackingNumber || trackingNumber.trim() === '') {
                const error = new Error('กรุณาระบุเลขพัสดุก่อนทำการจัดส่งสินค้า (Tracking Number is required)');
                error.status = 400;
                throw error;
            }
            order.trackingNumber = trackingNumber.trim();
        }

        order.status = status;
        await order.save();

        res.status(200).json({
            success: true,
            message: `Order status updated to ${status}`,
            data: order 
        });
    } catch (error) {
        next(error);
    }
};
```

---

## 🔍 4. การคืนค่าให้ลูกค้า (Get Order Controllers)
**ไฟล์ที่เกี่ยวข้อง:** `src/controllers/v1/orders.controller.js`

**สิ่งที่ต้องทำ:** ปกติในฟังก์ชัน `getOrderById` หรือ `getMyOrders` หากมีการใช้คำสั่ง `.lean()` อยู่แล้ว ทันทีที่ Database มีฟิลด์ `trackingNumber` ข้อมูลนี้จะถูกดึงติดมาส่งให้ Frontend อัตโนมัติ **ไม่จำเป็นต้องแก้ไขโค้ดเพิ่ม** แต่ควรตรวจสอบเพื่อความแน่ใจว่าไม่มีการ Filter กีดกันฟิลด์นี้ออกไป

**หน้าตา Response ที่ Frontend คาดหวัง:**
```json
{
    "success": true,
    "data": {
        "_id": "...",
        "status": "Shipped",
        "trackingNumber": "KRY123456789TH",
        // ... ข้อมูลออเดอร์อื่นๆ
    }
}
```
