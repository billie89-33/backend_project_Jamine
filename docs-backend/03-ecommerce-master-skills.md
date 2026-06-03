## สรุปมาตรฐานขั้นสูงที่นำมาใช้ (Advanced E-commerce Patterns)

เพื่อให้ระบบมีความน่าเชื่อถือระดับ Professional โปรเจกต์นี้ได้นำรูปแบบการพัฒนาเหล่านี้มาใช้:

1.  **Multi-Layered Inventory Protection**: ป้องกันสต็อกรวนด้วยการเช็ค 3 ชั้น (1. เช็คตอนเข้าตะกร้า 2. หักสต็อกแบบ Atomic ใน DB 3. คืนสต็อกอัตโนมัติเมื่อออเดอร์พังหรือหมดอายุ)
2.  **Order & Address Snapshotting**: บันทึกข้อมูลสินค้าและที่อยู่จัดส่งสำคัญลงในใบสั่งซื้อทันที เพื่อป้องกันข้อมูลหายเมื่อสินค้าหรือที่อยู่ถูกลบ/แก้ไขในภายหลัง และเพื่อเป็นหลักฐานที่ถูกต้อง ณ วันซื้อขาย
3.  **Flexible Address Resolution**: ระบบเลือกที่อยู่อัตโนมัติที่ฉลาด (Manual > Saved ID > Default) ช่วยลดขั้นตอนการสั่งซื้อ (Friction) และเพิ่มโอกาสในการปิดการขาย
4.  **Transactional Integrity**: มีระบบ Rollback สต็อกสินค้าทันทีหากเกิดข้อผิดพลาดในขั้นตอนสร้างออเดอร์ หรือเมื่อตรวจพบว่าราคาสินค้ามีการเปลี่ยนแปลง (Price Verification)
5.  **Administrative Audit Trail**: บันทึกหลักฐานการชำระเงินและรหัสธุรกรรม (Payment Evidence) ทุกครั้ง เพื่อความโปร่งใสและการตรวจสอบย้อนกลับโดย Admin
6.  **Cascading Visibility & Status Defense**: ระบบต้องมีการตรวจสอบสถานะสินค้า (`active`, `inactive`, `draft`) ในทุก Layer (1. Public List 2. Cart 3. Checkout) เพื่อป้องกันการสั่งซื้อสินค้าที่ถูกปิดการขาย (Shadow Selection Protection)
7.  **Auto-Sales & Popularity Tracking**: ระบบต้องอัปเดตยอดขายสะสม (`soldCount`) อัตโนมัติเมื่อออเดอร์เป็น `Paid` และยอดเข้าชม (`viewCount`) เมื่อดึงข้อมูลรายละเอียดสินค้า เพื่อใช้ในระบบสินค้าขายดี (Best Seller Sorting)
8.  **Performance Optimization**: ใช้ Bulk Write สำหรับงานจำนวนมาก, Pagination สำหรับรายการสินค้า และ Field Selection เพื่อลดขนาด Payload ของ API

---

# 🏆 The Ultimate E-Commerce API Skill: Cart, Checkout, and Payment

เอกสารฉบับนี้คือ "Master Skill" สำหรับการออกแบบระบบซื้อขายออนไลน์ระดับ Professional ที่ยืดหยุ่นและรองรับได้ทุกโปรเจกต์ (Universal Blueprint) เน้นความถูกต้องของข้อมูล (Data Integrity), ความปลอดภัย (Security) และประสบการณ์ผู้ใช้ (UX) สูงสุด

---

## 💎 1. ปรัชญาการออกแบบ: "Cart as the Last Stand"
**กฎเหล็ก:** ห้ามลบข้อมูลตะกร้าสินค้าจนกว่าเงินจะเข้าจริง!

### Why this is the Best?
*   **UX Recovery:** หากระบบจ่ายเงินพัง หรือลูกค้าเปลี่ยนใจกลางคัน เมื่อเขากลับมาที่ตะกร้า **"ของต้องยังอยู่"** ไม่ใช่หายวับไปจนต้องเริ่มใหม่
*   **Conversion Rate:** ลดแรงต้าน (Friction) ในการซื้อซ้ำหรือแก้ไขออเดอร์

---

## 🏗️ 2. โครงสร้างข้อมูลที่ต้องมี (The Blueprint)

### A. Order Snapshot (หัวใจของความถูกต้อง)
ห้ามอ้างอิง (Reference) ข้อมูลที่เปลี่ยนแปลงได้ในอนาคตลงในออเดอร์ ต้องทำ **Snapshot** เสมอ:
*   **Price Snapshot:** เก็บราคา ณ วินาทีที่กดซื้อ (ป้องกันราคาสินค้าเปลี่ยนในภายหลังแล้วออเดอร์เพี้ยน)
*   **Address Snapshot:** เก็บที่อยู่ละเอียด (ไม่ใช่แค่ ID) เพื่อเป็นหลักฐานทางกฎหมายและการจัดส่ง
*   **Product Info:** เก็บชื่อและรูปภาพหลักไว้ในออเดอร์ ป้องกันกรณีสินค้าถูกลบจากร้าน

