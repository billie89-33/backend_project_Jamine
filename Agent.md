# Backend Project Reference

เอกสารนี้สรุปโครงสร้างและการทำงานของโปรเจกต์ backend โดยอ่านจากไฟล์ในโปรเจกต์นี้และข้าม `node_modules`

## ภาพรวมโปรเจกต์

โปรเจกต์นี้เป็น REST API backend ด้วย Node.js, Express และ ES Modules ใช้ฐานข้อมูล 2 แบบ:

- MongoDB ผ่าน `mongoose`
- Supabase/PostgreSQL ผ่าน `@supabase/supabase-js`

ระบบหลักประกอบด้วย API versioning ที่ mount ใต้ `/api`, endpoint สำหรับ users และ products, ระบบ login/logout ด้วย JWT ที่เก็บใน HTTP-only cookie และ middleware ตรวจ token

## การรันโปรเจกต์

คำสั่งหลักอยู่ใน `package.json`

```bash
# รันในโหมดพัฒนา (Watch mode)
npm run dev

# รันในโหมดใช้งานจริง (Production-like)
npm start

# รันการทดสอบ API ทั้งหมดอัตโนมัติ (ต้องเปิด Server ทิ้งไว้ก่อน)
npm test
```

คำสั่งเหล่านี้ใช้ฟีเจอร์ใหม่ของ Node.js ในการโหลด `.env` โดยตรง:
- `node --env-file=.env ...`

## Dependencies สำคัญ

- `express` - web framework
- `mongoose` - เชื่อมต่อ MongoDB และสร้าง model/schema
- `@supabase/supabase-js` - เชื่อมต่อ Supabase/PostgreSQL
- `jsonwebtoken` - สร้างและตรวจ JWT
- `bcrypt` - hash และตรวจ password
- `cookie-parser` - อ่าน cookie จาก request
- `cors` - เปิด CORS
- `cloudinary` & `multer` - จัดการการอัปโหลดและเก็บรูปภาพบน Cloud
- `httpyac` - สำหรับ Automated API Testing

## Environment Variables

ไฟล์ `.env` มี key ต่อไปนี้ แต่ไม่ควร commit หรือเผยแพร่ค่าจริง:

- `MONGODB_URI`
- `JWT_SECRET`
- `NODE_ENV`
- `PORT`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER_PREFIX`
- `CLIENT_URL`
- `GEMINI_API_KEY`

## โครงสร้างไฟล์หลัก

```text
src/
  server.js
  config/
    mongodb.js
    supabase.js
  controllers/              📂 แยก Logic การทำงานของ API ออกมาจากหน้า Model
    v1/                     📂 จัดกลุ่มแยกเวอร์ชันให้ตรงตามระบบ Routes
      users.controller.js
      products.controller.js
      admin/                📂 Logic สำหรับ Admin Sub-module (🔒 ต้องได้รับคำสั่งจากผู้ใช้เท่านั้น)
        users.admin.controller.js
        products.admin.controller.js
  fakeData/
    fakeUser.js
    fakeProduct.js
  middlewares/
    auth.middleware.js
    error.middleware.js
  models/                   📂 เก็บเฉพาะ Schema
    user.model.js
    product.model.js
    cart.model.js
    order.model.js
  routes/
    index.js
    v1/                     📂 โฟลเดอร์เก็บ route แยกตามโมดูล
      index.js
      users.routes.js
      products.routes.js
      notes.routes.js
      cart.routes.js
      orders.routes.js
      admin/                📂 เส้นทางสำหรับ Admin (🔒 ถูกปกป้องด้วย Centralized Middleware)
        index.js
        users.admin.routes.js
        products.admin.routes.js
  test.http/
    v1/                     📂 ไฟล์ทดสอบ API (.rest)
      users.v1.rest
      products.v1.rest
      cart.v1.rest
      orders.v1.rest
      admin/                📂 ไฟล์ทดสอบ API สำหรับแอดมินโดยเฉพาะ
        users.admin.v1.rest
        products.admin.v1.rest
  utils/
    generateToken.js
    generateSecretKey.js

---

## Server Flow

`src/server.js`

- สร้าง Express app
- เปิดใช้ `cors()`, `express.json()`, `cookieParser()`
- เชื่อมต่อ MongoDB และเรียกใช้ Centralized Error Handler
- mount route หลักที่ `/api`

---

## กฎการพัฒนา Admin Sub-module (Admin Rules)

