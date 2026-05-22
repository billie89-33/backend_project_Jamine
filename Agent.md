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
npm run dev
```

คำสั่งนี้รัน:

```bash
node --env-file=.env --watch src/server.js
```

ค่า port ในโค้ดปัจจุบันถูกกำหนดไว้ที่ `4001` ใน `src/server.js`

## Dependencies สำคัญ

- `express` - web framework
- `mongoose` - เชื่อมต่อ MongoDB และสร้าง model/schema
- `@supabase/supabase-js` - เชื่อมต่อ Supabase/PostgreSQL
- `jsonwebtoken` - สร้างและตรวจ JWT
- `bcrypt` - hash และตรวจ password
- `cookie-parser` - อ่าน cookie จาก request
- `cors` - เปิด CORS

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

หมายเหตุ: โค้ดปัจจุบันใช้ `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV`, `SUPABASE_URL`, และ `SUPABASE_SECRET_KEY` เป็นหลัก ส่วน `PORT` มีอยู่ใน `.env` แต่ `src/server.js` ยัง hard-code เป็น `4001`

## โครงสร้างไฟล์หลัก

```text
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
      notes.controller.js
    v2/
      users.controller.js
      products.controller.js
  fakeData/
    fakeUser.js
  middlewares/
    auth.middleware.js
  models/                   📂 แก้ไขตัวสะกดจาก modeles เป็น models (เก็บเฉพาะ Schema)
    product.model.js
    user.model.js
  routes/
    index.js
    v1/
      index.js
      users.routes.js
      products.routes.js
      notes.routes.js
    v2/
      index.js
      users.routes.js
      products.routes.js
  test.http/
    v1/
      user-api.rest
    v2/
      products-v2.http
      users-api-refector-sor.rest
      users-supabase.rest    
  utils/
    generateSecretKey.js
```

## Server Flow

`src/server.js`

- สร้าง Express app
- เปิดใช้ `cors()`
- เปิดใช้ `express.json()`
- เปิดใช้ `cookieParser()`
- เรียก `connectDB()` เพื่อเชื่อม MongoDB
- เรียก `connectSupabase()` เพื่อทดสอบ Supabase
- mount route หลักที่ `/api`
- เพิ่ม centralized error handler
- listen ที่ port `4001`

ถ้าเชื่อมต่อ database ไม่สำเร็จ จะ throw error และปิด process ด้วย `process.exit(1)`

## Route Mounting

Route หลัก:

```text
/api
  /v1
    /users
  /v2
    /users
    /products
```

ไฟล์ `src/routes/index.js` mount:

- `/v1` -> `src/routes/v1/index.js`
- `/v2` -> `src/routes/v2/index.js`

## API v1

Base URL จริงตามโค้ด:

```text
http://localhost:4001/api/v1
```

### Users v1

ไฟล์:

- `src/routes/v1/users.routes.js`
- ใช้ข้อมูลจำลองจาก `src/fakeData/fakeUser.js`
- เก็บข้อมูลไว้ใน memory ด้วย local array

Endpoints:

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/users` | ดึง users ทั้งหมด |
| POST | `/api/v1/users` | สร้าง user ใหม่ ต้องมี `username`, `email` |
| PUT | `/api/v1/users/:id` | แก้ user ต้องมี `username`, `email`, `password` |
| DELETE | `/api/v1/users/:id` | ลบ user ตาม id |

หมายเหตุ:

- ข้อมูล v1 ไม่ persist ลง database
- `fakeUser.js` มี id ซ้ำกันทั้งหมดเป็น `"1"`
- ไฟล์ `src/routes/v1/products.routes.js` และ `src/routes/v1/notes.routes.js` ว่าง
- ไฟล์ test `src/test.http/v1/user-api.rest` ใช้ path `/users` ตรงๆ แต่ route จริงของ server คือ `/api/v1/users`

## API v2 - Users

Base URL:

```text
http://localhost:4001/api/v2/users
```

ไฟล์:

- `src/routes/v2/users.routes.js`
- `src/modeles/users/users.v2.controller.js`
- `src/modeles/users/user.model.js`
- `src/middlewares/auth.middleware.js`

### MongoDB Users

ใช้ Mongoose model `User`

Schema:

| Field | Type | Rule |
| --- | --- | --- |
| `username` | String | required, trim |
| `role` | String | enum `user`, `admin`, default `user` |
| `email` | String | required, unique, lowercase |
| `password` | String | required, min length 8, `select: false` |
| timestamps | Date | `createdAt`, `updatedAt` |

ก่อน save จะ hash password ด้วย `bcrypt.hash(password, 12)`

