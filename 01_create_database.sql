/* =====================================================================
   01_create_database.sql  —  ไฟล์ที่ 1/4: สร้างฐานข้อมูล + ตารางหลัก
   ลำดับรันทั้งชุด:
     1) HospitalDB_KillerUNai.sql   (ไฟล์นี้ — สร้างโครงตาราง)
     2) update_v2.sql               (เพิ่มคอลัมน์/ตาราง/procedure ที่ระบบใช้)
     3) INSERT.sql                  (ข้อมูลหลัก: คนไข้ หมอ ห้อง ยา)
     4) demo_data.sql               (ข้อมูลทดสอบ: นัดหมาย จ่ายยา Blacklist)
   ทุกไฟล์รันซ้ำได้ ไม่ error (ไฟล์นี้ถ้ามีตารางอยู่แล้วจะข้าม ไม่ลบข้อมูลเดิม)
   ===================================================================== */

IF DB_ID(N'HospitalDB') IS NULL
    CREATE DATABASE HospitalDB;
GO

USE HospitalDB;
GO

-- 1. Patient (ไม่มี FK)
IF OBJECT_ID(N'Patient', N'U') IS NULL
    CREATE TABLE Patient (
        Patient_ID INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        Number_Phone VARCHAR(15),
        address NVARCHAR(255),
        Date_of_Birth DATE,
        Case_History NVARCHAR(MAX)
    );
GO

-- 2. Doctor (ไม่มี FK)
IF OBJECT_ID(N'Doctor', N'U') IS NULL
    CREATE TABLE Doctor (
        Doctor_ID INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        department NVARCHAR(100),
        Expertise NVARCHAR(100)
    );
GO

-- 3. Room (ไม่มี FK)  
IF OBJECT_ID(N'Room', N'U') IS NULL
    CREATE TABLE Room (
        Room_ID INT IDENTITY(1,1) PRIMARY KEY,
        Room_number VARCHAR(10) NOT NULL,
        Room_floor INT,
        building NVARCHAR(50),
        Type NVARCHAR(50),
        Capacity INT
    );
GO

-- 4. Medicine (ไม่มี FK)
IF OBJECT_ID(N'Medicine', N'U') IS NULL
    CREATE TABLE Medicine (
        Medicine_ID INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        Type NVARCHAR(50),
        Stock INT NOT NULL DEFAULT 0
    );
GO

-- 5. Appointment (มี FK ไปหา Patient, Doctor, Room)
IF OBJECT_ID(N'Appointment', N'U') IS NULL
    CREATE TABLE Appointment (
        Appointment_ID INT IDENTITY(1,1) PRIMARY KEY,
        Doctor_ID INT NOT NULL,
        Patient_ID INT NOT NULL,
        Room_ID INT NOT NULL,
        Status NVARCHAR(20) NOT NULL,
        Date_and_Time DATETIME NOT NULL,
        FOREIGN KEY (Doctor_ID) REFERENCES Doctor(Doctor_ID),
        FOREIGN KEY (Patient_ID) REFERENCES Patient(Patient_ID),
        FOREIGN KEY (Room_ID) REFERENCES Room(Room_ID)
    );
GO

-- 6. Dispensing (มี FK ไปหา Appointment, Medicine)
IF OBJECT_ID(N'Dispensing', N'U') IS NULL
    CREATE TABLE Dispensing (
        Dispensing_ID INT IDENTITY(1,1) PRIMARY KEY,
        Appointment_ID INT NOT NULL,
        Medicine_ID INT NOT NULL,
        Order_quantity INT NOT NULL,
        Total_amount DECIMAL(10,2) NOT NULL,
        Payment_date DATE,
        Due_date DATE,
        FOREIGN KEY (Appointment_ID) REFERENCES Appointment(Appointment_ID),
        FOREIGN KEY (Medicine_ID) REFERENCES Medicine(Medicine_ID)
    );
GO
