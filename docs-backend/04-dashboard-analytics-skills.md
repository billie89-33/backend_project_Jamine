---

# 📊 The Ultimate Admin Dashboard Skill: Analytics & Visualization

เอกสารฉบับนี้คือ "Master Skill" สำหรับการออกแบบ API ดึงข้อมูลสถิติ (Admin Dashboard) ที่ถูกต้อง แม่นยำ และแสดงผลกราฟร่วมกับ Frontend ได้อย่างสมบูรณ์แบบ (โดยเฉพาะเมื่อใช้ไลบรารีอย่าง ApexCharts)

---

## 📅 1. การคำนวณช่วงเวลา (Date Range Filtering)
การกรองข้อมูลตามช่วงเวลา (today, week, month, year) ต้องหลีกเลี่ยงการอ้างอิงและแก้ค่า Object แบบต่อเนื่อง (Mutation) 

### 🚫 สิ่งที่ไม่ควรทำ (Pitfalls)
- ห้ามใช้ `new Date(now).setDate(...)` หลายๆ ครั้งใน `Promise.all()` เพราะเป็นการ Mutate Object เดิม ทำให้วันที่ของแต่ละฟังก์ชันที่ทำงานขนานกันเกิดการตีกันและดึงข้อมูลผิดเพี้ยน

### ✅ สิ่งที่ต้องทำ (Best Practice)
- ให้ใช้ `switch-case` และการตั้งค่าจาก `now.getFullYear()`, `now.getMonth()` เพื่อความเป๊ะ:
```javascript
const { period = 'month' } = req.query;
const now = new Date();
let startDate = new Date();
let groupByFormat;

switch (period) {
    case 'today':
        startDate.setHours(0, 0, 0, 0);
        groupByFormat = '%H:00'; // จัดกลุ่มตามชั่วโมง
        break;
    case 'week':
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        groupByFormat = '%Y-%m-%d'; // จัดกลุ่มตามวัน
        break;
    case 'year':
        startDate = new Date(now.getFullYear(), 0, 1); // 1 มกราคม ของปีนี้
        groupByFormat = '%Y-%m'; // จัดกลุ่มตามเดือน
        break;
    default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1); // วันที่ 1 ของเดือนนี้
        groupByFormat = '%Y-%m-%d';
}
```

---

## 📈 2. กฎการแสดงผลกราฟเส้น (Line/Area Chart Rendering)
ไลบรารีกราฟหน้าบ้าน (เช่น ApexCharts) จำเป็นต้องมีข้อมูลอย่างน้อย 2 จุด (Points) เพื่อทำการ "ลากเส้น" เชื่อมกัน

### 🚨 ปัญหากราฟหาย (Single-Point Bug)
- หากคิวรี่ข้อมูลออกมาแล้วพบว่ายอดขายเกิดขึ้นแค่ในวันเดียว (Array มีแค่ 1 ก้อน) กราฟหน้าบ้านจะพัง หรือแสดงผลไม่ได้

### ✅ วิธีแก้ (Dummy Start Point)
- ต้องเช็ค `length` ของข้อมูลก่อนส่งกลับเสมอ หากมีแค่ 1 จุด ให้แทรกจุดเริ่มต้นจำลองเข้าไปด้านหน้า:
```javascript
if (chartData.length === 1) {
    chartData.unshift({ 
        date: period === 'year' ? 'Jan' : 'Start', 
        revenue: 0 // ใส่ 0 เพื่อให้กราฟลากจากฐานขึ้นมา
    });
}
```

---

## 🧮 3. การแสดงผลยอดสรุป (Dynamic Summary Mapping)
เมื่อผู้ใช้กด Filter ช่วงเวลา (เช่น ดูของวันนี้) ยอดตัวเลขขนาดใหญ่ (Main Value) บนหน้า Dashboard ต้องเปลี่ยนตามช่วงเวลานั้น ไม่ใช่นำยอดรวมตลอดกาล (All Time) มาแสดง

### ✅ โครงสร้าง Response ที่ถูกต้อง:
```javascript
const summary = {
    balance: { 
        value: currentRevenue,      // ยอดตามช่วงเวลาที่ Filter (Today, Week, Month)
        trend: revenueTrend,        // % การเปลี่ยนแปลงเทียบกับช่วงเวลาก่อนหน้า
        allTimeValue: totalRevenue  // เก็บยอดรวมตลอดกาลแยกไว้เผื่อใช้
    }
};
```
- ห้ามจับคู่สลับกันเด็ดขาด (ห้ามเอา `totalRevenue` ไปไว้ใน `value` หลัก) เพื่อให้หน้าบ้านแสดงผลได้ตรงกับการกดปุ่ม Filter ของผู้ใช้