เพื่อให้ระบบแอดมินมีความปลอดภัยและเป็นไปตามความต้องการของผู้ใช้:

- **User-Directed Implementation Only**: การสร้าง, แก้ไข หรือเพิ่มฟีเจอร์ใดๆ ในส่วนของ Admin (โฟลเดอร์ `controllers/v1/admin` และ `routes/v1/admin`) **ต้องได้รับคำสั่งโดยตรงจากผู้ใช้เท่านั้น** ห้าม AI คิดหรือเพิ่มฟีเจอร์เองโดยพลการ
- **Centralized Security**: ทุกเส้นทางภายใต้ `routes/v1/admin` ต้องถูกปกป้องด้วย Middleware `protect` และ `admin` ที่ไฟล์ `admin/index.js` เสมอ
- **File Naming**: ไฟล์ในส่วนแอดมินต้องมีคำต่อท้าย `.admin.` เช่น `users.admin.controller.js` เพื่อความชัดเจนในการจัดการ

---

## รูปแบบการแยกหมวดหมู่ที่ยืดหยุ่น (Flexible Categorization Flow)
เพื่อรองรับโปรเจกต์ที่มีความซับซ้อนและต้องการความยืดหยุ่นในการจัดหมวดหมู่ข้อมูล (เช่น สินค้า, บทความ, หรือเนื้อหาอื่นๆ) ควรใช้แนวทางดังนี้:

- **ใช้ Map หรือ JSON/Object สำหรับข้อมูลที่ไม่ตายตัว:**
    - หากหมวดหมู่มีคุณสมบัติย่อยที่หลากหลายและไม่แน่นอน (เช่น สเปคสินค้าที่ต่างกันในแต่ละหมวดหมู่) ให้ใช้ `Map` ใน Mongoose (เช่น `type: Map, of: String`) แทนการสร้าง Field แบบตายตัว
- **การอัปเดตข้อมูลแบบเฉพาะเจาะจง (Partial Update):**
    - เมื่อมีการอัปเดตข้อมูลภายใน Map หรือ Object ที่ซ้อนทับกัน **ต้อง** แปลงข้อมูลให้อยู่ในรูปแบบ Dot Notation ก่อนส่งไปอัปเดต (เช่น `{"specifications.RAM": "16GB"}`) เพื่อป้องกันการลบข้อมูลอื่นๆ ใน Map นั้นทิ้ง
- **การใช้ Enum สำหรับหมวดหมู่หลัก:**
    - หากหมวดหมู่หลักมีจำนวนจำกัดและเป็นมาตรฐาน (เช่น 'Notebook', 'Computer') ควรใช้ `enum` ใน Schema เพื่อจำกัดค่าที่อนุญาตและป้องกันความผิดพลาดจากการพิมพ์
- **แยก Logic ออกจาก Schema:**
    - Schema ควรมีหน้าที่แค่กำหนดโครงสร้าง การแปลงข้อมูล (เช่น Dot Notation) ควรทำในส่วนของ Controller

---

## กฎการพัฒนาและข้อควรระวัง (Development Rules)

เพื่อให้โปรเจกต์มีมาตรฐานเดียวกันและบำรุงรักษาง่าย ควรปฏิบัติตามกฎดังนี้:

- **Naming Convention**:
    - ห้ามใช้ชื่อโฟลเดอร์ผิดสะกด (เช่น ห้ามใช้ `modeles` ให้ใช้ `models` เท่านั้น)
    - ใช้ camelCase สำหรับชื่อตัวแปรและฟังก์ชัน
    - ใช้ PascalCase สำหรับชื่อ Model/Class
- **Separation of Concerns**:
    - **ห้าม** เขียน Business Logic ไว้ในไฟล์ Route ให้แยกไปไว้ใน Controller เสมอ
- **Error Handling & Database**:
    - **ต้อง** ใช้ Centralized Error Handler โดยการเรียก `next(error)` ใน Controller
    - **ห้าม** เขียน `res.status(500).json(...)` ซ้ำๆ ในแต่ละ Controller
    - **ต้อง** ตรวจสอบรูปแบบ ID ของ MongoDB ผ่าน Centralized Middleware (`validateMongoId`) ในไฟล์ Route เสมอ เพื่อลดความซ้ำซ้อนใน Controller
    - **ห้าม** ใช้พารามิเตอร์ `next` ใน Middleware (Hook) ของ Mongoose ยุคใหม่ (v6/v7+): ไม่ว่าจะเป็นฟังก์ชัน `async` หรือ Synchronous ธรรมดา ให้ใช้ `return` ออกมาเฉยๆ หรือปล่อยให้โค้ดรันจนจบ (Mongoose จะจัดการไปต่อให้เอง) การเรียก `next()` จะทำให้เกิด Error `next is not a function`
    - **ต้อง** มีฟิลด์ `stock` พร้อมการตรวจสอบค่าไม่ให้ติดลบ (`min: 0`) สำหรับระบบที่เกี่ยวข้องกับสินค้าหรือคลังสินค้า
