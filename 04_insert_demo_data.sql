
USE HospitalDB;
GO

IF OBJECT_ID('Blacklist', 'U') IS NOT NULL DELETE FROM Blacklist;
DELETE FROM Dispensing;
DELETE FROM Appointment;
DBCC CHECKIDENT ('Appointment', RESEED, 0);
DBCC CHECKIDENT ('Dispensing', RESEED, 0);
IF OBJECT_ID('Blacklist', 'U') IS NOT NULL DBCC CHECKIDENT ('Blacklist', RESEED, 0);
GO

DECLARE @today DATE = CAST(GETDATE() AS DATE);

INSERT INTO Appointment (Doctor_ID, Patient_ID, Room_ID, Status, Date_and_Time, Symptom, Diagnosis) VALUES
(1, 1, 1, N'รอคิว',     DATEADD(HOUR,  9, CAST(@today AS DATETIME)),                     N'ใจสั่น เหนื่อยง่าย',   NULL),                       
(2, 2, 3, N'กำลังตรวจ', DATEADD(HOUR, 10, CAST(@today AS DATETIME)),                     N'ปวดหลังเรื้อรัง',      NULL),                       
(3, 3, 5, N'รอคิว',     DATEADD(HOUR, 14, CAST(@today AS DATETIME)),                     N'ปวดศีรษะบ่อย',        NULL),                       
(1, 4, 2, N'รอคิว',     DATEADD(HOUR, 16, CAST(@today AS DATETIME)),                     N'ไข้ ไอ 3 วัน',         NULL),                     
(3, 3, 5, N'เสร็จแล้ว', DATEADD(HOUR, 10, CAST(DATEADD(DAY,  -5, @today) AS DATETIME)),  N'ปวดท้อง แสบร้อนกลางอก', N'กรดไหลย้อน'),             
(2, 1, 1, N'เสร็จแล้ว', DATEADD(HOUR, 11, CAST(DATEADD(DAY, -10, @today) AS DATETIME)),  N'ปวดเมื่อยกล้ามเนื้อ',   N'กล้ามเนื้ออักเสบ'),       
(1, 5, 2, N'เสร็จแล้ว', DATEADD(HOUR, 13, CAST(DATEADD(DAY, -45, @today) AS DATETIME)),  N'ไข้หวัด',              N'ไข้หวัดธรรมดา'),        
(1, 5, 4, N'ยกเลิก',    DATEADD(HOUR, 14, CAST(DATEADD(DAY,  -8, @today) AS DATETIME)),  N'ตรวจสุขภาพประจำปี',    NULL),                   
(1, 2, 1, N'เสร็จแล้ว', DATEADD(HOUR,  9, CAST(DATEADD(DAY,  -3, @today) AS DATETIME)),  N'ผื่นคัน แพ้อากาศ',     N'โรคภูมิแพ้');             

INSERT INTO Dispensing (Appointment_ID, Medicine_ID, Order_quantity, Total_amount, Payment_date, Due_date, Is_dispensed, Dispensed_at) VALUES

(5, 2, 30, 0.00, DATEADD(DAY, -2, @today),  DATEADD(DAY, -5,  @today), 1, DATEADD(DAY, -5, GETDATE())),   
(5, 4, 28, 0.00, DATEADD(DAY, -1, @today),  DATEADD(DAY, -5,  @today), 1, DATEADD(DAY, -5, GETDATE())),  
(6, 1, 20, 0.00, DATEADD(DAY,-10, @today),  DATEADD(DAY,-10,  @today), 1, DATEADD(DAY,-10, GETDATE())),   

(7, 5, 20, 0.00, NULL,                      DATEADD(DAY,-40,  @today), 1, DATEADD(DAY,-45, GETDATE())),  

(9, 3, 30, 0.00, NULL,                      DATEADD(DAY,  7,  @today), 0, NULL),                         
(9, 1, 20, 0.00, NULL,                      DATEADD(DAY,  7,  @today), 0, NULL),                          
(6, 4, 14, 0.00, NULL,                      DATEADD(DAY,  7,  @today), 0, NULL),                         
(5, 4, 100, 0.00, NULL,                      DATEADD(DAY,  7,  @today), 0, NULL);                        
GO

UPDATE d
SET d.Total_amount = m.Unit_Price * d.Order_quantity
FROM Dispensing d
JOIN Medicine m ON d.Medicine_ID = m.Medicine_ID;
GO

UPDATE d
SET d.Patient_Pay_Amount =
    CASE WHEN d.Total_amount - ISNULL(it.Coverage_Limit, 0) > 0
         THEN d.Total_amount - ISNULL(it.Coverage_Limit, 0) ELSE 0 END
FROM Dispensing d
JOIN Appointment a ON d.Appointment_ID = a.Appointment_ID
JOIN Patient p ON a.Patient_ID = p.Patient_ID
LEFT JOIN Insurance_Type it ON p.Insurance_Type_ID = it.Insurance_Type_ID;
GO

IF OBJECT_ID('sp_Update_Blacklist', 'P') IS NOT NULL EXEC sp_Update_Blacklist;
GO

SELECT a.Appointment_ID, p.Name, a.Status, a.Date_and_Time, a.Symptom, a.Diagnosis
FROM Appointment a JOIN Patient p ON a.Patient_ID = p.Patient_ID ORDER BY a.Appointment_ID;
SELECT * FROM Dispensing;
SELECT * FROM Blacklist;
