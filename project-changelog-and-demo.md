# Hospital System — สรุปสิ่งที่เพิ่ม/แก้ทั้งหมด + ชุดคำสั่ง SQL สำหรับสาธิต

เอกสารนี้เทียบระหว่าง **โปรเจคตั้งต้น** (ไฟล์แรกที่ส่งมา: `OneDrive_2026-09-27.zip`)
กับ **เวอร์ชันปัจจุบัน** (`Hospital_project_3.zip`) — สรุปว่าเพิ่มอะไร ทำไมต้องเพิ่ม
และทำอะไรไปบ้าง พร้อมชุดคำสั่ง SQL ต้นแบบไว้ใช้สาธิตให้อาจารย์ดู (เพิ่มคนไข้ →
จ่ายยา → ทำให้ค้างจ่าย → ขึ้น Blacklist ฯลฯ)

---

## 1. ภาพรวม: ต่างจากตอนเริ่มต้นตรงไหนบ้าง

| หัวข้อ | ตอนเริ่มต้น | ตอนนี้ |
|---|---|---|
| ตารางในฐานข้อมูล | 6 ตาราง (Patient, Doctor, Room, Medicine, Appointment, Dispensing) | เพิ่ม **Insurance_Type**, **Blacklist** รวมเป็น 8 ตาราง |
| คอลัมน์ Patient | ชื่อ, เบอร์โทร, ที่อยู่, วันเกิด, ประวัติป่วย | เพิ่ม CID, สิทธิการรักษา, เพศ, กรุ๊ปเลือด, แพ้ยา, เบอร์ฉุกเฉิน |
| คอลัมน์ Medicine | ชื่อ, ประเภท, สต็อก | เพิ่มชื่อสามัญ, ราคา/หน่วย, หน่วยนับ, วันหมดอายุ, จุดสั่งซื้อ |
| คอลัมน์ Doctor/Room | ข้อมูลพื้นฐาน | เพิ่มสถานะ (ว่าง/ไม่ว่าง, ปฏิบัติงาน/ลา), เบอร์โทร, ใบอนุญาต, ราคาห้อง |
| คอลัมน์ Appointment | ไม่มีอาการ/ผลวินิจฉัย | เพิ่ม Symptom, Diagnosis |
| คอลัมน์ Dispensing | ไม่มี Is_dispensed | เพิ่ม Is_dispensed, Dispensed_at, Patient_Pay_Amount |
| หน้าเว็บ (frontend) | 6 หน้า พื้นฐาน ยังต่อ backend ไม่ครบ | 9 หน้า ต่อ backend ครบทุกปุ่ม + เพิ่ม Blacklist, แจ้งเตือนคลังยา |
| การกรอกวันที่ | `<input type="date">` (ค.ศ.) | เปลี่ยนเป็นตัวเลือกวัน/เดือน/ปี แบบ พ.ศ. |

---

## 2. เพิ่มอะไรไปบ้าง และทำไม

### 2.1 ฐานข้อมูล (`update_v2.sql`)

| เพิ่มอะไร | ทำไมต้องเพิ่ม |
|---|---|
| ตาราง `Insurance_Type` (บัตรทอง/ประกันสังคม/ข้าราชการ/ชำระเงินเอง + วงเงินคุ้มครอง) | เดิมไม่มีระบบสิทธิการรักษาเลย จ่ายยาไม่รู้ว่าใครต้องจ่ายเองเท่าไหร่ |
| ตาราง `Blacklist` + stored procedure `sp_Update_Blacklist` | โค้ด backend เรียกใช้ endpoint `/blacklist` อยู่แล้วแต่ไม่เคยมีตารางจริงในฐานข้อมูล (บั๊กที่เจอตอนตรวจสอบระบบ) |
| `Patient.CID, Insurance_Type_ID, Gender, Blood_Type, Allergy, Emergency_Contact` | ข้อมูลผู้ป่วยพื้นฐานที่โรงพยาบาลไทยจริงต้องมี แต่ของเดิมไม่มี |
| `Medicine.Generic_Name, Unit_Price, Unit, Expiry_Date, Reorder_Point` | เดิมไม่มีราคายาเลย ต้องกรอกยอดเงินมือทุกครั้ง เสี่ยงพิมพ์ผิด และไม่มีระบบเตือนยาหมดอายุ/สต็อกต่ำ |
| `Dispensing.Is_dispensed, Dispensed_at, Patient_Pay_Amount` | เดิมจ่ายยาไปแล้วไม่มีอะไรบอกว่า "จ่ายแล้ว" รายการเลยค้างโชว์ซ้ำตลอด และไม่มีการคำนวณว่าคนไข้ต้องจ่ายเองเท่าไหร่หลังหักสิทธิ |
| `Doctor.Status, Room.Status` | ของเดิมจองหมอที่ลา/ห้องที่ไม่ว่างได้ เพราะไม่มีอะไรกรอง |
| `Appointment.Symptom, Diagnosis` | โน้ตงานสั่งให้มีบันทึกอาการตอนจอง และผลวินิจฉัยหลังตรวจ แต่ของเดิมไม่มีที่เก็บเลย |