- **Data Integrity & Performance**:
    - **ต้อง** ยึดหลัก **Single Source of Truth (SSOT)**: ห้ามบันทึกข้อมูลที่มาจากการคำนวณลงฐานข้อมูลโดยไม่มีการคำนวณสด แต่ถ้า Model มีฟิลด์สรุปยอด (เช่น `subtotal`, `total`) **ต้อง** ทำการ Sync ข้อมูลจากการคำนวณสด (On-the-fly) ลงไปก่อนสั่ง `.save()` เสมอ เพื่อป้องกันยอดเงินในฐานข้อมูลเป็น 0
    - **ต้อง** ทำการ **Product Snapshotting** ในใบสั่งซื้อ: ห้ามใช้การ `.populate()` เพียงอย่างเดียวในการแสดงผลประวัติการสั่งซื้อ ให้บันทึกข้อมูลสำคัญของสินค้า (ชื่อ, แบรนด์, รูปภาพ, ราคา ณ วันซื้อ) ลงในก้อนข้อมูลออเดอร์โดยตรง เพื่อป้องกันบั๊กข้อมูลหาย (Null Product) เมื่อสินค้าชิ้นนั้นถูกลบออกจากร้านค้าในอนาคต
    - **ต้อง** ป้องกันปัญหา **N+1 Queries (Nested Loop)**: ห้าม Query หรือ Update ฐานข้อมูลทีละรายการภายในลูป (เช่น การคืนสต็อกสินค้าหลายสิบชิ้น) ให้ใช้การดึงข้อมูลแบบกลุ่ม (`$in`) หรือใช้คำสั่ง **`bulkWrite`** เพื่อประมวลผลทั้งหมดในคำสั่งเดียว (Single Round-trip) เพื่อป้องกันแอปพลิเคชันหน่วงและ RAM บน Render เต็ม
    - **ห้าม** Query ฐานข้อมูลซ้ำซ้อน: เมื่อดึงข้อมูลมาแล้ว หรือเพิ่งสั่ง `.save()` ไป **ห้าม** ใช้ `findById` เพื่อดึงข้อมูลชุดเดิมซ้ำอีกรอบ ให้ใช้งานข้อมูลจากตัวแปรที่มีอยู่ หรือใช้เทคนิค `.populate()` ตั้งแต่รอบแรกเพื่อประหยัด RAM และลด Latency (สำคัญมากเวลาขึ้น Production เช่น Render)
    - **ต้อง** ป้องกัน **Race Condition** ในระบบอัตโนมัติ: สำหรับฟังก์ชันที่อาจถูกเรียกซ้ำซ้อนกัน (เช่น ระบบกวาดล้างออเดอร์หมดอายุ) **ต้อง** ชิงเปลี่ยนสถานะในฐานข้อมูล (เช่น ใช้ `updateMany` หรือ `findOneAndUpdate`) ทันทีก่อนดึงข้อมูลมาประมวลผลต่อ เพื่อ "ล็อก" ไม่ให้ฟังก์ชันรอบอื่นดึงงานเดิมไปทำซ้ำจนเกิดผลลัพธ์เบิ้ล (เช่น คืนสต็อกซ้ำซ้อน)
    - **ต้อง** ทำ Database Indexing เพื่อรองรับการสเกล (Scalability): ฟิลด์ที่ใช้เป็นเงื่อนไขค้นหาบ่อยๆ (Query Key) เช่น `userId` ใน Order (เพื่อดึงหน้าประวัติ) หรือเลขที่อ้างอิงที่สร้างขึ้นมาใหม่ (เช่น `orderNumber`) **ต้อง** ระบุ `index: true` ใน Schema อย่างชัดเจนเสมอ เพื่อหลีกเลี่ยงการสแกนทั้งคอลเลกชัน (Collection Scan) ที่จะทำให้แอปค้างเมื่อข้อมูลมีจำนวนมหาศาล
    - **ต้อง** ใช้ระบบกวาดล้างออเดอร์หมดอายุแบบ Lazy (Lazy Cleanup Strategy): เพื่อประหยัดทรัพยากรเครื่อง ให้เรียกใช้ฟังก์ชันตรวจสอบและยกเลิกออเดอร์ที่ค้างชำระ (`status: 'Awaiting Payment'`) ทุกครั้งที่มีการเรียกใช้ API ที่เกี่ยวข้องกับออเดอร์ แทนการรัน Cron Job ตลอดเวลา
    - **ต้อง** มีการจำกัดทรัพยากร (Resource Limiting): เช่น จำกัดจำนวนรายการสูงสุดในตะกร้า (`MAX_CART_ITEMS`) หรือทำ Pagination ในหน้าแสดงสินค้า (`.skip()`, `.limit()`) เพื่อป้องกันการยิงถล่มระบบและรักษา Performance
    - **ต้อง** ใช้ Field Selection (`.select()`) ในหน้า List: หน้าแสดงรายการสินค้าต้องตัดฟิลด์ที่ไม่จำเป็นทิ้งเสมอ (เช่น `.select('-specifications')`) เพื่อประหยัด Bandwidth และโหลดหน้าเว็บให้เร็วที่สุด
    - **ต้อง** ทำการตรวจสอบและปรับปรุงข้อมูลโดยอัตโนมัติ (Auto-Correction): เมื่อมีการดึงข้อมูลสำคัญ เช่น ตะกร้าสินค้า ต้องเช็คสต็อกและราคาสด ณ วินาทีนั้น พร้อมเคลียร์ข้อมูลขยะ (Extra Fields) ออกก่อนบันทึกเสมอ
