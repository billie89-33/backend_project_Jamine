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

