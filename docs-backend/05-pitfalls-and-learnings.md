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

---