- **Business Logic & Validation**:
    - **ห้าม** ใช้การเซฟทับค่าเดิม (Value Replacement) ในกรณีที่ผู้ใช้คาดหวังการบวกเพิ่ม เช่น การกด Add to Cart ซ้ำ **ต้อง** ใช้การบวกสะสม (`+=` หรือ `old + new`) เสมอ
    - **ต้อง** ตรวจสอบความถูกต้องแบบครอบคลุม (Comprehensive Validation): การเช็คสต็อกต้องเช็คจาก **"จำนวนรวมทั้งหมดที่จะเกิดขึ้น"** ไม่ใช่เช็คแค่จำนวนที่ส่งมาใหม่ เพื่อป้องกันบั๊กการสั่งของเกินสต็อก (Stock Bypass)
- **ต้อง** ป้องกันสต็อกติดลบด้วย Atomic Query (Atomic Stock Update): เมื่อหักสต็อก (เช่น ในขั้นตอน Checkout) **ห้าม** ใช้การดึงค่ามาลบใน Memory แล้วเซฟกลับ แต่ต้องใช้คำสั่ง `$inc` ร่วมกับเงื่อนไขตรวจสอบสต็อกในคิวรีเสมอ เพื่อป้องกัน Race Condition และสต็อกติดลบ:
    ```javascript
    // ตัวอย่างการหักสต็อกที่ปลอดภัย
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: productId, stock: { $gte: quantity } }, // 🔒 ล็อคเงื่อนไข: สต็อกต้องพอหัก
      { $inc: { stock: -quantity } },                // ⚡ หักลบแบบ Atomic
      { new: true }
    );
    if (!updatedProduct) throw new Error("สินค้าในคลังไม่เพียงพอ");
    ```
- **ต้อง** ใช้รูปแบบการเลือกที่อยู่แบบยืดหยุ่น (Flexible Address Selection): ในขั้นตอน Checkout ระบบต้องรองรับการระบุที่อยู่ 3 รูปแบบ โดยมีลำดับความสำคัญ (Priority) ดังนี้:
    1.  **Manual Address**: หากมีการส่งข้อมูลที่อยู่ใหม่มา ให้ใช้ข้อมูลนั้นทันที
    2.  **Saved Address ID**: หากไม่มีการส่งที่อยู่ใหม่มา แต่มี `addressId` ให้ไปดึงข้อมูลจาก Profile ผู้ใช้
    3.  **Default Address**: หากไม่ส่งข้อมูลมาเลย ให้ดึงที่อยู่ที่ตั้งค่าเป็น `isDefault` หรือที่อยู่อันแรกสุดมาใช้ให้อัตโนมัติ
