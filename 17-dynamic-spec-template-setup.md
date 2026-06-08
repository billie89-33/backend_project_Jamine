# 🛠️ แผนการพัฒนาระบบ Dynamic Specification Template (Smart Auto-fill)

เอกสารนี้รวบรวมแนวทางและโค้ดที่จำเป็นสำหรับการทำระบบ "แนะนำสเปคสินค้าอัตโนมัติ" (Auto-suggest Spec Keys) โดยอ้างอิงจากข้อมูลสินค้าเดิมที่เคยมีการบันทึกไว้ในฐานข้อมูล (Aggregation) เพื่อให้ระบบมีความฉลาดและยืดหยุ่น 100%

---

## ✅ สถานะการดำเนินการ (Implementation Status)

- [x] **Backend Logic:** 구현เสร็จสมบูรณ์ใน `src/controllers/v1/products.controller.js`
- [x] **Route Setup:** เชื่อมต่อเรียบร้อยที่ `GET /api/v1/products/spec-keys`
- [x] **Optimization:** ปรับปรุง Aggregation Pipeline ให้รองรับ Case-insensitive และเรียงลำดับ Key (A-Z)
- [x] **Data Integrity:** ยกเลิกการกรอง Status เพื่อให้ Admin ได้ Template ที่ครบถ้วนที่สุดจากสินค้าทุกชิ้นในหมวดหมู่

---

## 1. แนวคิดการทำงาน (Architecture Pattern)

1. **Frontend (React):** เมื่อ Admin เลือกหมวดหมู่สินค้า (Category) ระบบจะยิง API ไปถาม Backend ว่า *"ในหมวดหมู่นี้ เคยมีคนกรอก Key สเปคอะไรไว้บ้าง?"*
2. **Backend (Node.js/Mongoose):** รับคำขอแล้วใช้คำสั่ง `Aggregation Pipeline` เข้าไปกวาดข้อมูลจากฟิลด์ `specifications` (ที่เป็น Map/Object) ของสินค้าทั้งหมดในหมวดหมู่นั้น แล้วสกัดเอาเฉพาะ **"ชื่อ Key ที่ไม่ซ้ำกัน (Unique Keys)"** ส่งกลับมาเป็น Array (เช่น `["Switch", "Color", "Layout"]`)
3. **Frontend (React):** นำ Array ของ Key ที่ได้ มาวาดเป็นช่อง Input (แถว) เตรียมรอไว้ให้ Admin กรอกแค่ Value (ส่วน Key ไหนที่ไม่ใช้ก็สามารถกดกากบาทลบทิ้งได้เลย)

---

## 2. รายละเอียดการ 구현 ใน Backend (Implemented)

### 2.1 Controller: `src/controllers/v1/products.controller.js`
เราใช้ Aggregation Pipeline ที่ซับซ้อนขึ้นเพื่อให้ได้ข้อมูลที่คลีนและเรียงลำดับสวยงาม:

```javascript
export const getSpecKeys = async (req, res, next) => {
    try {
        const { category } = req.query;
        if (!category) {
            const error = new Error('Category is required');
            error.status = 400;
            return next(error);
        }

        const result = await Product.aggregate([
            // 1. กรองหมวดหมู่ (Case Insensitive)
            { $match: { category: { $regex: `^${category}$`, $options: 'i' } } },
            // 2. สกัด Key ออกจาก Map
            { $project: {
                specKeys: {
                    $map: {
                        input: { $objectToArray: "$specifications" },
                        as: "item",
                        in: "$$item.k"
                    }
                }
            }},
            { $unwind: "$specKeys" },
            // 3. กรองเอาเฉพาะ Unique Keys
            { $group: { _id: null, uniqueKeys: { $addToSet: "$specKeys" } } },
            // 4. เรียงลำดับ A-Z
            { $unwind: "$uniqueKeys" },
            { $sort: { "uniqueKeys": 1 } },
            { $group: { _id: null, data: { $push: "$uniqueKeys" } } }
        ]);

        const keys = result.length > 0 ? result[0].data : [];
        res.status(200).json({ success: true, data: keys });
    } catch (error) {
        next(error);
    }
};
```

### 2.2 Route: `src/routes/v1/products.routes.js`
```javascript
// ต้องวางไว้ก่อน /:id เสมอ
router.get('/spec-keys', getSpecKeys);
```

---

## 3. สรุปผลลัพธ์และข้อดี (Outcome & Benefits)

1. **Efficiency:** Admin ไม่ต้องพิมพ์ชื่อสเปคเดิมๆ ซ้ำๆ (ลดโอกาสพิมพ์ผิด)
2. **Consistency:** ข้อมูลในหมวดหมู่เดียวกันจะมีชื่อ Key ที่เป็นมาตรฐานเดียวกัน
3. **Adaptive:** ระบบจะ "เก่งขึ้น" ตามข้อมูลที่เพิ่มเข้าสู่ระบบ ยิ่งมีสินค้าเยอะ สเปคแนะนำยิ่งครบถ้วน
4. **Performance:** ใช้ Indexing บนฟิลด์ `category` ทำให้ Aggregation ทำงานได้รวดเร็ว