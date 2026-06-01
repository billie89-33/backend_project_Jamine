# 🛰️ 13. Admin Product API Mapping (Frontend-Backend Contract)

เอกสารฉบับนี้สรุปข้อตกลงในการเชื่อมต่อ API สำหรับระบบจัดการสินค้าเพื่อให้ทั้งฝั่ง Frontend และ Backend ทำงานสอดประสานกันตามมาตรฐาน **Surgical PATCH**, **Numeric Sanitization** และ **Media Lifecycle Management**

---

## 🛠️ API Routes Table

| ฟีเจอร์ (Frontend) | Method | Endpoint | Payload (Body/Params) | ความรับผิดชอบของ Backend |
| :--- | :--- | :--- | :--- | :--- |
| **ดึงรายการสินค้า (Public)** | `GET` | `/api/v1/products` | `Query`: category, page, limit, keyword, sort | ดึงเฉพาะสถานะ `active` พร้อม metadata: `total`, `totalPages`, `currentPage` |
| **ดึงรายการสินค้า (Admin)** | `GET` | `/api/v1/admin/products` | `Query`: status, category, page, limit, keyword | ดึงสินค้าทุกสถานะ พร้อมรองรับ Filtering และ Pagination |
| **ดึงรายละเอียด** | `GET` | `/api/v1/products/:id` | `Params`: `id` | ดึงข้อมูลสินค้า 1 ชิ้น พร้อมอัปเดต `viewCount` |
| **เพิ่มสินค้าใหม่** | `POST` | `/api/v1/admin/products` | `FormData`: `image` (file) + fields | **Atomic Upload**: บันทึกข้อมูลพร้อมรูป หาก DB Error จะลบรูปใน Cloudinary ทันที |
| **แก้ไขสินค้า (Surgical)** | `PATCH` | `/api/v1/admin/products/:id` | `JSON` หรือ `FormData` | **Surgical Update**: อัปเดตเฉพาะฟิลด์ที่ส่งมา หากเปลี่ยนรูปจะลบรูปเก่าอัตโนมัติ |
| **ลบสินค้า** | `DELETE` | `/api/v1/admin/products/:id` | `Params`: `id` | ลบไฟล์รูปใน Cloudinary และลบข้อมูลใน Database ถาวร |

---

## 💎 มาตรฐานการส่งข้อมูล (Data Standards)

### 1. 💉 Surgical PATCH & Dynamic Specs
- **Partial Update:** Frontend ส่งเฉพาะฟิลด์ที่เปลี่ยน (Dirty fields) เช่น `{ "price": 45000 }`
- **Specifications:** รองรับการอัปเดตฟิลด์ย่อยใน `specifications` โดยส่งเป็น JSON Object. Backend จะใช้ `$set` และ `$unset` เพื่อจัดการฟิลด์ย่อยโดยไม่กระทบส่วนอื่น

### 2. 🔢 Numeric Sanitization & Auto-Casting
- **Comma Handling:** Backend รองรับตัวเลขที่มีคอมม่าจาก Frontend (เช่น "1,250,000") โดยจะทำการ Sanitize ให้เป็นตัวเลขก่อนบันทึก
- **Type Casting:** จัดการแปลง String จาก `FormData` ให้เป็น Number (Price, Stock) และ Boolean (isFeatured) อัตโนมัติที่ระดับ Middleware

### 3. 🖼️ Media Lifecycle (Image Management)
- **Automatic Cleanup:** ทุกการ `DELETE` หรือ `UPDATE` รูปภาพ Backend จะลบไฟล์เก่าออกจาก Cloudinary ทันทีโดยใช้ `publicId`
- **Atomic Rollback:** หากการ `POST` สินค้าล้มเหลวในขั้นตอน Database รูปที่อัปโหลดไปแล้วจะถูกลบออกทันทีเพื่อป้องกัน Storage Leak

### 4. 🔒 Security & Auth
- **Admin Access:** ทุกเส้นทางที่มี `/admin/` ต้องใช้ `Protect` (JWT in HttpOnly Cookie) และมี Role เป็น `admin` เท่านั้น

---
*อัปเดตล่าสุดโดย Gemini CLI & Admin Team - 2026-06-01*