- **ต้อง** ตรวจสอบความถูกต้องของที่อยู่ก่อนบันทึก (Address Integrity): ข้อมูลที่อยู่ที่ใช้ใน Order ต้องมีฟิลด์พื้นฐานครบถ้วนเสมอ (`fullName`, `phone`, `address`, `province`, `district`, `subDistrict`, `postalCode`) แม้จะเป็นข้อมูลที่ดึงมาจาก Profile ก็ตาม เพื่อป้องกันปัญหาการจัดส่งในภายหลัง
- **ต้อง** ทำการตรวจสอบราคาให้ตรงกันก่อนเปิดบิล (Secure Price Verification): ในขั้นตอน Checkout **ต้อง** รับค่ายอดรวมที่ลูกค้าเห็น (`clientTotal`) มาตรวจสอบกับยอดที่คำนวณได้จริงหลังบ้าน หากไม่ตรงกัน (เช่น ราคาเปลี่ยนตัดหน้า) ให้ทำการยกเลิกและคืนสต็อกทันที เพื่อความโปร่งใสต่อผู้ใช้
- **ต้อง** บันทึกรายละเอียดการชำระเงิน (Payment Evidence Logging): เมื่อมีการชำระเงินสำเร็จ (Paid) **ต้อง** บันทึกข้อมูลหลักฐานลงฐานข้อมูลเสมอ (เช่น วิธีการชำระเงิน, เวลาที่จ่ายจริง, รหัสธุรกรรม) เพื่อใช้ในการตรวจสอบย้อนกลับ (Audit) และแสดงผลในหน้า Admin Dashboard
- **API Design & Filtering**:
    - **ต้อง** รองรับการกรองข้อมูล (Filtering) ผ่าน Query Parameters (เช่น `?category=...`) ใน Endpoint ที่ดึงข้อมูลเป็นรายการ (List)
    - **ต้อง** ส่งข้อมูลแบบครบถ้วน (Full Object/Map) ในหน้า Detail เพื่อให้ Frontend สามารถนำไป Render แบบ Dynamic ได้โดยไม่ต้องร้องขอข้อมูลเพิ่ม
    - **ห้าม** เชื่อถือราคา (Price) ที่ส่งมาจาก Frontend: ต้องดึงราคาจริงจาก Database มาคำนวณเท่านั้น (Secure Price Verification)
- **Routing & Express Architecture**:
    - **ต้อง** จัดลำดับ Route (Route Ordering) ให้ถูกต้องเสมอ โดยต้องวาง Static Routes (เช่น `/summary`, `/upload`) ไว้ก่อนหน้า Dynamic Routes (เช่น `/:id`, `/:productId`) เสมอ เพื่อป้องกันไม่ให้ Express ตีความเส้นทางผิดพลาด (Shadowing Bug)
- **User Experience (UX) & Edge Cases**:
    - **ต้อง** จัดการกรณีผู้ใช้ลดจำนวนสินค้าจนเป็น 0 หรือติดลบ (`quantity <= 0`) ให้เปลี่ยนพฤติกรรมเป็นการ **"ลบสินค้า"** ออกจากระบบ/ตะกร้า ทันที แทนที่จะส่ง Error กลับไปขัดใจผู้ใช้
    - **ต้อง** ตรวจสอบการมีอยู่ของข้อมูลก่อนทำลาย (Efficient Deletion): ก่อนสั่งลบข้อมูลใดๆ (เช่น ลบสินค้าออกจากตะกร้า) ให้เช็คก่อนเสมอว่าข้อมูลนั้นมีอยู่จริงหรือไม่ (เช่น ใช้ `.some()`) เพื่อลดการประมวลผลและการ Query ที่เสียเปล่า
- **Partial Updates (Dot Notation)**:
    - **ต้อง** ใช้เทคนิค Dot Notation เมื่อต้องการอัปเดตฟิลด์ย่อยภายใน Object หรือ Map (เช่น `specifications`) เพื่อป้องกันการบันทึกทับข้อมูลเดิมทั้งหมด
    - **ห้าม** ส่ง Object เข้าไปใน `findByIdAndUpdate` โดยตรงถ้าต้องการอัปเดตเพียงบางฟิลด์ย่อย
- **Code Quality**:
    - **ห้าม** ปล่อย Unused Imports ทิ้งไว้ในไฟล์ ให้ลบออกเสมอ
    - **ห้าม** มี Route ที่ไม่ได้ใช้งานจริงหลงเหลืออยู่ (เช่น Basic Route `/` ใน `server.js`)
