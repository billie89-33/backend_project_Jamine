# 🛒 Backend Cart System Documentation (v1)

เอกสารฉบับนี้สรุปรายละเอียดการทำงานของระบบ **ตะกร้าสินค้า (Cart)** สำหรับทีม Frontend เพื่อใช้ในการเชื่อมต่อ API และทำความเข้าใจโครงสร้างข้อมูล

---

## 🏗 1. Data Model (โครงสร้างข้อมูล)

ข้อมูลตะกร้าถูกเก็บใน MongoDB โดยผูกกับ `userId` (1 คนมี 1 ตะกร้า)

### **Cart Schema**
| Field | Type | Description |
| :--- | :--- | :--- |
| `userId` | ObjectId | ID ของผู้ใช้ (Ref: User) |
| `items` | Array | รายการสินค้าในตะกร้า (ดูรายละเอียดด้านล่าง) |
| `subtotal` | Number | ราคารวมสินค้าทั้งหมด (ยังไม่รวมค่าส่ง) |
| `shippingFee` | Number | ค่าจัดส่ง (คำนวณอัตโนมัติจากระบบ) |
| `total` | Number | ยอดรวมสุทธิที่ต้องจ่าย (`subtotal` + `shippingFee`) |

### **Cart Item (ใน items array)**
| Field | Type | Description |
| :--- | :--- | :--- |
| `productId` | ObjectId | ID ของสินค้า (Ref: Product) |
| `quantity` | Number | จำนวนที่สั่ง (ห้ามต่ำกว่า 1) |

---

## 🚀 2. API Endpoints (CRUD)

ทุก Endpoint ต้องแนบ **JWT Token** ผ่านทาง HttpOnly Cookie (`protect` middleware)

### **A. ดึงข้อมูลตะกร้าทั้งหมด**
*   **Method:** `GET`
*   **URL:** `/api/v1/cart`
*   **รายละเอียด:** ดึงรายการสินค้าทั้งหมดพร้อมข้อมูลสินค้าที่จำเป็น (Name, Price, Image, Stock) และคำนวณยอดเงินใหม่ล่าสุด
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "isStockAdjusted": false, // true ถ้ามีการปรับจำนวนอัตโนมัติเนื่องจากสต็อกไม่พอ
      "data": {
        "items": [
          {
            "productId": { "_id": "...", "modelName": "iPhone 15", "price": 35000, "image": "...", "stock": 10 },
            "quantity": 2
          }
        ],
        "subtotal": 70000,
        "shippingFee": 0,
        "total": 70000
      }
    }
    ```

### **B. ดึงข้อมูลสรุปยอด (Summary)**
*   **Method:** `GET`
*   **URL:** `/api/v1/cart/summary`
*   **รายละเอียด:** ใช้สำหรับแสดงในหน้า Checkout หรือ Widget เล็กๆ เพื่อความรวดเร็ว (ไม่ดึงข้อมูลสินค้าตัวเต็ม)
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "subtotal": 1200,
        "shippingFee": 0,
        "total": 1200,
        "itemCount": 5 // จำนวนชิ้นสินค้ารวมทั้งหมดในตะกร้า
      }
    }
    ```

### **C. เพิ่มสินค้าลงตะกร้า / เพิ่มจำนวน**
*   **Method:** `POST`
*   **URL:** `/api/v1/cart`
*   **Body:** `{ "productId": "...", "quantity": 1 }`
*   **รายละเอียด:** ถ้ามีสินค้าอยู่แล้วจะบวกจำนวนเพิ่ม ถ้ายังไม่มีจะสร้างรายการใหม่ (จำกัดสูงสุด 50 รายการ)
*   **Response (200 OK):** คืนค่า Cart ข้อมูลล่าสุด (เหมือน GET /cart)

### **D. อัปเดตจำนวนสินค้า (กำหนดค่าแน่นอน)**
*   **Method:** `PATCH`
*   **URL:** `/api/v1/cart/update-quantity`
*   **Body:** `{ "productId": "...", "quantity": 5 }`
*   **รายละเอียด:** ใช้ในหน้าตะกร้าเมื่อกดปุ่ม +/- หรือพิมพ์ตัวเลขเอง (ถ้าส่ง quantity = 0 จะเป็นการลบสินค้าออก)
*   **Response (200 OK):** คืนค่า Cart ข้อมูลล่าสุด

### **E. ลบสินค้าออกจากตะกร้า**
*   **Method:** `DELETE`
*   **URL:** `/api/v1/cart/:productId`
*   **รายละเอียด:** ลบสินค้านั้นๆ ออกจากตะกร้าทันที
*   **Response (200 OK):** คืนค่า Cart ข้อมูลล่าสุด

---

## 💡 3. Business Logic (กฎทางธุรกิจที่ต้องรู้)

1.  **Shipping Fee Logic (ค่าจัดส่ง):**
    *   ถ้า `subtotal` >= 1,000 บาท -> **ค่าส่งฟรี (0 บาท)**
    *   ถ้า `subtotal` < 1,000 บาท -> **ค่าส่ง 50 บาท**
    *   (ถ้าตะกร้าว่างเปล่า ค่าส่งจะเป็น 0)

2.  **Stock Validation:**
    *   ทุกครั้งที่มีการเรียกใช้ API ตะกร้า Backend จะเช็คสต็อกสินค้าจริงเสมอ
    *   ถ้าสินค้าในสต็อก **น้อยกว่า** จำนวนในตะกร้า: Backend จะปรับจำนวนลงให้เท่ากับสต็อกที่มีอยู่จริงอัตโนมัติ (และส่ง `isStockAdjusted: true` กลับไปเพื่อให้ Frontend แจ้งเตือนผู้ใช้)

3.  **Active Product Only:**
    *   สินค้าที่ถูกปิดการขาย (status != 'active') จะถูกลบออกจากตะกร้าโดยอัตโนมัติเมื่อมีการดึงข้อมูล

4.  **Security:**
    *   ระบบใช้ **Atomic Update** ป้องกันการสั่งของเกินสต็อก (Race Condition)
    *   ราคาที่ใช้คำนวณดึงมาจาก Database โดยตรง (ห้ามเชื่อราคาที่ส่งมาจาก Frontend)

---

## 🛠 4. ข้อแนะนำสำหรับ Frontend
*   ควรเรียก `GET /api/v1/cart/summary` เพื่ออัปเดต Badge จำนวนสินค้าใน Navbar
*   ในหน้าตะกร้าสินค้า (Cart Page) ให้ใช้ `GET /api/v1/cart` และสังเกตฟิลด์ `isStockAdjusted` เพื่อแสดง Alert บอกผู้ใช้หากสินค้ามีการเปลี่ยนแปลงจำนวนเนื่องจากสต็อกไม่พอ
*   แสดงราคาส่วนลด (Discount) เป็น ฿0 ไปก่อน (Frontend logic) เนื่องจาก Backend ยังไม่มีระบบคูปอง/ส่วนลดในเวอร์ชันนี้

---
*Created by Gemini CLI Agent - Project Jamine*
