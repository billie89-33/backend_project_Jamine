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
    - หากหมวดหมู่หลักมีจำนวนจำกัดและเป็นมาตรฐาน (เช่น 'Notebook', 'Keyboard') ควรใช้ `enum` ใน Schema เพื่อจำกัดค่าที่อนุญาตและป้องกันความผิดพลาดจากการพิมพ์
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
- **Centralized Constants Management**:
    - **ต้อง** ใช้ค่าคงที่จาก `src/constants` แทนการพิมพ์ String เอง (Magic Strings) สำหรับค่าที่มีความสำคัญ เช่น สถานะออเดอร์, บทความ, หรือบทบาทผู้ใช้
    - **ประโยชน์**: ป้องกันการพิมพ์ผิด (Typos), แก้ไขที่เดียวจบ (Single Source of Truth), และช่วยให้ IDE แนะนำ Code ได้แม่นยำขึ้น
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
- **ต้อง** ป้องกันสต็อกติดลบด้วย Atomic Query (Atomic Stock Update): เมื่อหักสต็อก (เช่น ในขั้นตอน Checkout) **ห้าม** ใช้การดึงค่ามาลบใน Memory แล้วเซฟกลับ แต่ต้องใช้คำสั่ง `$inc` ร่วมกับเงื่อนไขตรวจสอบสต็อกในคิวรีเดียวเสมอ เพื่อป้องกัน Race Condition และสต็อกติดลบ
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
    - **กฎของ User**: ใช้ Email Regex แบบมาตรฐาน (ไม่จำกัดเฉพาะ .com), Password ต้องยาวอย่างน้อย 6 ตัวอักษร, และต้องทำ **Sanitization** (Trim whitespace และ Lowercase Email) ก่อนตรวจสอบหรือบันทึกเสมอ
    - **Input Sanitization Pattern**:
        - **Trim**: ต้องใช้ `.trim()` กับ String inputs เช่น `username`, `email` เพื่อป้องกันช่องว่างส่วนเกิน
        - **Normalization**: อีเมลต้องถูกแปลงเป็นตัวพิมพ์เล็ก (`.toLowerCase()`) ก่อนเช็คความซ้ำซ้อนและก่อนบันทึก เพื่อความเป็น SSOT
        - **Flexible Regex**: ใช้ `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` สำหรับการตรวจสอบอีเมลที่ครอบคลุมทุก Domain
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

---

## 💎 Advanced Backend Disciplines & Universal Best Practices (Master Blueprint)

นี่คือ "หัวใจ" ของการสร้าง Backend ระดับ Professional ที่ยืดหยุ่นและนำไปใช้ได้กับทุกโปรเจกต์ (Universal Pattern):

### 1. Atomic State Management (กฎเหล็กเรื่องเงินและสต็อก)
*   **The Problem:** การดึงข้อมูลออกมาคำนวณใน Code แล้วเซฟกลับ (Read-Modify-Write) จะเกิด Race Condition เมื่อมีการเรียกพร้อมกัน
*   **The Discipline:** **ห้าม** คำนวณใน Memory สำหรับค่าวิกฤต ให้ใช้คำสั่งระดับ Database (Atomic Operations) เสมอ
    *   **Example:** ใช้ `$inc` ใน MongoDB หรือ `UPDATE ... SET stock = stock - 1` ใน SQL พร้อมเงื่อนไขการตรวจสอบในคิวรีเดียว
*   **Best Practice:** ตรวจสอบเงื่อนไขควบคู่ไปกับการอัปเดตเสมอ (เช่น `stock: { $gte: quantity }`) เพื่อความปลอดภัย 100%

### 2. Idempotency & Double-Action Protection (การป้องกันการทำงานซ้ำ)
*   **The Problem:** ผู้ใช้กดปุ่มรัวๆ หรือ Network กระตุกทำให้ Request ส่งมาซ้ำ (Double Submission)
*   **The Discipline:** ทุก API ที่มีการเปลี่ยนแปลงข้อมูล (Mutation) **ต้อง** มีการตรวจสอบสถานะก่อนทำเสมอ
    *   **Atomic Lock:** ใช้ `findOneAndUpdate` เพื่อ "ล็อก" สถานะเดิมก่อนเปลี่ยนเป็นสถานะใหม่ หากสถานะเปลี่ยนไปแล้ว Request ที่สองจะหาไม่พบและไม่เกิดการทำงานเบิ้ล
*   **Universal Tool:** สำหรับโปรเจกต์ขนาดใหญ่ ควรใช้ **Idempotency-Key** ใน Header เพื่อระบุ Request ที่เป็นตัวเดียวกัน

