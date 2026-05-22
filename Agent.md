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
- `httpyac` - สำหรับ Automated API Testing

## Environment Variables

ไฟล์ `.env` มี key ต่อไปนี้ แต่ไม่ควร commit หรือเผยแพร่ค่าจริง:

- `MONGODB_URI`
- `JWT_SECRET`
- `NODE_ENV`
- `PORT`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `GEMINI_API_KEY`
- `GEMINI_EMBEDDING_MODEL`
- `GEMINI_GENERATION_MODEL`

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
  middlewares/
    error.middleware.js
  models/                   📂 เก็บเฉพาะ Schema
    user.model.js
  routes/
    index.js
    v1/                     📂 โฟลเดอร์เก็บ route แยกตามโมดูล
      index.js
      users.routes.js
  test.http/
    v1/                     📂 ไฟล์ทดสอบ API (.rest)
      users.v1.rest
```

## Server Flow

`src/server.js`

- สร้าง Express app
- เปิดใช้ `cors()`, `express.json()`, `cookieParser()`
- เชื่อมต่อ MongoDB และเรียกใช้ Centralized Error Handler
- mount route หลักที่ `/api`

## กฎการพัฒนาและข้อควรระวัง (Development Rules)

เพื่อให้โปรเจกต์มีมาตรฐานเดียวกันและบำรุงรักษาง่าย ควรปฏิบัติตามกฎดังนี้:

- **Naming Convention**:
    - ห้ามใช้ชื่อโฟลเดอร์ผิดสะกด (เช่น ห้ามใช้ `modeles` ให้ใช้ `models` เท่านั้น)
    - ใช้ camelCase สำหรับชื่อตัวแปรและฟังก์ชัน
    - ใช้ PascalCase สำหรับชื่อ Model/Class (เช่น `User`, `Product`)
- **Separation of Concerns**:
    - **ห้าม** เขียน Business Logic ไว้ในไฟล์ Route ให้แยกไปไว้ใน Controller เสมอ
- **Error Handling**:
    - **ต้อง** ใช้ Centralized Error Handler โดยการเรียก `next(error)` ใน Controller
    - **ห้าม** เขียน `res.status(500).json(...)` ซ้ำๆ ในแต่ละ Controller
- **Database & Mongoose**:
    - **ห้าม** ใช้พารามิเตอร์ `next` ใน Middleware (Hook) ของ Mongoose ที่เป็นฟังก์ชัน `async` ให้ใช้ `return` หรือปล่อยให้ฟังก์ชันจบเอง
- **Code Quality**:
    - **ห้าม** ปล่อย Unused Imports ทิ้งไว้ในไฟล์ ให้ลบออกเสมอ
    - **ห้าม** มี Route ที่ไม่ได้ใช้งานจริงหลงเหลืออยู่ (เช่น Basic Route `/` ใน `server.js`)
- **Testing**:
    - **ต้อง** เขียนไฟล์ทดสอบ `.rest` หรือ `.http` ทุกครั้งที่เพิ่ม Endpoint ใหม่
    - **ต้อง** ตรวจสอบว่า `npm test` สามารถทำงานผ่านได้ทั้งหมดก่อนส่งงาน
- **Data Validation & Security**:
    - **กฎของ User**: Email ต้องลงท้ายด้วย `.com`, Password ต้องยาว 6 ตัวขึ้นไป, และต้องตรวจสอบความซ้ำซ้อนของ Username/Email ก่อนบันทึก
    - **ห้าม** Commit ไฟล์ `.env` ขึ้น GitHub
    - **ห้าม** ส่ง Password กลับไปใน API Response (`select: false`)
- **Environment & Scripts**:
    - **ต้อง** ใช้ `--env-file=.env` ในทุก Script ที่จำเป็นต้องเข้าถึง Environment Variables
    - **ห้าม** Hard-code ค่าคอนฟิกไว้ในโค้ด

## ข้อสังเกตและจุดที่ควรปรับปรุง

- โฟลเดอร์ชื่อ `modeles` ถูกแก้ไขเป็น `models` เรียบร้อยแล้ว
- `PORT` ใน `.env` ถูกนำมาใช้งานผ่าน `process.env.PORT` แล้ว
- `package.json` แก้ไขให้สอดคล้องกับโครงสร้างไฟล์จริงแล้ว
- JWT หมดอายุใน `1m` เหมาะกับการทดสอบ แต่สั้นมากสำหรับการใช้งานจริง
- โปรเจกต์กำลังโฟกัสที่การพัฒนาบน **API v1** เป็นหลัก