`update_v2.sql` เขียนแบบ **idempotent** (ใช้ `IF NOT EXISTS` / `COL_LENGTH` เช็คก่อนทุกคำสั่ง) รันซ้ำกี่ครั้งก็ไม่ error และไม่ทำข้อมูลซ้ำ

### 2.2 Backend (`app.controller.ts`, `app.service.ts`)

| เพิ่ม endpoint | ทำไม |
|---|---|
| `GET /dispensing-history` | โน้ตงานข้อ 2 ของปริศร: ต้องดูประวัติการจ่ายยาที่ผ่านมาได้ |
| `GET /insurance-types` | ให้หน้าเว็บดึงรายชื่อสิทธิการรักษามาทำ dropdown |
| `POST /patients` | เดิมสร้างคนไข้ใหม่ได้แค่ผ่าน SQL ตรงๆ ตอนนี้ทำผ่านหน้าเว็บได้ |
| `POST /appointment/:id/diagnosis` | ให้หมอบันทึกผลวินิจฉัยหลังตรวจเสร็จ |
| `GET /stock-alerts` | แจ้งเตือนยาใกล้หมดอายุ/สต็อกต่ำกว่าจุดสั่งซื้อทั้งคลัง |
| `POST /dispensing/:id/mark-paid` | ปิดช่องโหว่ที่เจอตอนตรวจ: เดิมกด "จ่ายยา" แล้ว `Payment_date` ไม่เคยถูกตั้งค่าเลย ทำให้คำนวณค่าปรับ/Blacklist ผิดตลอด ตอนนี้แยกขั้นตอน "จ่ายยา" กับ "รับชำระเงิน" ออกจากกันชัดเจน |
| `dispenseMedicine()` แก้ใหม่ | เดิมแค่ตั้ง `Is_dispensed=1` ตอนนี้เช็คสต็อกพอไหม/ยาหมดอายุหรือยัง และคำนวณ `Patient_Pay_Amount` ให้อัตโนมัติ |
| `getLateFines()` แก้สูตร | ทำตามโน้ตงานของเจแปน/ชอย: ค่าปรับ = 200 × จำนวนวันช้า × 5% และรวมยอดค่าปรับทุกรายการของคนไข้คนเดียวกัน |
| `getDoctors()/getRooms()` กรองสถานะ | กันจองหมอที่ลา/ห้องที่ไม่ว่าง |

### 2.3 Frontend

| หน้า | สถานะ |
|---|---|
| `BlacklistPage.tsx` | **สร้างใหม่** — โน้ตงานไม่เคยมีใครรับผิดชอบมาก่อน |
| `StockAlertPage.tsx` | **สร้างใหม่** — bonus ต่อยอดจากคอลัมน์ Expiry_Date/Reorder_Point |
| `ThaiDateInput.tsx`, `ThaiDateTimeInput.tsx` | **สร้างใหม่** — เปลี่ยนวันเกิด/วันนัดเป็น พ.ศ. ตามที่ขอ |
| `DispensePage.tsx` | เพิ่มราคายา, ประวัติการจ่ายยา, เตือนหมดอายุ/สต็อกต่ำ (โน้ตงานข้อ 2-4 ของปริศร) |
| `FinesPage.tsx` | เพิ่มสรุปค่าปรับรวมต่อคนไข้, ปุ่ม/สถานะจ่ายแล้ว |
| `BookingPage.tsx` | เพิ่มฟอร์มสร้างคนไข้ใหม่ครบทุกฟิลด์, ช่องอาการ, ตัวเลือกวันที่ พ.ศ. |
| `PatientHistoryPage.tsx` | แสดงข้อมูลใหม่ที่ backend มีอยู่แล้วแต่หน้าเว็บไม่เคยโชว์ (CID, สิทธิ, ประเภทยา ฯลฯ) |