### 3. Data Snapshotting (การรักษาสัจจะของข้อมูลในอดีต)
*   **The Problem:** หากลูกค้าซื้อของราคา 100 บาท แล้วเดือนหน้าเราเปลี่ยนราคาเป็น 200 บาท ออเดอร์ในอดีตจะเปลี่ยนตาม (ซึ่งผิด!)
*   **The Discipline:** ข้อมูลที่เป็น Transaction (Order, Invoice, Receipt) **ห้าม** ใช้การ Reference ไปยังตารางหลักเพียงอย่างเดียว
*   **Best Practice:** **ต้อง** ทำการ Copy ข้อมูลสำคัญ (Price, Name, Image, Address) ลงในก้อนข้อมูล Transaction นั้นๆ ทันที ณ วินาทีที่เกิดรายการ

### 4. Input Sanitization & Normalization (กฎความสะอาดของข้อมูล)
*   **The Discipline:** "Never Trust User Input" ข้อมูลจาก Frontend ต้องถูกขัดเกลาก่อนเข้าสู่ระบบเสมอ
*   **Mandatory Rules:**
    1.  **Trim Everywhere:** ตัดช่องว่างหัว-ท้ายของ String ทุกตัว เพื่อป้องกันบั๊กการค้นหา
    2.  **Case Normalization:** อีเมลและ Username ควรถูกทำเป็น `.toLowerCase()` เพื่อความเป็น SSOT
    3.  **Strict Regex:** ใช้ Regex มาตรฐานที่ยืดหยุ่น (Flexible Regex) ไม่ปิดกั้น Case พิเศษโดยไม่จำเป็น
    4.  **Numeric Sanitization:** ลบคอมม่า (,) ออกจากตัวเลขที่ส่งมาจาก FormData ก่อนคำนวณ

### 5. Double-Lock Resource Cleanup (การล้างทรัพยากรแบบประกันสองชั้น)
*   **The Discipline:** การล้างข้อมูลสำคัญ (เช่น ตะกร้าสินค้าหลังจ่ายเงิน) ไม่ควรฝากความหวังไว้ที่ฝั่งใดฝั่งหนึ่ง
*   **Step 1 (Backend Driven):** ล้างทันทีใน Logic ที่ประมวลผลสำเร็จ (เช่น หลังอัปเดตสถานะออเดอร์)
*   **Step 2 (Frontend Driven):** ล้างซ้ำเมื่อผู้ใช้ไปถึงหน้า Success (ช่วยรองรับกรณี Network Backend ตอบกลับช้าแต่ DB อัปเดตไปแล้ว)

### 6. Error Handling Architecture (การสื่อสารที่ชัดเจน)
*   **The Discipline:** Error Message ต้องสื่อสารให้ผู้ใช้รู้ว่า "ต้องทำอะไรต่อ" ไม่ใช่แค่บอกว่า "มีอะไรพัง"
*   **Best Practice:** แยก Error ตามสถานะ HTTP ที่ถูกต้อง:
    *   **400 (Bad Request):** ข้อมูลผิดพลาด (บอกจุดที่ผิด)
    *   **401 (Unauthorized):** ไม่ได้ล็อกอิน
    *   **403 (Forbidden):** ไม่มีสิทธิ์ (Admin Only)
    *   **409 (Conflict):** ข้อมูลซ้ำ (Email already exists)
    *   **429 (Too Many Requests):** ยิงรัวเกินไป (Rate Limit)

---

## ⚠️ ข้อควรระวังวิกฤต (Critical Precautions)

1.  **Hardcoded Values:** ห้ามใช้ String หรือตัวเลขดิบๆ ในการเช็คสถานะ ให้รวมศูนย์ไว้ที่ **Constants** เท่านั้น
2.  **N+1 Query:** ระวังการรัน Query ภายใน Loop ให้ใช้ **Bulk Write** หรือ `$in` แทนเสมอ
3.  **Collection Scan:** ทุก Field ที่ใช้เป็นเงื่อนไขในการค้นหา (Filter) **ต้อง** มีการทำ **Index** ใน Database
4.  **Sensitive Data:** ห้ามส่ง Password หรือข้อมูลส่วนตัวที่ไม่จำเป็นกลับไปใน API Response (ใช้ `select: false` หรือ Filter ออก)
5.  **Unprotected Admin Routes:** ทุก API ของ Admin **ต้อง** ผ่าน Middleware ตรวจสอบสิทธิ์ (Protect & Admin Role) ห้ามละเลยโดยเด็ดขาด

---

## ข้อสังเกตและจุดที่ควรปรับปรุง

- โฟลเดอร์และโครงสร้างไฟล์ถูกปรับปรุงให้เป็นระเบียบตามมาตรฐานล่าสุดแล้ว
- ระบบสินค้า (Product) ใช้โครงสร้างแบบยืดหยุ่นด้วย `Map` และรองรับการอัปเดตเฉพาะส่วน (Partial Update)
- ระบบการทดสอบครอบคลุมทั้ง User และ Product พร้อมรันแบบอัตโนมัติด้วย `httpyac`
- โปรเจกต์กำลังโฟกัสที่การพัฒนาบน **API v1** เป็นหลัก

---
