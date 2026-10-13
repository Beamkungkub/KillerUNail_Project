/* =====================================================================
   update_v2.sql  (เวอร์ชันรันซ้ำได้ปลอดภัย)
   - ต่อเติมจาก HospitalDB_KillerUNai.sql (ไม่ลบ/ไม่รื้อของเดิม)
   - ทุกคำสั่งเช็คก่อนว่ามีอยู่แล้วหรือยัง รันกี่รอบก็ไม่ error และไม่ทำข้อมูลซ้ำ
   ไฟล์ที่ 2/4  ลำดับรัน: HospitalDB_KillerUNai.sql -> update_v2.sql -> INSERT.sql -> demo_data.sql
   ===================================================================== */

USE HospitalDB;
GO

IF OBJECT_ID('Insurance_Type', 'U') IS NULL
    CREATE TABLE Insurance_Type (
        Insurance_Type_ID INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(50) NOT NULL,
        Coverage_Limit DECIMAL(10,2) NOT NULL DEFAULT 0
    );
GO

IF NOT EXISTS (SELECT 1 FROM Insurance_Type)
    INSERT INTO Insurance_Type (Name, Coverage_Limit) VALUES
    (N'บัตรทอง (สปสช.)', 500.00),
    (N'ประกันสังคม',      800.00),
    (N'ข้าราชการ',        1500.00),
    (N'ชำระเงินเอง',      0.00);


IF OBJECT_ID('tempdb..#dup_insurance_map') IS NOT NULL DROP TABLE #dup_insurance_map;
SELECT it.Insurance_Type_ID AS Old_ID, keep.Keep_ID
INTO #dup_insurance_map
FROM Insurance_Type it
JOIN (
    SELECT Name, MIN(Insurance_Type_ID) AS Keep_ID
    FROM Insurance_Type
    GROUP BY Name
) keep ON it.Name = keep.Name
WHERE it.Insurance_Type_ID <> keep.Keep_ID;

UPDATE p
SET p.Insurance_Type_ID = m.Keep_ID
FROM Patient p
JOIN #dup_insurance_map m ON p.Insurance_Type_ID = m.Old_ID;

DELETE it
FROM Insurance_Type it
JOIN #dup_insurance_map m ON it.Insurance_Type_ID = m.Old_ID;

DROP TABLE #dup_insurance_map;
GO

GO

/* ---------- 2. Patient ---------- */
IF COL_LENGTH('Patient', 'CID')               IS NULL ALTER TABLE Patient ADD CID VARCHAR(13) NULL;
IF COL_LENGTH('Patient', 'Insurance_Type_ID') IS NULL ALTER TABLE Patient ADD Insurance_Type_ID INT NULL;
IF COL_LENGTH('Patient', 'Gender')            IS NULL ALTER TABLE Patient ADD Gender NVARCHAR(10) NULL;
IF COL_LENGTH('Patient', 'Blood_Type')        IS NULL ALTER TABLE Patient ADD Blood_Type NVARCHAR(5) NULL;
IF COL_LENGTH('Patient', 'Allergy')           IS NULL ALTER TABLE Patient ADD Allergy NVARCHAR(255) NULL;
IF COL_LENGTH('Patient', 'Emergency_Contact') IS NULL ALTER TABLE Patient ADD Emergency_Contact VARCHAR(15) NULL;
GO

IF OBJECT_ID('FK_Patient_InsuranceType', 'F') IS NULL
    ALTER TABLE Patient
    ADD CONSTRAINT FK_Patient_InsuranceType
    FOREIGN KEY (Insurance_Type_ID) REFERENCES Insurance_Type(Insurance_Type_ID);
GO

-- คนไข้ที่ยังไม่ระบุสิทธิ -> ตั้งเป็น "ชำระเงินเอง" (ID 4) กันค่า NULL
UPDATE Patient SET Insurance_Type_ID = 4 WHERE Insurance_Type_ID IS NULL;
GO