---

## 3. ชุดคำสั่ง SQL ต้นแบบ — ใช้สาธิตให้อาจารย์ดู

**คำเตือนก่อนใช้:** สคริปต์ชุดนี้แก้ข้อมูลจริงในฐานข้อมูล ควรสำรอง (backup) หรือจำสถานะก่อนไว้
ถ้าต้องการล้างกลับเป็นข้อมูลตั้งต้นทั้งหมด ให้รัน `INSERT.sql` ตามด้วย `demo_data.sql` ใหม่ (ดูข้อ 5)

ทุก template ด้านล่างมี **(A) คำสั่งทำ** และ **(B) คำสั่งเช็คผล** คู่กันเสมอ
แทนที่ตัวเลข ID ในวงเล็บ `< >` ด้วยของจริงจากฐานข้อมูลคุณ

### 3.1 Template: เพิ่มคนไข้ใหม่

```sql

--  เช็คว่าเพิ่มสำเร็จ + จด Patient_ID ไว้ใช้ต่อ
SELECT  * FROM Patient ORDER BY Patient_ID DESC;
```


### 3.2 Template: สร้างนัดหมายให้คนไข้คนนั้น

```sql
-- (A) จองคิว (หรือใช้หน้าเว็บ "จองคิว" เลือกชื่อคนไข้ที่เพิ่งสร้างก็ได้)
INSERT INTO Appointment (Doctor_ID, Patient_ID, Room_ID, Status, Date_and_Time, Symptom)
VALUES (1, <PATIENT_ID>, 1, N'รอคิว', GETDATE(), N'ปวดหัว มีไข้');

-- (B) เช็คว่าสร้างสำเร็จ + จด Appointment_ID ไว้ใช้ต่อ
SELECT TOP 1 * FROM Appointment ORDER BY Appointment_ID DESC;
```

### 3.3 Template: สั่งยาให้รอจ่าย (สร้างรายการใน Dispensing)

```sql
-- ดูราคายาก่อน เพื่อคำนวณ Total_amount ให้ถูก
SELECT Medicine_ID, Name, Unit_Price, Stock FROM Medicine;

-- (A) สั่งยา: จำนวน 10 หน่วย x ราคา/หน่วย = Total_amount (คำนวณเองแล้วใส่)
INSERT INTO Dispensing (Appointment_ID, Medicine_ID, Order_quantity, Total_amount, Payment_date, Due_date, Is_dispensed)
VALUES (<APPOINTMENT_ID>, 1 /* พาราเซตามอล */, 10, 20.00, NULL, DATEADD(DAY, 7, GETDATE()), 0);

-- (B) เช็คว่ารายการรอจ่ายขึ้นจริง (ต้องไปโผล่ในหน้าเว็บ "จ่ายยา" ด้วย)
SELECT * FROM Dispensing WHERE Appointment_ID = <APPOINTMENT_ID>;
```

### 3.4 Template: จ่ายยา แล้วย้อนกลับ (สาธิต + เช็คสต็อก)

```sql
-- (A) จ่ายยา: กดปุ่ม "จ่ายยา" ในหน้าเว็บ ที่ Dispensing_ID ของรายการนั้น
--     (ระบบจะตัดสต็อก + ตั้ง Is_dispensed=1 + คำนวณ Patient_Pay_Amount ให้เอง)

-- (B) เช็คผลหลังกดจ่าย
SELECT Is_dispensed, Dispensed_at, Patient_Pay_Amount FROM Dispensing WHERE Dispensing_ID = <ID>;
SELECT Stock FROM Medicine WHERE Medicine_ID = <MEDICINE_ID>;  -- ต้องลดลงตามจำนวนที่สั่ง

-- ===== ย้อนกลับ (ถ้าจ่ายไปแล้วอยากรีเซ็ตกลับเป็น "รอจ่าย") =====
UPDATE Medicine SET Stock = Stock + <ORDER_QUANTITY> WHERE Medicine_ID = <MEDICINE_ID>;
UPDATE Dispensing
SET Is_dispensed = 0, Dispensed_at = NULL, Patient_Pay_Amount = NULL
WHERE Dispensing_ID = <ID>;
```

### 3.5 Template: ทำให้ "จ่ายยาช้ากว่ากำหนด" (โชว์ในหน้าค่าปรับ)