- **Testing**:
    - **ต้อง** เขียนไฟล์ทดสอบ `.rest` ทุกครั้งที่เพิ่ม Endpoint ใหม่
    - **ต้อง** ทดสอบกรณี Error Cases เสมอ (เช่น Invalid ID, Data Not Found)
    - **ต้อง** ใช้ `# @name` ในไฟล์ `.rest` เพื่อระบุชื่อ Request ให้ชัดเจนและง่ายต่อการอ่าน/ทดสอบอัตโนมัติ
    - **ต้อง** จัดลำดับ Request ให้ `Logout` อยู่ล่างสุดเสมอ เพื่อรองรับ Auto Test (`npm test`)
- **Data Validation & Security**:
    - **กฎของ User**: Email ต้องลงท้ายด้วย `.com`, Password ต้องยาว 6 ตัวขึ้นไป, และตรวจสอบความซ้ำซ้อนก่อนบันทึก
    - **ห้าม** Commit ไฟล์ `.env` ขึ้น GitHub
    - **ห้าม** ส่ง Password กลับไปใน API Response (`select: false` ใน Schema)
    - **ต้อง** ใช้ `toJSON` และ `toObject` transformations ใน Schema เพื่อลบข้อมูล Sensitive (เช่น `password`) ออกโดยอัตโนมัติ
    - **ต้อง** ใช้ Helper Function (เช่น `formatUserResponse`) เพื่อจัดการความสะอาดของข้อมูลก่อนส่งกลับเสมอ
    - **ต้อง** เก็บ Token ไว้ใน **HttpOnly Cookie** เสมอเพื่อป้องกัน XSS
- **Production & Deployment**:
    - **ต้อง** ตั้งค่า Cookie ให้ยืดหยุ่นสำหรับ Production (เช่น `secure: true`, `sameSite: 'none'`) เพื่อรองรับการ Deploy บน Platform อย่าง Render
    - **ต้อง** ใช้ `app.set('trust proxy', 1)` เมื่อรันแอปหลัง Reverse Proxy เพื่อให้การตั้งค่า Cookie แบบ Secure ทำงานได้ถูกต้อง
    - **ห้าม** Hardcode URL ของ Frontend ให้ใช้ `CLIENT_URL` จาก Environment Variable แทน
- **Image Management**:
    - **ต้อง** เก็บรูปภาพไว้บน Cloud (เช่น Cloudinary) แทนการเก็บใน Server ตรงๆ
    - **ต้อง** จัดการแยกโฟลเดอร์เก็บรูปภาพให้เป็นระเบียบ (Folder-based upload)
- **Environment & Scripts**:
    - **ต้อง** ใช้ `dotenv` ในการจัดการ Environment Variables เพื่อความยืดหยุ่นระหว่าง Local และ Production (Render)
    - **ห้าม** ใช้ `--env-file=.env` ใน `package.json` สำหรับ Production เพราะจะทำให้แอปพังหากหาไฟล์ไม่เจอ

## ข้อสังเกตและจุดที่ควรปรับปรุง

- โฟลเดอร์และโครงสร้างไฟล์ถูกปรับปรุงให้เป็นระเบียบตามมาตรฐานล่าสุดแล้ว
- ระบบสินค้า (Product) ใช้โครงสร้างแบบยืดหยุ่นด้วย `Map` และรองรับการอัปเดตเฉพาะส่วน (Partial Update)
- ระบบการทดสอบครอบคลุมทั้ง User และ Product พร้อมรันแบบอัตโนมัติด้วย `httpyac`
- โปรเจกต์กำลังโฟกัสที่การพัฒนาบน **API v1** เป็นหลัก

---

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

## บทเรียนที่ได้รับและข้อผิดพลาดที่พบ (Session Learnings & Pitfalls)

จากการพัฒนาล่าสุด มีจุดสำคัญที่ต้องระวังเพื่อไม่ให้เกิดข้อผิดพลาดซ้ำ:

- **Deployment URI Error**: ปัญหา `mongoose.connect()` ได้รับค่า `undefined` บน Render มักเกิดจากการที่ Node.js พยายามอ่านไฟล์ `.env` ที่ไม่มีอยู่จริง หรือลืมตั้งค่า Environment Variables ใน Dashboard การเปลี่ยนมาใช้ `dotenv` และเพิ่ม Validation ในโค้ดจะช่วยให้ระบุปัญหาได้ทันที
- **Relative Import Path Trap**: เมื่อมีการปรับโครงสร้างโฟลเดอร์ให้ลึกขึ้น (เช่น การแยก `v1/admin`) **ต้อง** ตรวจสอบการ Import ไฟล์ Model/Middleware เสมอ เพราะระดับของ `../` จะเปลี่ยนไป (หากผิดพลาดจะเกิด `ERR_MODULE_NOT_FOUND`)
- **Background Task Resilience**: ฟังก์ชันที่ทำงานเบื้องหลังหรือทำงานอัตโนมัติ (เช่น `checkAndExpireOrders`) **ต้อง** ครอบด้วย `try-catch` เสมอ และต้องเขียนลอจิกให้รองรับการทำงานซ้อนกัน (Idempotent) โดยใช้เทคนิค **Atomic State Transition** (เช่น `findOneAndUpdate` พร้อมเช็คสถานะเดิม) เพื่อไม่ให้เกิดการคืนสต็อกซ้ำซ้อน (Double Restock)
- **Inventory Safety**: หลีกเลี่ยงการดึงข้อมูลมาคำนวณใน RAM แล้วเซฟกลับ (Read-Modify-Write) ให้เปลี่ยนมาใช้คำสั่งระดับ Database เช่น `$inc` หรือ **`bulkWrite`** เมื่อต้องจัดการข้อมูลหลายรายการพร้อมกัน เพื่อความเร็วและความถูกต้องสูงสุด (Concurrency Safety)
- **Pagination Safety**: การรับค่า `page` หรือ `limit` จาก Query String **ต้อง** ครอบด้วย `Math.max(1, ...)` เสมอเพื่อป้องกันค่าติดลบหรือศูนย์ที่อาจทำให้ MongoDB Skip Error และแอปพลิเคชันล่ม
- **Storage Leak Prevention**: เมื่อมีการลบข้อมูล (Delete) หรืออัปเดตไฟล์ (Update) ที่เกี่ยวข้องกับ Cloud Storage (เช่น Cloudinary) **ต้อง** มี Logic ในการลบไฟล์เก่าทิ้งด้วย `publicId` เสมอ เพื่อไม่ให้เกิดขยะค้างบน Cloud
- **Defensive ID Mapping**: การดึง ID จาก Object ที่อาจถูก Populate มาแล้ว **ต้อง** ใช้รูปแบบ `item.productId._id || item.productId` เพื่อรองรับโครงสร้างข้อมูลที่หลากหลายและป้องกันบั๊ก `undefined`
- **Lean Queries for Performance**: ในทุกจุดที่เป็นการอ่านข้อมูลอย่างเดียว (Read-only) **ต้อง** ใช้ `.lean()` เพื่อลดภาระการสร้าง Mongoose Document และประหยัด RAM ของ Server
- **Centralized Error Status**: เมื่อสร้าง `new Error()` เพื่อส่งต่อไปยัง Centralized Error Handler **ต้อง** แนบ `error.status = 401` (หรือรหัสที่เหมาะสม) ไปด้วยเสมอ หากไม่แนบไป ระบบจะตีความว่าเป็น 500 Internal Server Error ทั้งหมด
- **Auth Middleware Safety**: ใน Middleware ที่ดึงค่าจาก Cookie **ต้อง** ตรวจสอบการมีอยู่ของ `req.cookies` ก่อนเสมอ (เช่น `req.cookies ? req.cookies.token : null`) เพื่อป้องกันแอปพลิเคชันล่ม
- **Deleted User Crash Prevention**: หลังจาก Verify JWT แล้ว **ต้อง** ตรวจสอบเสมอว่าดึงข้อมูล User จาก Database สำเร็จหรือไม่ (`if (!req.user)`) ก่อนเรียก `next()` เพื่อป้องกันแอปพลิเคชันล่มเมื่อผู้ใช้ถูกลบออกจากระบบแต่ Token ยังไม่หมดอายุ
- **Organized Testing**: การแยกไฟล์ `.rest` ตามบทบาทผู้ใช้ (User vs Admin) และจัดใส่โฟลเดอร์ให้ตรงกับโครงสร้าง Backend ช่วยให้การตรวจสอบความปลอดภัยของ API ทำได้แม่นยำและรวดเร็วขึ้นมหาศาล
