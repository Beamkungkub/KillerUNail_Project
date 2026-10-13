USE HospitalDB;
GO

IF OBJECT_ID('Blacklist','U') IS NOT NULL DELETE FROM Blacklist; 
DELETE FROM Dispensing;
DELETE FROM Appointment;
DELETE FROM Patient;
DELETE FROM Doctor;
DELETE FROM Room;
DELETE FROM Medicine;
GO

DBCC CHECKIDENT ('Patient', RESEED, 0);
DBCC CHECKIDENT ('Doctor', RESEED, 0);
DBCC CHECKIDENT ('Room', RESEED, 0);
DBCC CHECKIDENT ('Medicine', RESEED, 0);
DBCC CHECKIDENT ('Appointment', RESEED, 0);
DBCC CHECKIDENT ('Dispensing', RESEED, 0);
IF OBJECT_ID('Blacklist','U') IS NOT NULL DBCC CHECKIDENT ('Blacklist', RESEED, 0);
GO

INSERT INTO Patient (Name, Number_Phone, address, Date_of_Birth, Case_History, CID, Insurance_Type_ID, Gender, Blood_Type, Allergy, Emergency_Contact) VALUES
(N'ลูมิน เซเลสเชียล' , '0842365897', N'กรุงเทพฯ'  , '2006-09-28', N'ไม่มี'  , '1849302761548', 2, N'หญิง', N'O' , N'ไม่มี', '0873491285'),
(N'ปีเตอร์ พาร์คเกอร์', '0928501146', N'สมุทรปราการ', '2009-12-14', N'ไม่มี'  , '3021958473610', 4, N'ชาย' , N'A' , N'ไม่มี', '0918823047'),
(N'ชญานนท์ วงษ์'  , '0812356890', N'ชลบุรี'     , '2000-01-04', N'ไม่มี'  , '5637291840572', 1, N'ชาย' , N'B' , N'ไม่มี', '0654290187'),
(N'คริส สนามแดง'  , '0964419256', N'เชียงใหม่'  , '1994-03-15', N'เบาหวาน', '2749183056291', 3, N'ชาย' , N'AB', N'ไม่มี', '0837105629'),
(N'วิเลี่ยม อาร์มตอน' , '0895155210', N'สงขลา'   , '1987-11-17', N'ความดัน', '4903827165042', 4, N'ชาย' , N'O' , N'เพนิซิลลิน', '0761948520');
GO

INSERT INTO Doctor (Name, department, Expertise, Number_Phone, License_No, Status) VALUES
(N'ซากุระ ฮากุระ'  , N'อายุรกรรม'   , N'โรคหัวใจ'           , '0891112221', N'ว.11234', N'ปฏิบัติงาน'),
(N'คุจิกิ ลูเคีย'  , N'อายุรกรรม'   , N'กระดูกและข้อ'       , '0891112222', N'ว.11235', N'ปฏิบัติงาน'),
(N'ไมเคิล คาร์ริก' , N'ศัลยกรรม'    , N'ศัลยแพทย์ระบบประสาท', '0891112223', N'ว.11236', N'ปฏิบัติงาน'),
(N'วินนี่ เดอะพูห์', N'กุมารเวชกรรม', N'รักษาโรคในเด็ก'     , '0891112224', N'ว.11237', N'ลา');
GO

INSERT INTO Room (Room_number, Room_floor, building, Type, Capacity, Status, Price_per_night) VALUES
('2010', 2, 1, N'ห้องรวม'   , 20, N'ว่าง',         500.00),
('2026', 2, 1, N'ห้องรวม'   , 20, N'ว่าง',         500.00),
('3001', 3, 1, N'ห้องพิเศษ' , 2 , N'ไม่ว่าง',       1500.00),
('3005', 3, 1, N'ห้องพิเศษ' , 2 , N'ว่าง',         1500.00),
('4100', 4, 2, N'ห้อง ICU'  , 10, N'ว่าง',        3000.00),
('5300', 5, 2, N'ห้องผ่าตัด', 8 , N'ปิดปรับปรุง',    5000.00);
GO

INSERT INTO Medicine (Name, Type, Stock, Generic_Name, Unit_Price, Unit, Expiry_Date, Reorder_Point) VALUES
(N'พาราเซตามอล' ,   N'ยาแก้ปวดลดไข้',       500, N'Paracetamol', 2.00, N'เม็ด'  , '2027-06-30', 50),
(N'อะม็อกซิลลิน',      N'ยาปฏิชีวนะ',          300, N'Amoxicillin', 5.00, N'แคปซูล', '2027-03-31', 40),
(N'เซทิริซีน',          N'ยาแก้แพ้',           200, N'Cetirizine' , 3.00, N'เม็ด'  , '2027-08-31', 30),
(N'โอเมพราโซล',     N'ยาลดกรดในกระเพาะ',    150, N'Omeprazole' , 6.00, N'แคปซูล', '2027-01-31', 20),
(N'ไอบูโพรเฟน',      N'ยาแก้ปวดลดอักเสบ',     250, N'Ibuprofen'  , 4.00, N'เม็ด'  , '2027-05-31', 30);
GO

SELECT * FROM Patient;
SELECT * FROM Doctor;
SELECT * FROM Room;
SELECT * FROM Medicine;