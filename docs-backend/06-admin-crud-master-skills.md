# 🛠️ The Ultimate Admin CRUD Master Skill: Flexible Surgical Updates

เอกสารฉบับนี้รวบรวม "Master Skill" สำหรับการทำระบบจัดการหลังบ้าน (Admin CRUD) ที่ยืดหยุ่นที่สุด รองรับการแก้ไขข้อมูลเฉพาะส่วน (Surgical Edit) โดยไม่เกิด Side Effect และสามารถนำไปปรับใช้ได้กับทุกโปรเจกต์ (Universal Pattern)

---

## ⚡ 1. รูปแบบการอัปเดตเฉพาะจุด (The Universal Surgical Edit Pattern)
หัวใจสำคัญของการทำ `PATCH` คือการอัปเดตเฉพาะสิ่งที่ส่งมา โดยไม่กระทบกับข้อมูลเดิมและไม่ติดเงื่อนไข `required` ของฟิลด์อื่น

### ✅ สิ่งที่ต้องทำ (Best Practice)
- **Query Context Validation:** ใช้ `{ context: 'query' }` ใน Mongoose เสมอ เพื่อให้ Validator ตรวจสอบเฉพาะฟิลด์ที่ส่งมาจริงๆ
- **Selective Field Mapping:** สกัดเอาเฉพาะฟิลด์ที่มีค่าส่งมาจริง (`req.body[field] !== undefined`) เพื่อป้องกันการทับข้อมูลเดิมด้วย `undefined`
- **Separation of $set & $unset:** แยก Logic การอัปเดต (`$set`) และการลบฟิลด์ (`$unset`) ออกจากกันให้ชัดเจน โดยเฉพาะกับข้อมูลประเภท `Map` หรือ Dynamic Keys

```javascript
// ✅ ตัวอย่าง Pattern ที่ยืดหยุ่นที่สุด
const updateData = {};
const unsetObj = {};


// วนลูปสกัดเฉพาะฟิลด์ที่ส่งมา
fields.forEach(field => {
    if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
    }
});

// จัดการ Dynamic Map (เช่น specifications)
if (req.body.specifications) {
    for (const [key, value] of Object.entries(req.body.specifications)) {
        if (value === null || value === '') {
            unsetObj[`specifications.${key}`] = 1; // ลบสเปคบางตัว
        } else {
            updateData[`specifications.${key}`] = value; // อัปเดต/เพิ่มสเปค
        }
    }
}

// ยิงคำสั่งเดียวแต่ทำงานครบถ้วน
await Model.findByIdAndUpdate(id, { $set: updateData, $unset: unsetObj }, { runValidators: true, context: 'query' });
```

---

## 🖼️ 2. การจัดการสื่อและไฟล์ (Media Lifecycle Management)
การอัปเดตไฟล์รูปภาพต้องทำแบบ Atomic คือต้องลบรูปเก่าทิ้งและแทนที่ด้วยรูปใหม่โดยไม่ให้เกิด "Storage Leak"

### ✅ สิ่งที่ต้องทำ (Best Practice)
- **Safe Deletion:** ครอบคำสั่งลบไฟล์ (เช่น `cloudinary.uploader.destroy`) ด้วย `try-catch` เสมอ เพื่อไม่ให้ Error เล็กๆ จากฝั่ง Cloud Provider มาขวางการอัปเดตข้อมูล Text ใน Database
- **Cleanup on Error:** หากการอัปเดต Database ล้มเหลว แต่เราอัปโหลดรูปขึ้น Cloud ไปแล้ว ต้องมี Logic ในการลบรูปที่เพิ่งอัปโหลดไปทิ้งทันทีใน `catch` block

---

## ⚠️ 3. ข้อควรระวังและสิ่งที่ห้ามทำ (Pitfalls & Don'ts)

- **🚫 ห้ามใช้ runValidators โดยไม่มี context: 'query':** เพราะ Mongoose จะพยายามเรียกหาฟิลด์ `required` อื่นๆ ที่เราไม่ได้ส่งมาในการอัปเดตครั้งนั้น ทำให้เกิด Error 400/500 โดยใช่เหตุ
- **🚫 ห้ามอัปเดตทับทั้ง Object:** หากใน Database มีข้อมูลอยู่ 10 ฟิลด์ แต่หน้าบ้านส่งมาแค่ 1 ฟิลด์ การอัปเดตทับทั้งก้อน (เช่น `model.specifications = newSpecs`) จะทำให้ข้อมูลอีก 9 ฟิลด์หายวับไปทันที
- **🚫 ห้ามเชื่อมั่นใน Data Type จาก FormData:** ข้อมูลที่ส่งผ่าน `multipart/form-data` มักจะเป็น `String` เสมอ (เช่น `"true"`, `"150"`) ต้องทำการ Normalize/Cast Type ให้ถูกต้อง (Boolean, Number) ก่อนบันทึกลง Database เสมอ

---

## 💎 4. สรุปความยืดหยุ่นสำหรับโปรเจกต์อื่น
1. **Schema Independence:** Pattern นี้ใช้ได้กับ Model ทุกรูปแบบ ไม่ว่าสเปคสินค้าจะเยอะแค่ไหน
2. **Performance First:** ใช้คำสั่งระดับ Database (`$set`, `$unset`) ในทีเดียว ลดภาระการโหลดข้อมูลมาประมวลผลใน RAM (No Read-Modify-Write)
3. **UX Friendly:** หน้าบ้านส่งข้อมูลมาเท่าที่เปลี่ยน (Partial) ระบบหลังบ้านรองรับได้หมด ไม่บังคับให้ส่งรูปภาพใหม่ทุกครั้งที่แก้ไขชื่อสินค้า