Endpoints:

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/v2/users` | required | ดึง users ทั้งหมดจาก MongoDB |
| POST | `/api/v2/users` | no | register user ลง MongoDB |
| PUT | `/api/v2/users/:id` | required | แก้ user; admin แก้ได้ทุกคน หรือ user แก้ตัวเอง |
| DELETE | `/api/v2/users/:id` | required | ลบ user; เฉพาะ admin |
| GET | `/api/v2/users/me` | required | ดึง profile ของ user จาก token |
| POST | `/api/v2/users/login` | no | login ด้วย email/password |
| POST | `/api/v2/users/logout` | required | logout และ clear cookie |

Login MongoDB:

- รับ `email`, `password`
- หา user ด้วย email และดึง password มาตรวจ
- ตรวจ password ด้วย bcrypt
- สร้าง JWT payload: `userId`, `email`, `role`
- JWT หมดอายุใน `1m`
- ส่ง cookie ชื่อ `accessToken`
- cookie เป็น `httpOnly`
- `secure` และ `sameSite` เปลี่ยนตาม `NODE_ENV`

### Supabase/PostgreSQL Users

ใช้ table `users` ใน Supabase

Columns ที่ select กลับ:

```text
id, username, email, role, created_at, updated_at
```

Endpoints:

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/v2/users/pg` | no | ดึง users ทั้งหมดจาก Supabase |
| POST | `/api/v2/users/pg` | no | สร้าง user ใน Supabase |
| PUT | `/api/v2/users/pg/:id` | no | แก้ user ใน Supabase |
| DELETE | `/api/v2/users/pg/:id` | no | ลบ user ใน Supabase |
| POST | `/api/v2/users/pg/login` | no | login ด้วย Supabase user |
| POST | `/api/v2/users/pg/logout` | required | logout และ clear cookie |

Login Supabase:

- รับ `email`, `password`
- query user จาก table `users`
- ตรวจ password ด้วย bcrypt
- สร้าง JWT payload: `userId`, `email`, `role`
- JWT หมดอายุใน `1m`
- ส่ง cookie ชื่อ `accessToken`

## API v2 - Products

Base URL:

```text
http://localhost:4001/api/v2/products
```

ไฟล์:

- `src/routes/v2/products.routes.js`
- `src/modeles/products/products.v2.controller.js`
- `src/modeles/products/product.model.js`

ใช้ Mongoose model `Product`

Schema:

| Field | Type | Rule |
| --- | --- | --- |
| `name` | String | required |
| `price` | Number | required |
| `description` | String | optional |
| `stock` | Number | default `0` |
| timestamps | Date | `createdAt`, `updatedAt` |

