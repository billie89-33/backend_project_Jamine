# 🚚 Backend Spec: Shipping & Tracking (Final)

**เป้าหมาย:** ระบบบันทึกเลขพัสดุ (Tracking Number) พร้อมระบบตรวจสอบความถูกต้องเมื่อเปลี่ยนสถานะเป็น Shipped

---

## ⚠️ 1. Constants (src/constants/order.js)
มีการเพิ่มสถานะใหม่เข้าไปใน ORDER_STATUS เพื่อรองรับวงจรการจัดส่ง:
- Processing: กำลังจัดเตรียมสินค้า
- Shipped: จัดส่งแล้ว (ต้องมีเลขพัสดุ)
- Delivered: ลูกค้าได้รับสินค้าแล้ว

---

## 📑 2. Order Model (src/models/order.model.js)
เพิ่มฟิลด์ trackingNumber สำหรับเก็บเลขพัสดุ:
- trackingNumber: { type: String, default: null, trim: true }

---

## ⚙️ 3. Admin Update Status API
**Endpoint:** PATCH /api/v1/admin/orders/:id/status

**Rules:**
- เมื่อส่งสถานะเป็น Shipped ต้อง ส่ง trackingNumber มาด้วยเสมอ
- หากไม่ส่งเลขพัสดุมา ระบบจะตอบกลับด้วย Error 400

**Request Example (Admin):**
```json
{
    "status": "Shipped",
    "trackingNumber": "KRY123456789TH"
}
```

---

## 🔍 4. Order Detail API (User & Admin)
**Endpoint:** GET /api/v1/orders/:orderId หรือ GET /api/v1/admin/orders

**Response Example:**
ข้อมูลจะแนบ trackingNumber มาให้โดยอัตโนมัติหากสถานะเป็น Shipped ขึ้นไป:
```json
{
    "success": true,
    "data": {
        "_id": "...",
        "status": "Shipped",
        "trackingNumber": "KRY123456789TH",
        "orderNumber": "ORD-20260609-XXXX"
    }
}
```

---
*Status: Ready for Frontend Integration*
