# 📍 Advanced Guide: Address Management & Auto-complete Integration

เอกสารระดับ Advanced สำหรับทีม Frontend เพื่อการจัดการที่อยู่และการใช้ระบบ Auto-complete ให้มีประสิทธิภาพสูงสุดตามมาตรฐาน E-commerce

---

## 🏗 1. ข้อมูลที่อยู่ (Address Schema)
Backend ใช้โครงสร้างแบบ **Structured Data** เพื่อรองรับการทำ SEO, Analytics และการขนส่งที่แม่นยำ

| Key | Description | Data Source |
| :--- | :--- | :--- |
| `fullName` | ชื่อ-นามสกุล ผู้รับ | Manual Input |
| `phone` | เบอร์โทรศัพท์ | Manual Input |
| `address` | บ้านเลขที่, ถนน, ซอย | Manual Input |
| `subDistrict` | ตำบล / แขวง | **Auto-complete** |
| `district` | อำเภอ / เขต | **Auto-complete** |
| `province` | จังหวัด | **Auto-complete** |
| `postalCode` | รหัสไปรษณีย์ | **Trigger (กรอกเพื่อเริ่ม Auto-complete)** |
| `isDefault` | ตั้งเป็นที่อยู่หลัก | Boolean (UI Switch) |

---

## 🚀 2. การเชื่อมต่อกับ Library (Frontend Integration)

แนะนำให้ใช้ `react-thailand-address-autocomplete` เพื่อประสบการณ์การใช้งานที่ดีที่สุด

### **Pattern การทำระบบกรอกที่อยู่:**
1.  **Postal Code Trigger:** เมื่อผู้ใช้เริ่มกรอกรหัสไปรษณีย์ ให้ระบบทำการ Search ข้อมูล
2.  **Mapping Data:** เมื่อเลือกรายการจาก Library ให้แมปค่าลง State ดังนี้:
    ```javascript
    // ตัวอย่างการแมปค่าจาก Library เข้าสู่ State ของคุณ
    const onSelect = (address) => {
        setFormData({
            ...formData,
            subDistrict: address.subdistrict,
            district: address.district,
            province: address.province,
            postalCode: address.zipcode
        });
    };
    ```
3.  **Field Locking:** ควรตั้งค่าฟิลด์ `province`, `district`, `subDistrict` เป็น **Read-only** (แต่ยังแสดงผล) เพื่อป้องกันลูกค้าแก้ไขข้อมูลที่ผิดพลาดหลังจากเลือกจากระบบ Auto-complete แล้ว

---

## 🛠 3. API Endpoints สำหรับจัดการที่อยู่ (Profile Level)

ใช้สำหรับหน้า "จัดการที่อยู่" (Address Book) ในโปรไฟล์ผู้ใช้

### **A. เพิ่มที่อยู่ใหม่**
*   **Method:** `POST`
*   **URL:** `/api/v1/users/addresses`
*   **Payload:** ส่งครบ 7 ฟิลด์ + `isDefault` (ถ้าต้องการ)

### **B. ลบที่อยู่**
*   **Method:** `DELETE`
*   **URL:** `/api/v1/users/addresses/:addressId`

---

## 🛡 4. ข้อควรระวังและการจัดการ Error (Edge Cases)

1.  **Default Address Sync:** 
    *   Backend มีระบบ Auto-sync: ถ้าคุณส่ง `isDefault: true` มาในที่อยู่ใหม่ ระบบจะไปปลด `isDefault` ของที่อยู่เก่าออกให้โดยอัตโนมัติ (Frontend ไม่ต้องวน Loop แก้เอง)
2.  **Validation:** 
    *   ห้ามส่งฟิลด์ว่างมาที่ Backend แม้จะเป็นการใช้ Auto-complete เพราะระบบมีการตรวจสอบ `required: true` ในระดับ Model
3.  **Address Snapshot in Order:**
    *   **สำคัญมาก:** ข้อมูลที่อยู่ในการสั่งซื้อจะถูก **Snapshot (Copy)** เก็บลงในออเดอร์ทันที ดังนั้นหากผู้ใช้แก้ไขที่อยู่ในโปรไฟล์หลังจากสั่งซื้อไปแล้ว ข้อมูลในออเดอร์เดิมจะไม่เปลี่ยนตาม (เพื่อเป็นหลักฐานการขนส่งที่ถูกต้อง)

---

## 💡 Pro Tips สำหรับ UX
*   **Mobile Keyboard:** ฟิลด์ `phone` และ `postalCode` ควรใช้ `inputMode="numeric"` เพื่อให้มือถือเด้งแป้นพิมพ์ตัวเลขขึ้นมาให้
*   **Visual Feedback:** เมื่อเลือกที่อยู่จาก Auto-complete สำเร็จ ควรมี Animation หรือ Highlight ที่ฟิลด์อื่นๆ เพื่อบอกให้ผู้ใช้รู้ว่าข้อมูลถูกกรอกให้แล้ว

---
*Created by Gemini CLI Agent - Project Jamine*
