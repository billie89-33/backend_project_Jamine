# 💳 API Requirements: Checkout & Order System (v1)

เอกสารฉบับนี้สรุปโครงสร้างข้อมูล (Model), ตัวควบคุม (Controller) และเส้นทาง (Route) สำหรับระบบ Checkout เพื่อความแม่นยำในการเชื่อมต่อ Frontend

---

## 🏗 1. Data Model (Order Structure)

ระบบใช้การ **Snapshot** ข้อมูลสินค้าและที่อยู่ลงใน Order ทันทีเพื่อความปลอดภัยของข้อมูล

### **Shipping Address Schema (Structured)**
*ดูคู่มือการเชื่อมต่อ Auto-complete แบบละเอียดได้ที่: [ADVANCED_ADDRESS_GUIDE.md](./ADVANCED_ADDRESS_GUIDE.md)*
*แนะนำให้ Frontend ใช้ Library Auto-complete (เช่น `react-thailand-address`) เพื่อความสะดวกของผู้ใช้*

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `fullName` | String | ✅ | ชื่อ-นามสกุล ผู้รับ |
| `phone` | String | ✅ | เบอร์โทรศัพท์ติดต่อ |
| `address` | String | ✅ | บ้านเลขที่, ถนน, ซอย |
| `subDistrict` | String | ✅ | ตำบล / แขวง |
| `district` | String | ✅ | อำเภอ / เขต |
| `province` | String | ✅ | จังหวัด |
| `postalCode` | String | ✅ | รหัสไปรษณีย์ |

---

## 🛠 2. Controller Logic (Business Rules)

### **Create Order (`createOrder`)**
1.  **Address Priority:** ระบบเลือกที่อยู่ตามลำดับ: `manualAddress` (กรอกใหม่) > `addressId` (จากโปรไฟล์) > `isDefault` (ที่อยู่เริ่มต้น)
2.  **Stock Locking:** ใช้ระบบ Atomic Update หักสต็อกทันทีที่สร้างออเดอร์เพื่อป้องกันการจองซ้ำ
3.  **Price Verification:** ระบบตรวจสอบ `clientTotal` จากหน้าบ้าน เทียบกับ `total` ที่ Backend คำนวณจริง ถ้าไม่ตรงกัน (เช่นราคามีการเปลี่ยนแปลง) ระบบจะยกเลิกการจองและแจ้งเตือน
4.  **Auto-Expiration:** ออเดอร์มีอายุ **15 นาที** หากไม่ชำระเงิน ระบบจะคืนสต็อกและยกเลิกออเดอร์อัตโนมัติ

---

## 🛣 3. Routes & Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/orders` | Private | สร้างออเดอร์ใหม่ (Checkout) |
| `GET` | `/api/v1/orders/:orderId` | Private | ดูรายละเอียดออเดอร์ |
| `POST` | `/api/v1/orders/:orderId/mock-payment` | Private | จำลองการชำระเงิน (Idempotent) |

---

## 📦 4. Payload Example (POST /orders)

```json
{
  "clientTotal": 1250,
  "shippingAddress": {
    "fullName": "สมชาย ใจดี",
    "phone": "0812345678",
    "address": "123/45 หมู่บ้านโมเดิร์น",
    "subDistrict": "ดินแดง",
    "district": "เขตดินแดง",
    "province": "กรุงเทพมหานคร",
    "postalCode": "10400"
  }
}
```

---

## 💡 Frontend Implementation Tips
*   **Address Auto-complete:** เมื่อผู้ใช้กรอกรหัสไปรษณีย์ ให้ใช้ Library ดึงค่า `province`, `district`, `subDistrict` มาใส่ใน Hidden fields หรือ Disabled inputs
*   **Payment Timer:** ควรแสดง Countdown 15 นาทีให้ผู้เห็น เพื่อกระตุ้นการชำระเงินก่อนออเดอร์หมดอายุ
*   **Final Verification:** ก่อนส่ง `POST /orders` ให้แน่ใจว่ายอดรวมในหน้าบ้านตรงกับยอดล่าสุดที่ได้รับจาก `GET /cart/summary`

---
*Created by Gemini CLI Agent - Project Jamine*
