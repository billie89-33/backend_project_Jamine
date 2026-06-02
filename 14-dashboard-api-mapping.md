# 📊 14. Admin Dashboard API Mapping (Backend Handover)

เอกสารฉบับนี้สรุปการเชื่อมต่อ API สำหรับหน้า Admin Dashboard โดยครอบคลุมทั้งข้อมูลสถิติรวม, กราฟรายได้, ส่วนแบ่งหมวดหมู่, ออเดอร์ล่าสุด และสินค้าขายดี   

---

## 🗺️ 1. API Route Overview

| Feature | Method | Endpoint | Query Params | ผลลัพธ์ที่ส่งกลับ |
| :--- | :--- | :--- | :--- | :--- |
| **🚀 รวมข้อมูลทั้งหมด** | `GET` | `/api/v1/admin/dashboard/all` | `?period=month` | รวม Summary, Chart, Category, Recent Orders, Top Products, Low Stock, Order Status และ User Growth ใน Request เดียว |
| **ภาพรวมสถิติ** | `GET` | `/api/v1/admin/dashboard/summary` | `?period=today\|week\|month\|year` | ยอดขายรวม, จำนวนออเดอร์, จำนวนลูกค้า พร้อม % Trend เปรียบเทียบ |
| **กราฟรายได้** | `GET` | `/api/v1/admin/dashboard/revenue-chart` | `?period=week\|month\|year` | ข้อมูล Time-series สำหรับวาดกราฟเส้น (Revenue per day/month) |
| **กราฟหมวดหมู่** | `GET` | `/api/v1/admin/dashboard/category-sales`| `?period=week\|month\|year` | ยอดขายแยกตามหมวดหมู่สินค้า พร้อมรหัสสีสุ่มสำหรับ Donut Chart |
| **ออเดอร์ล่าสุด** | `GET` | `/api/v1/admin/dashboard/recent-orders` | `?limit=5` | รายการออเดอร์ 5 รายการล่าสุด พร้อมชื่อลูกค้าและสถานะ |
| **สินค้าขายดี** | `GET` | `/api/v1/admin/dashboard/top-products` | `?limit=5` | รายการสินค้าที่มียอดขายสูงสุด เรียงจากมากไปน้อย |
| **แจ้งเตือนสต็อกต่ำ** | `GET` | `/api/v1/admin/dashboard/low-stock` | `?threshold=5` | รายการสินค้าที่มีสต็อกน้อยกว่าค่าที่กำหนด |
| **สัดส่วนสถานะออเดอร์** | `GET` | `/api/v1/admin/dashboard/order-status` | - | สรุปจำนวนออเดอร์แยกตามสถานะ (Awaiting Payment, Paid, etc.) |
| **กราฟลูกค้าใหม่** | `GET` | `/api/v1/admin/dashboard/user-growth` | `?period=month` | ข้อมูลการเติบโตของผู้ใช้ใหม่ตามช่วงเวลา |

---

## 💎 2. Data Structures (JSON Examples)

### 2.1 Dashboard Summary
```json
{
  "balance": { "value": 150000, "trend": "+15%", "currentPeriodValue": 25000 },
  "orders": { "value": 120, "trend": "+5%", "currentPeriodValue": 12 },
  "customers": { "value": 45, "trend": "-2%", "currentPeriodValue": 3 }
}
```

### 2.2 Revenue Chart Data
```json
[
  { "date": "01 Jun", "revenue": 15000 },
  { "date": "02 Jun", "revenue": 22000 }
]
```

### 2.3 Category Sales (with dynamic colors)
```json
[
  { "category": "Notebook", "sales": 45, "color": "bg-purple-600" },
  { "category": "Keyboard", "sales": 30, "color": "bg-indigo-500" }
]
```

---

## 🧠 3. Engineering Implementation Notes

1.  **High-Performance Aggregation:** ใช้ MongoDB `$facet` และ `$group` ในระดับ Database เพื่อคำนวณสถิติทั้งหมดในครั้งเดียว ลดภาระของ Node.js
2.  **Trend Calculation:** ระบบคำนวณ % Trend โดยอัตโนมัติจากการเปรียบเทียบข้อมูลช่วงเวลาปัจจุบัน (Current Period) กับช่วงเวลาก่อนหน้า (Previous Period)
3.  **Data Snapshotting:** ข้อมูลในออเดอร์ (Recent Orders) ใช้ข้อมูลที่ถูก Snapshot ไว้ ณ วันที่ซื้อ เพื่อความถูกต้องแม้สินค้าจะถูกลบหรือแก้ไขในภายหลัง
4.  **Security:** ทุก Endpoint ถูกป้องกันด้วย Middleware `protect` และ `admin` (ต้องการสิทธิแอดมินเท่านั้น)

---
*อัปเดตล่าสุดโดย Gemini CLI & Backend Team - 2026-06-02*