/* ---------- 3. Medicine ---------- */
IF COL_LENGTH('Medicine', 'Generic_Name')  IS NULL ALTER TABLE Medicine ADD Generic_Name NVARCHAR(100) NULL;
IF COL_LENGTH('Medicine', 'Unit_Price')    IS NULL ALTER TABLE Medicine ADD Unit_Price DECIMAL(10,2) NOT NULL DEFAULT 0;
IF COL_LENGTH('Medicine', 'Unit')          IS NULL ALTER TABLE Medicine ADD Unit NVARCHAR(20) NULL;
IF COL_LENGTH('Medicine', 'Expiry_Date')   IS NULL ALTER TABLE Medicine ADD Expiry_Date DATE NULL;
IF COL_LENGTH('Medicine', 'Reorder_Point') IS NULL ALTER TABLE Medicine ADD Reorder_Point INT NOT NULL DEFAULT 0;
GO

/* ---------- 4. Dispensing ---------- */
-- Is_dispensed / Dispensed_at: backend หน้าจ่ายยาใช้สองคอลัมน์นี้ (เดิมอยู่ในไฟล์สคริปต์ชั่วคราว)
IF COL_LENGTH('Dispensing', 'Is_dispensed')        IS NULL ALTER TABLE Dispensing ADD Is_dispensed BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('Dispensing', 'Dispensed_at')        IS NULL ALTER TABLE Dispensing ADD Dispensed_at DATETIME NULL;
IF COL_LENGTH('Dispensing', 'Patient_Pay_Amount')  IS NULL ALTER TABLE Dispensing ADD Patient_Pay_Amount DECIMAL(10,2) NULL;
GO

-- คำนวณยอดที่คนไข้ต้องจ่ายเอง (ราคา - วงเงินสิทธิ, ไม่ต่ำกว่า 0) ให้แถวที่ยังไม่มีค่า
UPDATE d
SET d.Patient_Pay_Amount =
    CASE
        WHEN d.Total_amount - ISNULL(it.Coverage_Limit, 0) > 0
        THEN d.Total_amount - ISNULL(it.Coverage_Limit, 0)
        ELSE 0
    END
FROM Dispensing d
JOIN Appointment a ON d.Appointment_ID = a.Appointment_ID
JOIN Patient p ON a.Patient_ID = p.Patient_ID
LEFT JOIN Insurance_Type it ON p.Insurance_Type_ID = it.Insurance_Type_ID
WHERE d.Patient_Pay_Amount IS NULL;
GO

/* ---------- 5. Doctor ---------- */
IF COL_LENGTH('Doctor', 'Number_Phone') IS NULL ALTER TABLE Doctor ADD Number_Phone VARCHAR(15) NULL;
IF COL_LENGTH('Doctor', 'License_No')   IS NULL ALTER TABLE Doctor ADD License_No NVARCHAR(20) NULL;
IF COL_LENGTH('Doctor', 'Status')       IS NULL ALTER TABLE Doctor ADD Status NVARCHAR(20) NOT NULL DEFAULT N'ปฏิบัติงาน';
GO

-- เลขใบ ว. มีตัวอักษรไทย ต้องเป็น NVARCHAR (ถ้าเป็น VARCHAR ตัว ว. จะกลายเป็น ?)
ALTER TABLE Doctor ALTER COLUMN License_No NVARCHAR(20) NULL;
GO

/* ---------- 6. Room ---------- */
IF COL_LENGTH('Room', 'Type')            IS NULL ALTER TABLE Room ADD Type NVARCHAR(50) NULL;   -- เผื่อ DB ที่สร้างจากไฟล์ 1 เวอร์ชันเก่า
IF COL_LENGTH('Room', 'Capacity')        IS NULL ALTER TABLE Room ADD Capacity INT NULL;
IF COL_LENGTH('Room', 'Status')          IS NULL ALTER TABLE Room ADD Status NVARCHAR(20) NOT NULL DEFAULT N'ว่าง';
IF COL_LENGTH('Room', 'Price_per_night') IS NULL ALTER TABLE Room ADD Price_per_night DECIMAL(10,2) NULL;
GO

/* ---------- 7. Appointment ---------- */
IF COL_LENGTH('Appointment', 'Symptom')   IS NULL ALTER TABLE Appointment ADD Symptom NVARCHAR(255) NULL;
IF COL_LENGTH('Appointment', 'Diagnosis') IS NULL ALTER TABLE Appointment ADD Diagnosis NVARCHAR(255) NULL;
GO