```sql
-- (A) ตั้ง Due_date ให้เป็นอดีต แล้ว "รับชำระเงิน" (mark-paid) ช้ากว่านั้น
--     สูตรค่าปรับ = 200 x จำนวนวันช้า x 5% (เช่น ช้า 4 วัน = 200*4*0.05 = 40 บาท)
UPDATE Dispensing
SET Due_date = DATEADD(DAY, -4, GETDATE()), Payment_date = NULL, Is_dispensed = 1
WHERE Dispensing_ID = <ID>;

-- แล้วกดปุ่ม "จ่ายแล้ว" (mark-paid) ในหน้าเว็บค่าปรับ ระบบจะตั้ง Payment_date = วันนี้ให้เอง
-- (เทียบกับ Due_date ที่ตั้งไว้ในอดีต -> ช้า 4 วันพอดี)

-- (B) เช็คผลในหน้าค่าปรับ หรือ query ตรง:
SELECT Dispensing_ID, Due_date, Payment_date,
       DATEDIFF(DAY, Due_date, Payment_date) AS ช้ากี่วัน,
       200 * DATEDIFF(DAY, Due_date, Payment_date) * 0.05 AS ค่าปรับ
FROM Dispensing WHERE Dispensing_ID = <ID>;
```

### 3.6 Template: ทำให้คนไข้ขึ้น Blacklist (ค้างชำระเกิน 30 วัน)

```sql
-- (A) ทำให้มีรายการ "ค้างชำระ" เกิน 30 วัน (Payment_date = NULL + Due_date เลยมานาน)
UPDATE Dispensing
SET Payment_date = NULL, Due_date = DATEADD(DAY, -40, GETDATE()), Is_dispensed = 1
WHERE Dispensing_ID = <ID>;

-- แล้วกดปุ่ม "อัปเดตสถานะ Blacklist" ในหน้าเว็บ (หรือรัน EXEC ตรงๆ ก็ได้)
EXEC sp_Update_Blacklist;

-- (B) เช็คว่าคนไข้คนนั้นขึ้น Blacklist จริง
SELECT b.*, p.Name FROM Blacklist b JOIN Patient p ON b.Patient_ID = p.Patient_ID
WHERE b.Patient_ID = <PATIENT_ID>;

-- ===== ปลดแบน (สาธิตว่าจ่ายเงินแล้วหลุด Blacklist) =====
UPDATE Dispensing SET Payment_date = GETDATE() WHERE Dispensing_ID = <ID>;
EXEC sp_Update_Blacklist;
-- คนไข้คนนั้นต้องหายไปจากตาราง Blacklist (Is_active = 0)
```

### 3.7 Template: ทำให้ยา "ใกล้หมดอายุ" / "สต็อกต่ำ" (โชว์ในหน้าแจ้งเตือนคลังยา)

```sql
-- (A) ยาใกล้หมดอายุ (ภายใน 90 วัน)
UPDATE Medicine SET Expiry_Date = DATEADD(DAY, 30, GETDATE()) WHERE Medicine_ID = <ID>;

-- (A) ยาสต็อกต่ำกว่าจุดสั่งซื้อ
UPDATE Medicine SET Stock = 5, Reorder_Point = 50 WHERE Medicine_ID = <ID>;

-- (B) เช็คผล (ต้องไปโผล่ในหน้า "แจ้งเตือนคลังยา" ด้วย)
SELECT Name, Stock, Reorder_Point, Expiry_Date FROM Medicine WHERE Medicine_ID = <ID>;
```


