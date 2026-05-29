# Jamine Store Backend 🚀
**High-Performance & Secure E-commerce REST API**

โปรเจกต์ Backend สำหรับระบบร้านค้าออนไลน์ พัฒนาด้วย **Node.js, Express และ MongoDB** โดยมุ่งเน้นที่การออกแบบสถาปัตยกรรมที่ยืดหยุ่น (Scalability) และความถูกต้องของข้อมูล (Data Integrity) เป็นสำคัญ

---

## 🛠️ Tech Stack
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JSON Web Token (JWT) with HttpOnly Cookie
- **Storage:** Cloudinary (Image Cloud Management)
- **API Testing:** httpyac / REST Client

---

## 🌟 High-Level Engineering Highlights (จุดเด่นทางเทคนิค)

### 1. Single-Step Atomic Upload Pattern
พัฒนาระบบการจัดการไฟล์อัปโหลดที่รวมการส่งข้อมูลและไฟล์ไว้ใน Request เดียว (`multipart/form-data`) พร้อมระบบ **Atomic Cleanup**:
- **ความปลอดภัย:** หากการบันทึกฐานข้อมูลล้มเหลว ระบบจะสั่ง Rollback ลบไฟล์ออกจาก Cloudinary ทันที เพื่อป้องกัน Storage Leak (ไฟล์ขยะค้างบน Cloud)
- **UX:** Frontend จัดการสถานะการส่งข้อมูลได้ง่ายขึ้น ลดขั้นตอนการทำงาน

### 2. Defensive Inventory Management
ระบบจัดการสต็อกสินค้าที่มีความทนทานสูง:
- **Stock Reservation:** สินค้าจะถูกจองทันทีเมื่อสร้างออเดอร์ และมีระบบคืนสต็อกอัตโนมัติหากออเดอร์หมดอายุหรือการชำระเงินไม่สำเร็จ
- **Atomic Stock Update:** ใช้คำสั่ง `$inc` ร่วมกับเงื่อนไขตรวจสอบสต็อกในระดับ Database เพื่อป้องกันปัญหา Race Condition (สต็อกติดลบ)

### 3. Flexible Categorization & Specification
ออกแบบ Schema ให้รองรับสินค้าที่มีความหลากหลายสูง:
- **Mongoose Map:** ใช้ Map สำหรับเก็บสเปคสินค้า ช่วยให้แต่ละประเภทสินค้ามีฟิลด์ที่ไม่เหมือนกันได้โดยไม่ต้องแก้ Schema
- **Partial Update (Dot Notation):** ระบบอัปเดตข้อมูลที่ฉลาด โดยจะแก้ไขเฉพาะฟิลด์ที่ส่งมา ทำให้ข้อมูลส่วนอื่นไม่สูญหาย

### 4. Advanced Security Architecture
- **Centralized Admin Security:** แยกโมดูล Admin ออกจาก User ปกติชัดเจน และใช้ Middleware ปกป้องทุกเส้นทาง
- **Token Protection:** เก็บ JWT ใน **HttpOnly Cookie** เพื่อป้องกันการโจมตีประเภท XSS
- **Storage Protection:** ระบบ Auto-replace รูปเก่าเมื่อมีการอัปเดตรูปใหม่ เพื่อจัดการพื้นที่จัดเก็บอย่างมีประสิทธิภาพ

---

## 📋 API Documentation Preview
ระบบมีการทำเอกสาร API อย่างละเอียด (มีไฟล์ `API_SPEC.md` แยกเฉพาะ) ครอบคลุม:
- **Authentication:** Login/Register/Logout/Get Me
- **Cart System:** Add/Update/Remove/Sync Stock
- **Order Flow:** Checkout/Address Selection/Payment Mockup
- **Admin Tools:** Full CRUD with Image Processing

---

## ⚙️ Installation & Setup
1. `npm install`
2. Configure `.env` (ดูตัวอย่างใน README)
3. `npm run dev` (Development) หรือ `npm start` (Production)
4. `npm test` เพื่อรัน Automated API Tests

---

## 🎯 Engineering Mindset
โปรเจกต์นี้ไม่ได้ถูกสร้างขึ้นเพื่อเพียงแค่ให้ทำงานได้ (Functionality) แต่ถูกสร้างขึ้นโดยคำนึงถึง **Reliability** และ **Maintainability** เป็นหลัก มีการจัดการ Edge Cases อย่างครอบคลุม เช่น การจัดการไฟล์ขยะ, การตรวจสอบราคาล่าสุดก่อน Checkout, และการทำ Product Snapshotting ในใบสั่งซื้อ