### B. Order State Machine
สถานะต้องไหลไปตามทิศทางที่กำหนด (Valid Transitions):
*   `pending` ➔ `paid` (สำเร็จ)
*   `pending` ➔ `cancelled` (ล้มเหลว/หมดอายุ)
*   **ห้าม:** `cancelled` ➔ `paid` (ป้องกันการรับเงินจากออเดอร์ที่คืนสต็อกไปแล้ว)

---

## ⚡ 3. เทคนิคระดับสูง (Advanced Skills)

### 🔴 Atomic Stock Update (กันสต็อกติดลบ 100%)
ห้ามดึงค่ามาลบใน Code แล้วเซฟกลับ (Read-Modify-Write) ให้ใช้คำสั่งระดับ Database เสมอ:
```javascript
// ✅ รูปแบบที่ยืดหยุ่นและปลอดภัยที่สุด
const result = await Product.findOneAndUpdate(
  { _id: productId, stock: { $gte: quantity } }, // 🔒 เงื่อนไข: สต็อกต้องพอ
  { $inc: { stock: -quantity } },               // ⚡ หักลบแบบ Atomic
  { new: true, session }
);
if (!result) throw new Error("สินค้าในคลังไม่พอ");
```

### 🧹 Automatic Cleanup Pattern
เพื่อป้องกันการ "จองกั๊ก" ของจากออเดอร์ที่ค้างจ่าย:
1.  **On-Demand Cleanup:** เมื่อ User กด Checkout ใหม่ -> เช็คออเดอร์ `pending` เก่า -> คืนสต็อก -> ลบทิ้ง -> สร้างอันใหม่
2.  **Background Cleanup (Cron):** มีระบบรันทุก 5-10 นาที เพื่อยกเลิกออเดอร์ที่ค้างเกินเวลาที่กำหนด (เช่น 30 นาที)

### 🔒 Double-Lock Cart Clearing (ระบบล้างตะกร้าสองชั้น)
เพื่อให้ความชัวร์ 100% ว่าตะกร้าจะถูกล้างเมื่อจ่ายเงินสำเร็จ ระบบใหญ่ๆ จะใช้การล้างแบบ 2 ชั้น:
1.  **ชั้นที่ 1 (Backend-Driven):** เมื่อ API อัปเดตสถานะออเดอร์เป็น `paid` สำเร็จ ให้ Backend สั่งลบตะกร้าทันทีใน Logic เดียวกัน
2.  **ชั้นที่ 2 (Frontend-Driven):** เมื่อหน้าบ้านได้รับ Response ว่าจ่ายเงินสำเร็จ ก่อนจะ Navigate ไปหน้า `/complete` ให้ยิง API `DELETE /api/cart/clear` ซ้ำอีกรอบเพื่อความปลอดภัย (Double Check)

---

## ⚠️ 4. สิ่งที่ต้องระวังเป็นพิเศษ (Critical Precautions)

### 🚫 อย่าเชื่อใจ Frontend (Never Trust Client Data)
*   **Price:** ห้ามรับ "ราคาสินค้า" จากหน้าบ้าน ให้ใช้ราคาจาก Database ของหลังบ้านเท่านั้น
*   **Total Price:** แม้จะคำนวณราคามาให้จากหน้าบ้าน หลังบ้าน **ต้อง** คำนวณยอดรวมใหม่เองอีกครั้งเสมอ
*   **Validation:** ตรวจสอบราคารวมที่ลูกค้าเห็น (`clientTotal`) กับที่หลังบ้านคำนวณได้ ถ้าไม่ตรงกันให้หยุดการทำงานทันที

### 🚫 ป้องกันสต็อกรั่ว (Inventory Leak)
*   **ห้ามหักสต็อกตอนอยู่ในตะกร้า:** สต็อกควรถูกหัก (จอง) ในขั้นตอน Checkout เท่านั้น
*   **ต้องคืนสต็อกเสมอ:** ทุกครั้งที่ออเดอร์เปลี่ยนสถานะเป็น `cancelled` ไม่ว่าจะโดย User หรือระบบ Cron Job ต้องมี Logic คืนสินค้าเข้าคลังเสมอ

### 🚫 ความปลอดภัยของข้อมูล (Data Ownership)
*   **Ownership Check:** ทุกการเข้าถึงออเดอร์หรือที่อยู่ ต้องระบุ `{ _id: id, userId: req.user.id }` เสมอ เพื่อป้องกันไม่ให้คนอื่นเดา ID และเข้าถึงข้อมูลส่วนตัวได้

---

## 📋 5. สรุปขั้นตอน "The Best Flow"

| ขั้นตอน | การทำงานของ Backend | สถานะตะกร้า | การจัดการสต็อก |
| :--- | :--- | :--- | :--- |
| **1. Checkout** | สร้างออเดอร์ `pending` + ทำ Snapshot | **ยังอยู่ครบ** | หักสต็อกทันที (จอง) |
| **2. Payment Page** | แสดงข้อมูลจาก Order ID | **ยังอยู่ครบ** | คงที่ (จองไว้) |
| **3. Paid Success** | อัปเดตสถานะเป็น `paid` + **ลบตะกร้าชั้นที่ 1** | **ถูกลบ (Backend)** | คงที่ (ขายแล้ว) |
| **4. Final Complete** | Frontend ยิง `DELETE /cart/clear` (**ลบชั้นที่ 2**) | **ชัวร์ 100%** | จบกระบวนการ |

---
*Created by: Gemini CLI Assistant - The E-Commerce Master Suite*