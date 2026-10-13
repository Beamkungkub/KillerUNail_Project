# KillerUNail_Project — Hospital System

ระบบจัดการโรงพยาบาล (คนไข้ / หมอ / ห้อง / นัดหมาย / จ่ายยา / ค่าปรับ / Blacklist / แจ้งเตือนคลังยา)

| ส่วน | เทคโนโลยี |
|---|---|
| Backend | NestJS + mssql |
| Frontend | React + Vite |
| Database | Microsoft SQL Server (`HospitalDB`) |

## ฟีเจอร์หลัก

- จองคิว / สร้างคนไข้ใหม่ / บันทึกอาการและผลวินิจฉัย
- จ่ายยา (ตัดสต็อก, คำนวณยอดที่คนไข้ต้องจ่ายตามสิทธิการรักษา) และดูประวัติการจ่ายยา
- ค่าปรับจ่ายช้า (200 × จำนวนวันช้า × 5%) และรับชำระเงิน
- Blacklist คนไข้ที่ค้างชำระเกิน 30 วัน
- แจ้งเตือนยาใกล้หมดอายุ / สต็อกต่ำกว่าจุดสั่งซื้อ
- กรอกวันที่แบบ พ.ศ.

## สิ่งที่ต้องติดตั้งก่อน

- [Node.js](https://nodejs.org) (เวอร์ชัน LTS)
- SQL Server (เช่น SQL Server Express)
- SSMS หรือ Azure Data Studio

## วิธีรันโปรเจกต์

### 1. เตรียมฐานข้อมูล

เปิดไฟล์ผ่าน SSMS / Azure Data Studio แล้ว Execute **เรียงตามลำดับ ห้ามสลับ**:

1. `01_create_database.sql` — สร้างฐานข้อมูล + ตารางหลัก (รันครั้งเดียวพอ ห้ามรันซ้ำ)
2. `02_update_schema.sql` — เพิ่มตาราง/คอลัมน์ใหม่ (รันซ้ำได้ปลอดภัย)
3. `03_insert_master_data.sql` — ข้อมูลตัวอย่าง คนไข้/หมอ/ห้อง/ยา
4. `04_insert_demo_data.sql` — ข้อมูลตัวอย่างนัดหมาย/จ่ายยา/Blacklist สำหรับสาธิต

ก่อนรันไฟล์ที่ 2–4 ให้เลือก database เป็น `HospitalDB` ที่แถบเครื่องมือก่อน

### 2. ตั้งค่าการเชื่อมต่อ

```bash
cd hospital-backend
copy .env.example .env
```

แล้วเปิด `.env` แก้ `DB_SERVER` ให้ตรงกับ SQL Server ในเครื่อง:

```
DB_SERVER=localhost\SQLEXPRESS01
DB_DATABASE=HospitalDB
DB_TRUSTED_CONNECTION=true
```

เช็กชื่อ instance ได้จาก `services.msc` → service ชื่อ `SQL Server (...)` ที่ Running

### 3. รัน Backend

```bash
cd hospital-backend
npm install
npm run start:dev
```

Backend ทำงานที่ http://localhost:3000 (ทดสอบ: เปิด http://localhost:3000/patients ต้องเห็น JSON)

### 4. รัน Frontend (เปิด Terminal ใหม่)

```bash
cd hospital-frontend
npm install
npm run dev
```

เปิด http://localhost:5173 ในเบราว์เซอร์

## รีเซ็ตข้อมูลกลับเป็นชุดตั้งต้น

รัน `03_insert_master_data.sql` แล้วตามด้วย `04_insert_demo_data.sql` (ไม่ต้องรัน `02` ซ้ำ)

## เอกสารเพิ่มเติม

- [`project-changelog-and-demo.md`](project-changelog-and-demo.md) — สรุปสิ่งที่เพิ่ม/แก้ทั้งหมด และชุดคำสั่ง SQL สำหรับสาธิต


