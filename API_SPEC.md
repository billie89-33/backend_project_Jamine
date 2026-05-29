# Backend API Documentation (V1)

เอกสารนี้สรุปข้อมูล API ทั้งหมดที่จำเป็นสำหรับการพัฒนา Frontend เพื่อให้การเชื่อมต่อข้อมูลแม่นยำที่สุด

## 🌐 General Information
- **Base URL:** `http://localhost:4001/api/v1`
- **Authentication Method:** HttpOnly Cookie (JWT)
- **Cookie Name:** `accessToken`
- **Header Required:** ต้องส่ง `withCredentials: true` มาในทุก Request (หากใช้ Axios) เพื่อให้คุกกี้ถูกส่งไปด้วย

---

## 🔐 1. Authentication & Users
จัดการการเข้าสู่ระบบและข้อมูลโปรไฟล์

### **1.1 Login (เข้าสู่ระบบ)**
- **Path:** `POST /users/login`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response (Success):**
  ```json
  {
    "success": true,
    "message": "Logged in successfully",
    "data": { "_id": "...", "username": "...", "email": "...", "role": "user", "addresses": [] }
  }
  ```
- **Cookie:** ตั้งค่า `accessToken` อัตโนมัติในเบราว์เซอร์

### **1.2 Register (สมัครสมาชิก)**
- **Path:** `POST /users/register`
- **Body:**
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "password": "password123",
    "confirmPassword": "password123",
    "role": "user" (optional)
  }
  ```

### **1.3 Logout (ออกจากระบบ)**
- **Path:** `POST /users/logout`
- **Action:** ระบบจะเคลียร์คุกกี้ `accessToken` ออกจากเบราว์เซอร์

### **1.4 Get Me (ดึงข้อมูลผู้ใช้ปัจจุบัน)**
- **Path:** `GET /users/me`
- **Middleware:** ต้องล็อกอินก่อน (`protect`)
- **Response:** ข้อมูล User ทั้งหมด (ยกเว้นรหัสผ่าน) รวมถึงรายการ `addresses`

---

## 📦 2. Products
การดึงข้อมูลสินค้า

### **2.1 Get All Products (รายการสินค้า)**
- **Path:** `GET /products`
- **Query Parameters:**
  - `category`: กรองตามหมวดหมู่
  - `inStock`: `true` กรองเฉพาะที่มีของ
  - `minPrice` / `maxPrice`: กรองช่วงราคา
  - `page` / `limit`: ระบบ Pagination (Default: page 1, limit 10)
- **Response:**
  ```json
  {
    "success": true,
    "count": 10,
    "total": 50,
    "page": 1,
    "totalPages": 5,
    "data": [ { ...product } ]
  }
  ```

### **2.2 Get Single Product (รายละเอียดสินค้า)**
- **Path:** `GET /products/:id`

---

## 🛒 3. Cart
จัดการตะกร้าสินค้า (ต้องล็อกอิน)

### **3.1 Get Cart (ดูตะกร้า)**
- **Path:** `GET /cart`
- **Logic:** ระบบจะเช็คสต็อกและราคาสินค้าล่าสุดให้อัตโนมัติ หากสินค้าหมดหรือราคาเปลี่ยน ข้อมูลในตะกร้าจะถูกปรับปรุงและแจ้งผ่าน `isStockAdjusted`

### **3.2 Add to Cart (เพิ่มสินค้า)**
- **Path:** `POST /cart`
- **Body:** `{ "productId": "...", "quantity": 1 }`

### **3.3 Update Quantity (แก้ไขจำนวน)**
- **Path:** `PATCH /cart/update-quantity`
- **Body:** `{ "productId": "...", "quantity": 5 }` (ส่งจำนวนที่ต้องการเป็นค่าสัมบูรณ์)

### **3.4 Remove from Cart (ลบสินค้า)**
- **Path:** `DELETE /cart/:productId`

### **3.5 Cart Summary (สรุปยอดรวม)**
- **Path:** `GET /cart/summary`
- **Response:** `{ "success": true, "data": { "subtotal": 0, "shippingFee": 0, "total": 0, "itemCount": 0 } }`

---

## 💳 4. Orders & Checkout
ระบบสั่งซื้อและชำระเงิน (ต้องล็อกอิน)

### **4.1 Create Order (สั่งซื้อสินค้า)**
- **Path:** `POST /orders`
- **Body:**
  ```json
  {
    "addressId": "id_จาก_user_addresses" (เลือกจากที่อยู่เดิม),
    "shippingAddress": { ...manual_address } (หรือส่งที่อยู่ใหม่โดยตรง),
    "clientTotal": 1250 (ยอดรวมที่ Frontend คำนวณ เพื่อเทียบกับ Backend ป้องกันราคาเปลี่ยน)
  }
  ```
- **Note:** เมื่อสร้างออเดอร์สำเร็จ สินค้าจะถูกจอง (ตัดสต็อก) และต้องชำระเงินภายใน 15 นาที

### **4.2 Mock Payment (จำลองการชำระเงิน)**
- **Path:** `POST /orders/:orderId/mock-payment`
- **Action:** เปลี่ยนสถานะออเดอร์เป็น `Paid`

---

## 🏠 5. Address Management
จัดการที่อยู่จัดส่ง

- **Add Address:** `POST /users/addresses` (Body: ข้อมูลที่อยู่ครบชุด)
- **Delete Address:** `DELETE /users/addresses/:addressId`

---

## 🛠️ 6. Admin Products (🔒 Admin Only)
ระบบจัดการสินค้าสำหรับแอดมิน ใช้รูปแบบ **Single-Step Atomic Upload** (ส่งรูปและข้อมูลพร้อมกัน)

### **6.1 Create Product (เพิ่มสินค้าใหม่)**
- **Path:** `POST /admin/products`
- **Method:** `POST`
- **Content-Type:** `multipart/form-data`
- **Body Fields:**
  - `brand` (String): แบรนด์สินค้า (เช่น Asus, MSI)
  - `modelName` (String): ชื่อรุ่น (เช่น ROG Zephyrus G16)
  - `price` (Number): ราคาขาย
  - `sku` (String): รหัสสินค้า (ต้องไม่ซ้ำกัน)
  - `category` (String): หมวดหมู่ (`Notebook`, `Keyboard`, `Computer`, `Monitor`, `Gaming Mouse`)
  - `stock` (Number): จำนวนสต็อก (ห้ามติดลบ)
  - `specifications` (JSON String): สเปคสินค้า ส่งมาเป็นก้อน JSON String
    - *Example:* `{"CPU": "i9", "RAM": "32GB"}`
  - `image` (File): ไฟล์รูปภาพสินค้า (รองรับ jpg, png, webp)

### **6.2 Update Product (แก้ไขสินค้า)**
- **Path:** `PATCH /admin/products/:id`
- **Method:** `PATCH`
- **Content-Type:** `multipart/form-data`
- **Body Fields:** ส่งเฉพาะฟิลด์ที่ต้องการแก้ไข (Partial Update)
  - **การเปลี่ยนรูปภาพ:** หากต้องการเปลี่ยนรูป ให้ส่งไฟล์ใหม่มาที่ฟิลด์ `image` ระบบจะลบรูปเก่าทิ้งและอัปเดตรูปใหม่ให้อัตโนมัติ
  - **การแก้ไขสเปค:** การส่ง `specifications` มาแก้ไข จะเป็นการอัปเดตเฉพาะฟิลด์ที่ส่งมา (เช่น ส่ง `{"RAM": "64GB"}` มา ฟิลด์ CPU เดิมจะยังอยู่ไม่หายไป)

### **6.3 Delete Product (ลบสินค้า)**
- **Path:** `DELETE /admin/products/:id`
- **Action:** ลบข้อมูลในฐานข้อมูล พร้อมลบรูปภาพที่เกี่ยวข้องออกจาก Cloud Storage ทันที

---

## ⚠️ Common Error Codes
- `400 Bad Request`: ข้อมูลที่ส่งมาไม่ครบ หรือไม่ถูกต้องตามเงื่อนไข (เช่น รหัสผ่านสั้นไป)
- `401 Unauthorized`: ไม่ได้ล็อกอิน หรือคุกกี้หมดอายุ
- `403 Forbidden`: สิทธิ์ไม่เพียงพอ (เช่น ไม่ใช่ Admin)
- `404 Not Found`: ไม่พบข้อมูลที่ระบุ (Product ID หรือ User ID ผิด)
- `500 Internal Server Error`: ข้อผิดพลาดที่เซิร์ฟเวอร์