Endpoints:

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v2/products` | ดึง products ทั้งหมด |
| GET | `/api/v2/products/:id` | ดึง product ตาม id |
| POST | `/api/v2/products` | สร้าง product |
| PUT | `/api/v2/products/:id` | update แบบ replace ด้วย `overwrite: true` |
| PATCH | `/api/v2/products/:id` | update บาง field ด้วย `$set` |
| DELETE | `/api/v2/products/:id` | ลบ product |

หมายเหตุ: product routes ยังไม่ใช้ `verifyToken` ดังนั้น CRUD products เปิด public ตามโค้ดปัจจุบัน

## Middleware

`src/middlewares/auth.middleware.js`

`verifyToken` ทำงานดังนี้:

- อ่าน JWT จาก cookie `accessToken`
- ถ้าไม่มี token ส่ง `401`
- verify ด้วย `process.env.JWT_SECRET`
- ถ้าสำเร็จ ใส่ decoded payload ลง `req.user`
- ถ้า token ไม่ถูกต้องหรือหมดอายุ ส่ง `403`

Controller ที่ใช้ `verifyToken`:

- MongoDB users: get all, update, delete, get me, logout
- Supabase logout

## Database Config

### MongoDB

`src/config/mongodb.js`

- อ่าน connection string จาก `MONGODB_URI`
- connect ด้วย `mongoose.connect(uri, { dbName: "jsd12-express-app" })`

### Supabase

`src/config/supabase.js`

- อ่าน `SUPABASE_URL`
- อ่าน `SUPABASE_SECRET_KEY`
- สร้าง client ด้วย `createClient`
- `connectSupabase()` ทดสอบด้วยการ query table `users` และ select `id` limit 1

## Test HTTP Files

ไฟล์ใน `src/test.http` ใช้สำหรับยิง request ผ่าน REST Client หรือ extension ที่รองรับ `.http`/`.rest`

- `src/test.http/v1/user-api.rest` - ทดสอบ user v1 แต่ path ยังไม่ตรงกับ route จริง
- `src/test.http/v2/users-api-refector-sor.rest` - ทดสอบ MongoDB users v2
- `src/test.http/v2/users-superbase.rest` - ทดสอบ Supabase users v2
- `src/test.http/v2/products-v2.http` - ทดสอบ products v2

## Utility

`src/utils/generateSecretKey.js`

ใช้สร้าง secret key แบบ hex 64 bytes:

```bash
node src/utils/generateSecretKey.js
```

ผลลัพธ์สามารถนำไปใช้เป็น `JWT_SECRET`

## กฎการพัฒนาและข้อควรระวัง (Development Rules)

เพื่อให้โปรเจกต์มีมาตรฐานเดียวกันและบำรุงรักษาง่าย ควรปฏิบัติตามกฎดังนี้:

- **Naming Convention**:
    - ห้ามใช้ชื่อโฟลเดอร์ผิดสะกด (เช่น ห้ามใช้ `modeles` ให้ใช้ `models` เท่านั้น)
    - ใช้ camelCase สำหรับชื่อตัวแปรและฟังก์ชัน
    - ใช้ PascalCase สำหรับชื่อ Model/Class (เช่น `User`, `Product`)
- **Separation of Concerns**:
    - **ห้าม** เขียน Business Logic ไว้ในไฟล์ Route ให้แยกไปไว้ใน Controller เสมอ
    - **ห้าม** เขียน Database Query ไว้ใน Controller โดยตรงถ้ามีความซับซ้อน (ควรใช้ Model methods)
- **Error Handling**:
    - **ต้อง** ใช้ Centralized Error Handler (`src/middlewares/error.middleware.js`) โดยการเรียก `next(error)` ใน catch block ของ Controller
    - **ห้าม** เขียน `res.status(500).json(...)` ซ้ำๆ ในแต่ละ Controller
- **Code Quality**:
    - **ห้าม** ปล่อย Unused Imports (เช่น `mongoose`, `jwt` ที่ไม่ได้ใช้) ทิ้งไว้ในไฟล์ (เช่น `server.js`) ให้ลบออกเสมอเพื่อความสะอาด
    - **ห้าม** มี Route ที่ไม่ได้ใช้งานจริงหลงเหลืออยู่ (เช่น Basic Route `/` ใน `server.js` เมื่อมี API Route จัดการแล้ว)
- **Data Validation & Security**:
    - **ต้อง** ตรวจสอบ (Validate) ข้อมูลให้ครบถ้วนก่อนบันทึกลง Database
    - **กฎของ User**: Email ต้องเป็นตัวพิมพ์เล็กและมีรูปแบบที่ถูกต้อง (ต้องมี `@` และลงท้ายด้วย `.com`), Password ต้องมีความยาวขั้นต่ำ 6 ตัวอักษร, และ Username/Email ต้องไม่ซ้ำ (`unique`)
    - **ห้าม** Commit ไฟล์ `.env` ขึ้น GitHub (ใช้ `.gitignore` เสมอ)
    - **ห้าม** ส่ง Password กลับไปใน API Response (ใช้ `select: false` ใน Schema)
- **Environment**:
    - **ห้าม** Hard-code ค่า Port หรือ URI ในโค้ด ให้ดึงจาก `process.env` เสมอ
- **Routing**:
    - ต้องใช้ API Versioning (`/api/v1/...`) เสมอ และหลีกเลี่ยงการสร้างโครงสร้างโฟลเดอร์หรือไฟล์ Index ซ้ำซ้อน (เช่น ให้รวมไว้ที่ `src/routes/v1.routes.js`)
    - **สถานะปัจจุบัน**: โปรเจกต์กำลังโฟกัสที่การพัฒนาบน **API v1** (โครงสร้าง v2 ถูกลบออกชั่วคราวเพื่อลดความซับซ้อน)

## ข้อสังเกตและจุดที่ควรปรับปรุง

- โฟลเดอร์ชื่อ `modeles` น่าจะตั้งใจใช้คำว่า `models`
- มี comments ภาษาไทยบางส่วนแสดงเป็น mojibake/encoding เพี้ยนในไฟล์
- `PORT` ใน `.env` ยังไม่ถูกนำมาใช้ เพราะ `src/server.js` hard-code `4001`
- `src/server.js` import `users` จาก `fakeData/fakeUser.js` แต่ไม่ได้ใช้งาน
- `package.json` ระบุ `"main": "server.js"` แต่ไฟล์ server จริงอยู่ที่ `src/server.js`
- JWT หมดอายุใน `1m` เหมาะกับการทดสอบ แต่สั้นมากสำหรับการใช้งานจริง
- Error handler ส่ง `stack` กลับไปใน response ทุก environment ซึ่งไม่ควรทำใน production
- Supabase create user ยังไม่มี validation ว่า `username`, `email`, `password` ถูกส่งมาครบก่อน hash
- Supabase update รับ `password` จากไฟล์ test แต่ controller ไม่ update password
- Product routes ยังไม่มี authentication/authorization
- v1 products และ notes route เป็นไฟล์ว่าง
- `fakeUser.js` มี id ซ้ำ ทำให้ update/delete v1 อาจทำงานกับ record แรกเท่านั้น
- `.env` มี Gemini-related keys แต่ยังไม่เห็นโค้ดที่ใช้งานในโปรเจกต์นี้

