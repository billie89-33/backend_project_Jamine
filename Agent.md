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
  routes/
    index.js
    v1/                     📂 โฟลเดอร์เก็บ route แยกตามโมดูล
      index.js
      users.routes.js
      products.routes.js
      notes.routes.js
      cart.routes.js
  test.http/
    v1/                     📂 ไฟล์ทดสอบ API (.rest)
      users.v1.rest
      products.v1.rest
      cart.v1.rest
  utils/
    generateToken.js
    generateSecretKey.js
```

## Server Flow

`src/server.js`

- สร้าง Express app
- เปิดใช้ `cors()`, `express.json()`, `cookieParser()`
- เชื่อมต่อ MongoDB และเรียกใช้ Centralized Error Handler
- mount route หลักที่ `/api`

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
    - **ต้อง** ตรวจสอบรูปแบบ ID ของ MongoDB (Regex `/^[0-9a-fA-F]{24}$/`) ก่อนค้นหาเพื่อป้องกัน `CastError`
    - **ห้าม** ใช้พารามิเตอร์ `next` ใน Middleware (Hook) ของ Mongoose ที่เป็นฟังก์ชัน `async` ให้ใช้ `return` หรือปล่อยให้ฟังก์ชันจบเอง
    - **ต้อง** มีฟิลด์ `stock` พร้อมการตรวจสอบค่าไม่ให้ติดลบ (`min: 0`) สำหรับระบบที่เกี่ยวข้องกับสินค้าหรือคลังสินค้า
- **Data Integrity & Performance**:
    - **ต้อง** ยึดหลัก **Single Source of Truth (SSOT)**: ห้ามบันทึกข้อมูลที่มาจากการคำนวณลงฐานข้อมูลโดยไม่มีการคำนวณสด แต่ถ้า Model มีฟิลด์สรุปยอด (เช่น `subtotal`, `total`) **ต้อง** ทำการ Sync ข้อมูลจากการคำนวณสด (On-the-fly) ลงไปก่อนสั่ง `.save()` เสมอ เพื่อป้องกันยอดเงินในฐานข้อมูลเป็น 0
    - **ต้อง** ป้องกันปัญหา **N+1 Queries**: ห้าม Query ฐานข้อมูลทีละรายการภายในลูป ให้ใช้การ Query แบบกลุ่ม (เช่น `$in`) เพียงครั้งเดียวแล้วจัดการข้อมูลใน Memory (เช่น การใช้ `Map`) แทน
    - **ห้าม** Query ฐานข้อมูลซ้ำซ้อน: เมื่อดึงข้อมูลมาแล้ว หรือเพิ่งสั่ง `.save()` ไป **ห้าม** ใช้ `findById` เพื่อดึงข้อมูลชุดเดิมซ้ำอีกรอบ ให้ใช้งานข้อมูลจากตัวแปรที่มีอยู่ หรือใช้เทคนิค `.populate()` ตั้งแต่รอบแรกเพื่อประหยัด RAM และลด Latency (สำคัญมากเวลาขึ้น Production เช่น Render)
    - **ต้อง** มีการจำกัดทรัพยากร (Resource Limiting): เช่น จำกัดจำนวนรายการสูงสุดในตะกร้า (`MAX_CART_ITEMS`) เพื่อป้องกันการยิงถล่มระบบและรักษา Performance
    - **ต้อง** ทำการตรวจสอบและปรับปรุงข้อมูลโดยอัตโนมัติ (Auto-Correction): เมื่อมีการดึงข้อมูลสำคัญ เช่น ตะกร้าสินค้า ต้องเช็คสต็อกและราคาสด ณ วินาทีนั้น พร้อมเคลียร์ข้อมูลขยะ (Extra Fields) ออกก่อนบันทึกเสมอ
- **API Design & Filtering**:
    - **ต้อง** รองรับการกรองข้อมูล (Filtering) ผ่าน Query Parameters (เช่น `?category=...`) ใน Endpoint ที่ดึงข้อมูลเป็นรายการ (List)
    - **ต้อง** ส่งข้อมูลแบบครบถ้วน (Full Object/Map) ในหน้า Detail เพื่อให้ Frontend สามารถนำไป Render แบบ Dynamic ได้โดยไม่ต้องร้องขอข้อมูลเพิ่ม
    - **ห้าม** เชื่อถือราคา (Price) ที่ส่งมาจาก Frontend: ต้องดึงราคาจริงจาก Database มาคำนวณเท่านั้น (Secure Price Verification)
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
    - **ต้อง** ใช้ `--env-file=.env` ในทุก Script ที่จำเป็นต้องเข้าถึง Environment Variables

## ข้อสังเกตและจุดที่ควรปรับปรุง

- โฟลเดอร์และโครงสร้างไฟล์ถูกปรับปรุงให้เป็นระเบียบตามมาตรฐานล่าสุดแล้ว
- ระบบสินค้า (Product) ใช้โครงสร้างแบบยืดหยุ่นด้วย `Map` และรองรับการอัปเดตเฉพาะส่วน (Partial Update)
- ระบบการทดสอบครอบคลุมทั้ง User และ Product พร้อมรันแบบอัตโนมัติด้วย `httpyac`
- โปรเจกต์กำลังโฟกัสที่การพัฒนาบน **API v1** เป็นหลัก