/* ---------- 8. Blacklist ---------- */
IF OBJECT_ID('Blacklist', 'U') IS NULL
    CREATE TABLE Blacklist (
        Blacklist_ID INT IDENTITY(1,1) PRIMARY KEY,
        Patient_ID INT NOT NULL,
        Total_overdue_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        Blacklisted_date DATETIME NOT NULL DEFAULT GETDATE(),
        Is_active BIT NOT NULL DEFAULT 1,
        FOREIGN KEY (Patient_ID) REFERENCES Patient(Patient_ID)
    );
GO

/* ---------- sp_Update_Blacklist ----------
   กติกา "ค้างชำระ" (ตัดสินจากยอดที่คนไข้ต้องจ่ายเองจริงหลังหักสิทธิแล้ว):
     - จ่ายยาไปแล้ว (Is_dispensed = 1)   -> ยังไม่จ่ายยาไม่ถือว่าเป็นหนี้
     - ยังไม่ชำระ (Payment_date เป็น NULL)
     - เลยกำหนด (Due_date) มากกว่า @OverdueDays วัน (ค่าเริ่มต้น 30)
     - ยอดที่ต้องจ่ายเอง (Patient_Pay_Amount) มากกว่า 0  -> คนที่สิทธิคุ้มครองเต็มจำนวนจะไม่ถูกแบน
       (ถ้าแถวไหนยังไม่มี Patient_Pay_Amount จะใช้ Total_amount แทน)
   สิ่งที่ procedure ทำทุกครั้งที่เรียก:
     1) เพิ่มคนไข้ที่เข้าเงื่อนไขและยังไม่อยู่ใน Blacklist (active) เข้า Blacklist
     2) ปรับยอดค้างของคนที่ยังอยู่ใน Blacklist ให้เป็นยอดล่าสุด
     3) ปลดแบน (Is_active = 0) คนที่ไม่มีรายการค้างเข้าเงื่อนไขแล้ว
   เรียกใช้: EXEC sp_Update_Blacklist;   หรือ   EXEC sp_Update_Blacklist @OverdueDays = 45; */
CREATE OR ALTER PROCEDURE sp_Update_Blacklist
    @OverdueDays INT = 30
AS
BEGIN
    SET NOCOUNT ON;

    IF OBJECT_ID('tempdb..#Overdue') IS NOT NULL DROP TABLE #Overdue;

    SELECT a.Patient_ID,
           SUM(ISNULL(d.Patient_Pay_Amount, d.Total_amount)) AS Amount
    INTO #Overdue
    FROM Dispensing d
    JOIN Appointment a ON d.Appointment_ID = a.Appointment_ID
    WHERE d.Is_dispensed = 1
      AND d.Payment_date IS NULL
      AND DATEDIFF(DAY, d.Due_date, GETDATE()) > @OverdueDays
      AND ISNULL(d.Patient_Pay_Amount, d.Total_amount) > 0
    GROUP BY a.Patient_ID;

    -- 1) เพิ่มเข้า Blacklist
    INSERT INTO Blacklist (Patient_ID, Total_overdue_amount, Blacklisted_date, Is_active)
    SELECT o.Patient_ID, o.Amount, GETDATE(), 1
    FROM #Overdue o
    WHERE NOT EXISTS (
        SELECT 1 FROM Blacklist b
        WHERE b.Patient_ID = o.Patient_ID AND b.Is_active = 1
    );

    -- 2) อัปเดตยอดค้างล่าสุดของคนที่ยังอยู่ใน Blacklist
    UPDATE b
    SET b.Total_overdue_amount = o.Amount
    FROM Blacklist b
    JOIN #Overdue o ON o.Patient_ID = b.Patient_ID
    WHERE b.Is_active = 1
      AND b.Total_overdue_amount <> o.Amount;

    -- 3) ปลดแบนคนที่ไม่มีรายการค้างเข้าเงื่อนไขแล้ว
    UPDATE b
    SET b.Is_active = 0
    FROM Blacklist b
    WHERE b.Is_active = 1
      AND NOT EXISTS (SELECT 1 FROM #Overdue o WHERE o.Patient_ID = b.Patient_ID);

    DROP TABLE #Overdue;
END
GO

/* ---------- เช็คผลลัพธ์ ---------- */
SELECT * FROM Insurance_Type;
SELECT Patient_ID, Name, CID, Insurance_Type_ID FROM Patient;