```
ถ้าอยากล้างให้เหมือน "เริ่มนับหนึ่งใหม่" ทั้งระบบ

รันไฟล์เดิม 3 ไฟล์นี้ใหม่ตามลำดับ จะล้างข้อมูลทดสอบทั้งหมดกลับไปเป็นชุดข้อมูลตั้งต้นทันที (ตัว DELETE ต้นไฟล์แต่ละอันจะล้างของเก่าให้เองก่อนใส่ใหม่):

INSERT.sql
demo_data.sql

ไม่ต้องรัน update_v2.sql ซ้ำ เพราะแค่เพิ่มโครงสร้าง ไม่ได้ใส่ข้อมูล วิธีนี้เร็วและชัวร์กว่าไล่ UPDATE ทีละจุดเยอะ ถ้าไม่ติดใจว่าคนไข้ "ป" กับ "ปริศร" ที่เพิ่งสร้างจะหายไปด้วย (เพราะ INSERT.sql ลบ Patient ทั้งหมดแล้วใส่ใหม่แค่ 5 คนเดิม)
---

## 4. Run Web / Run Database

### 4.1 เตรียมฐานข้อมูล (ทำครั้งแรกครั้งเดียว หรือเมื่ออยากรีเซ็ตข้อมูล)

เปิดไฟล์ผ่าน Azure Data Studio / SSMS แล้ว Execute เรียงตามลำดับนี้ **ห้ามสลับ**:

1. `HospitalDB_KillerUNai.sql` — สร้างฐานข้อมูล + ตารางหลัก (รันครั้งแรกครั้งเดียวพอ ห้ามรันซ้ำ)
2. `update_v2.sql` — เพิ่มตาราง/คอลัมน์ใหม่ทั้งหมด (รันซ้ำได้ปลอดภัย)
3. `INSERT.sql` — ใส่ข้อมูลตัวอย่าง Patient/Doctor/Room/Medicine
4. `demo_data.sql` — ใส่ข้อมูลตัวอย่าง Appointment/Dispensing/Blacklist สำหรับสาธิต

ก่อน Execute แต่ละไฟล์ เช็ค dropdown บนแถบเครื่องมือว่าเลือก database เป็น **`HospitalDB`** แล้ว (ยกเว้นไฟล์แรกที่ยังไม่มีให้เลือก เพราะมันสร้างฐานข้อมูลเอง)

### 4.2 ตั้งค่าการเชื่อมต่อ

เปิด `hospital-backend/.env` แก้ให้ตรงกับเครื่องที่ใช้จริง:
```
DB_SERVER=localhost\<ชื่อ_instance_ของเครื่องคุณ>
DB_DATABASE=HospitalDB
DB_TRUSTED_CONNECTION=true
```
เช็คชื่อ instance ได้จาก Windows: `services.msc` → หา service ชื่อ `SQL Server (...)` ที่ status เป็น Running

### 4.3 รัน Backend

```bash
cd hospital-backend
npm install        # ครั้งแรกครั้งเดียว หรือหลัง pull โค้ดใหม่
npm run start:dev
```
รันสำเร็จจะเห็น backend ทำงานที่ `http://localhost:3000`
ทดสอบเร็วๆ ด้วยการเปิด `http://localhost:3000/patients` ใน browser ต้องเห็นข้อมูล JSON ออกมา

### 4.4 รัน Frontend (เปิด terminal ใหม่อีกอัน แยกจาก backend)

```bash
cd hospital-frontend
npm install         # ครั้งแรกครั้งเดียว หรือหลัง pull โค้ดใหม่
npm run dev
```
รันสำเร็จจะเห็น URL แบบ `http://localhost:5173` เปิดลิงก์นั้นใน browser

### 4.5 ลำดับเปิดใช้งานทุกครั้ง (หลังจากตั้งค่าเสร็จรอบแรกแล้ว)

1. เปิด SQL Server service ให้ทำงานอยู่ (ปกติเปิดเครื่องมาก็ auto start อยู่แล้ว)
2. Terminal ที่ 1: `cd hospital-backend && npm run start:dev`
3. Terminal ที่ 2: `cd hospital-frontend && npm run dev`
4. เปิด browser ไปที่ `http://localhost:5173`

---

## 5. รีเซ็ตข้อมูลกลับเป็นชุดตั้งต้น (ใช้ก่อน/หลังสาธิตให้อาจารย์ดู)

รัน 2 ไฟล์นี้ตามลำดับ (ตัว `DELETE` ต้นไฟล์แต่ละอันจะล้างของเก่าให้เองก่อนใส่ใหม่ ไม่ต้องรัน `update_v2.sql` ซ้ำเพราะมันแค่เพิ่มโครงสร้าง ไม่ได้ใส่ข้อมูล):

```sql
-- 1) รันทั้งไฟล์ INSERT.sql
-- 2) รันทั้งไฟล์ demo_data.sql
```

หลังรันเสร็จ ระบบจะกลับไปมีคนไข้/หมอ/ห้อง/ยาชุดตัวอย่างเดิม พร้อมนัดหมายและรายการยาสำหรับสาธิตครบ (มีทั้งเคสค้างชำระ, จ่ายตรงเวลา, รอจ่ายยา ให้ทดสอบต่อได้ทันที)
