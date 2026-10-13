import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Injectable()
export class AppService {
  constructor(private databaseService: DatabaseService) {}

  // ===================================================
  // 1. แสดงคิวคนไข้วันนี้
  // ===================================================
  async getTodayQueue() {
    await this.autoUpdatePastAppointments();
    const pool = this.databaseService.getPool();
    const result = await pool.request().query(`
      SELECT 
        a.Appointment_ID,
        p.Name AS Patient_Name,
        d.Name AS Doctor_Name,
        r.Room_number,
        a.Status,
        a.Date_and_Time,
        a.Symptom,
        a.Diagnosis
      FROM Appointment a
      JOIN Patient p ON a.Patient_ID = p.Patient_ID
      JOIN Doctor d ON a.Doctor_ID = d.Doctor_ID
      JOIN Room r ON a.Room_ID = r.Room_ID
      ORDER BY a.Date_and_Time;
    `);
    return result.recordset;
  }

  // ===================================================
  // 2. แสดงรายการยาที่รอจ่าย (เฉพาะที่ยังไม่จ่าย พร้อมราคา)
  // ===================================================
  async getPendingDispensing() {
    await this.autoUpdatePastAppointments();
    const pool = this.databaseService.getPool();
    const result = await pool.request().query(`
      SELECT 
        disp.Dispensing_ID,
        p.Name AS Patient_Name,
        m.Name AS Medicine_Name,
        m.Type AS Medicine_Type,
        disp.Order_quantity,
        m.Unit_Price,
        disp.Total_amount,
        it.Name AS Insurance_Type_Name,
        CASE 
          WHEN disp.Total_amount - ISNULL(it.Coverage_Limit, 0) > 0 
          THEN disp.Total_amount - ISNULL(it.Coverage_Limit, 0)
          ELSE 0
        END AS Patient_Pay_Amount,
        m.Stock AS Current_Stock,
        m.Reorder_Point,
        m.Expiry_Date
      FROM Dispensing disp
      JOIN Appointment a ON disp.Appointment_ID = a.Appointment_ID
      JOIN Patient p ON a.Patient_ID = p.Patient_ID
      JOIN Medicine m ON disp.Medicine_ID = m.Medicine_ID
      LEFT JOIN Insurance_Type it ON p.Insurance_Type_ID = it.Insurance_Type_ID
      WHERE disp.Is_dispensed = 0
      ORDER BY disp.Dispensing_ID;
    `);
    return result.recordset;
  }

  // ===================================================
  // 3. จ่ายยา (ตัดสต็อก + ทำเครื่องหมายว่าจ่ายแล้ว กันกดซ้ำ/สต็อกติดลบ)
  // ===================================================
  async dispenseMedicine(dispensingId: number) {
    const pool = this.databaseService.getPool();

    // เช็คเงื่อนไขก่อน เพื่อแจ้งสาเหตุที่จ่ายไม่ได้ให้ชัดเจน
    const check = await pool.request()
      .input('dispensingId', dispensingId)
      .query(`
        SELECT d.Is_dispensed, d.Order_quantity, m.Stock, m.Expiry_Date,
               CASE WHEN m.Expiry_Date IS NOT NULL
                     AND m.Expiry_Date < CAST(GETDATE() AS DATE)
                    THEN 1 ELSE 0 END AS Is_expired
        FROM Dispensing d
        JOIN Medicine m ON d.Medicine_ID = m.Medicine_ID
        WHERE d.Dispensing_ID = @dispensingId;
      `);
    const row = check.recordset[0];
    if (!row) throw new BadRequestException('ไม่พบรายการจ่ายยา ID นี้');
    if (row.Is_dispensed) throw new BadRequestException('รายการนี้จ่ายยาไปแล้ว');
    if (row.Is_expired) throw new BadRequestException('ยาหมดอายุแล้ว ไม่สามารถจ่ายได้');
    if (row.Stock < row.Order_quantity) {
      throw new BadRequestException(
        `สต็อกไม่พอ (คงเหลือ ${row.Stock} ต้องการ ${row.Order_quantity})`,
      );
    }

    // ตัดสต็อก + ทำเครื่องหมายจ่ายแล้ว + คำนวณยอดที่คนไข้ต้องจ่ายเอง (หักวงเงินสิทธิ)
    const result = await pool.request()
      .input('dispensingId', dispensingId)
      .query(`
        SET XACT_ABORT ON;
        BEGIN TRAN;
        UPDATE m
        SET m.Stock = m.Stock - d.Order_quantity
        FROM Medicine m
        JOIN Dispensing d ON d.Medicine_ID = m.Medicine_ID
        WHERE d.Dispensing_ID = @dispensingId
          AND d.Is_dispensed = 0
          AND m.Stock >= d.Order_quantity;

        IF @@ROWCOUNT = 0
        BEGIN
          ROLLBACK;
          SELECT 0 AS ok, CAST(NULL AS DECIMAL(10,2)) AS Patient_Pay_Amount;
          RETURN;
        END

        UPDATE d
        SET d.Is_dispensed = 1,
            d.Dispensed_at = GETDATE(),
            d.Patient_Pay_Amount =
              CASE
                WHEN d.Total_amount - ISNULL(it.Coverage_Limit, 0) > 0
                THEN d.Total_amount - ISNULL(it.Coverage_Limit, 0)
                ELSE 0
              END
        FROM Dispensing d
        JOIN Appointment a ON d.Appointment_ID = a.Appointment_ID
        JOIN Patient p ON a.Patient_ID = p.Patient_ID
        LEFT JOIN Insurance_Type it ON p.Insurance_Type_ID = it.Insurance_Type_ID
        WHERE d.Dispensing_ID = @dispensingId;
        COMMIT;

        SELECT 1 AS ok, Patient_Pay_Amount
        FROM Dispensing WHERE Dispensing_ID = @dispensingId;
      `);

    if (!result.recordset[0]?.ok) {
      throw new BadRequestException('จ่ายยาไม่สำเร็จ (จ่ายไปแล้ว หรือสต็อกไม่พอ)');
    }
    return {
      message: 'จ่ายยาเรียบร้อยแล้ว',
      patientPayAmount: result.recordset[0].Patient_Pay_Amount,
    };
  }

  // ===================================================
  // 4. ประวัติการจ่ายยา (สำหรับ popup)
  // ===================================================
  async getDispensingHistory() {
    const pool = this.databaseService.getPool();
    const result = await pool.request().query(`
      SELECT 
        disp.Dispensing_ID,
        p.Name AS Patient_Name,
        m.Name AS Medicine_Name,
        m.Type AS Medicine_Type,
        disp.Order_quantity,
        disp.Total_amount,
        disp.Patient_Pay_Amount,
        it.Name AS Insurance_Type_Name,
        disp.Dispensed_at
      FROM Dispensing disp
      JOIN Appointment a ON disp.Appointment_ID = a.Appointment_ID
      JOIN Patient p ON a.Patient_ID = p.Patient_ID
      JOIN Medicine m ON disp.Medicine_ID = m.Medicine_ID
      LEFT JOIN Insurance_Type it ON p.Insurance_Type_ID = it.Insurance_Type_ID
      WHERE disp.Is_dispensed = 1
      ORDER BY disp.Dispensed_at DESC;
    `);
    return result.recordset;
  }

  // ===================================================
  // 5. คำนวณค่าปรับจ่ายช้า
  //    สูตรตามโน้ต: 200 x จำนวนวันที่จ่ายช้าเกินกำหนด x 5%
  //    คนไข้ที่มียามากกว่า 1 รายการ -> รวมค่าปรับทุกรายการเป็นยอดรวมของคนไข้
  //    (ปรับฐาน/อัตราได้ที่ค่าคงที่ 2 ตัวด้านล่าง)
  // ===================================================
  private readonly LATE_FEE_BASE = 200;
  private readonly LATE_FEE_RATE = 0.05;

  async getLateFines() {
    const pool = this.databaseService.getPool();
    const result = await pool
      .request()
      .input('base', this.LATE_FEE_BASE)
      .input('rate', this.LATE_FEE_RATE)
      .query(`
      SELECT 
        disp.Dispensing_ID,
        p.Patient_ID,
        p.Name AS Patient_Name,
        m.Name AS Medicine_Name,
        disp.Total_amount,
        it.Name AS Insurance_Type_Name,
        disp.Patient_Pay_Amount,
        disp.Payment_date,
        disp.Due_date,
        CAST(CASE WHEN disp.Payment_date IS NULL THEN 1 ELSE 0 END AS BIT) AS Is_Unpaid,
        -- นับวันช้าถึงวันนี้ ถ้ายังไม่จ่าย, หรือถึงวันที่จ่ายจริง ถ้าจ่ายแล้ว
        CASE
          WHEN disp.Payment_date IS NULL AND GETDATE() > disp.Due_date
            THEN DATEDIFF(DAY, disp.Due_date, GETDATE())
          WHEN disp.Payment_date IS NOT NULL AND disp.Payment_date > disp.Due_date
            THEN DATEDIFF(DAY, disp.Due_date, disp.Payment_date)
          ELSE 0
        END AS Days_Late,
        CASE
          WHEN disp.Payment_date IS NULL AND GETDATE() > disp.Due_date
            THEN @base * DATEDIFF(DAY, disp.Due_date, GETDATE()) * @rate
          WHEN disp.Payment_date IS NOT NULL AND disp.Payment_date > disp.Due_date
            THEN @base * DATEDIFF(DAY, disp.Due_date, disp.Payment_date) * @rate
          ELSE 0
        END AS Fine_Amount,
        SUM(
          CASE
            WHEN disp.Payment_date IS NULL AND GETDATE() > disp.Due_date
              THEN @base * DATEDIFF(DAY, disp.Due_date, GETDATE()) * @rate
            WHEN disp.Payment_date IS NOT NULL AND disp.Payment_date > disp.Due_date
              THEN @base * DATEDIFF(DAY, disp.Due_date, disp.Payment_date) * @rate
            ELSE 0
          END
        ) OVER (PARTITION BY p.Patient_ID) AS Total_Fine_Per_Patient,
        COUNT(*) OVER (PARTITION BY p.Patient_ID) AS Items_Per_Patient
      FROM Dispensing disp
      JOIN Appointment a ON disp.Appointment_ID = a.Appointment_ID
      JOIN Patient p ON a.Patient_ID = p.Patient_ID
      JOIN Medicine m ON disp.Medicine_ID = m.Medicine_ID
      LEFT JOIN Insurance_Type it ON p.Insurance_Type_ID = it.Insurance_Type_ID
      WHERE disp.Is_dispensed = 1
      ORDER BY p.Name, disp.Dispensing_ID;
    `);
    return result.recordset;
  }

  // ===================================================
  // 5.5 บันทึกว่าคนไข้จ่ายเงิน (ปิดค่าปรับรายการนั้น)
  // ===================================================
  async markDispensingPaid(dispensingId: number) {
    const pool = this.databaseService.getPool();
    const result = await pool
      .request()
      .input('id', dispensingId)
      .query(`
        UPDATE Dispensing
        SET Payment_date = CAST(GETDATE() AS DATE)
        WHERE Dispensing_ID = @id AND Is_dispensed = 1 AND Payment_date IS NULL;
        SELECT @@ROWCOUNT AS affected;
      `);
    if (result.recordset[0].affected === 0) {
      throw new BadRequestException('บันทึกไม่สำเร็จ (รายการนี้จ่ายเงินไปแล้ว หรือยังไม่ได้จ่ายยา)');
    }
    return { message: 'บันทึกการชำระเงินสำเร็จแล้ว' };
  }

  // ===================================================
  // 6. แสดงรายชื่อคนไข้ที่ติด Blacklist ในปัจจุบัน
  // ===================================================
  async getBlacklist() {
    const pool = this.databaseService.getPool();
    const result = await pool.request().query(`
      SELECT 
        b.Blacklist_ID,
        p.Patient_ID,
        p.Name AS Patient_Name,
        b.Total_overdue_amount,
        b.Blacklisted_date
      FROM Blacklist b
      JOIN Patient p ON b.Patient_ID = p.Patient_ID
      WHERE b.Is_active = 1;
    `);
    return result.recordset;
  }

  // ===================================================
  // 7. สั่งรันอัปเดตสถานะ Blacklist ล่าสุด (รัน Stored Procedure)
  // ===================================================
  async triggerUpdateBlacklist() {
    const pool = this.databaseService.getPool();
    await pool.request().query(`EXEC sp_Update_Blacklist;`);
    return { message: 'อัปเดตข้อมูล Blacklist เรียบร้อยแล้ว (เพิ่มคนค้างชำระเกิน 30 วัน / ปลดแบนคนที่จ่ายแล้ว)' };
  }

  // ===================================================
  // 8. ดึงรายชื่อคนไข้ (สำหรับ dropdown)
  // ===================================================
  async getPatients() {
    const pool = this.databaseService.getPool();
    const result = await pool.request().query(`
      SELECT
        p.Patient_ID,
        p.Name,
        p.CID,
        p.Gender,
        p.Blood_Type,
        p.Allergy,
        p.Emergency_Contact,
        it.Name AS Insurance_Type_Name,
        it.Coverage_Limit
      FROM Patient p
      LEFT JOIN Insurance_Type it ON p.Insurance_Type_ID = it.Insurance_Type_ID
      ORDER BY p.Name;
    `);
    return result.recordset;
  }

  // ===================================================
  // 8.1 ดึงรายการสิทธิการรักษา (สำหรับ dropdown ตอนลงทะเบียน/แก้ไขคนไข้)
  // ===================================================
  async getInsuranceTypes() {
    const pool = this.databaseService.getPool();
    const result = await pool.request().query(`
      SELECT Insurance_Type_ID, Name, Coverage_Limit FROM Insurance_Type ORDER BY Insurance_Type_ID;
    `);
    return result.recordset;
  }

  // ===================================================
  // 9. ดึงรายชื่อหมอ (สำหรับ dropdown)
  // ===================================================
  async getDoctors() {
    const pool = this.databaseService.getPool();
    const result = await pool.request().query(`
      SELECT Doctor_ID, Name, department FROM Doctor WHERE Status = N'ปฏิบัติงาน' ORDER BY Name;
    `);
    return result.recordset;
  }

  // ===================================================
  // 10. ดึงรายชื่อห้อง (สำหรับ dropdown)
  // ===================================================
  async getRooms() {
    const pool = this.databaseService.getPool();
    const result = await pool.request().query(`
      SELECT Room_ID, Room_number, Type FROM Room WHERE Status = N'ว่าง' ORDER BY Room_number;
    `);
    return result.recordset;
  }

  // ===================================================
  // 11. สร้างการจองคิวใหม่ (Appointment) + เช็คสถานะหมอ/ห้องซ้ำฝั่ง backend
  // ===================================================
  async createAppointment(
    patientId: number,
    doctorId: number,
    roomId: number,
    dateTime: string,
    symptom?: string,
  ) {
    const pool = this.databaseService.getPool();

    const check = await pool
      .request()
      .input('doctorId', doctorId)
      .input('roomId', roomId)
      .query(`
        SELECT
          (SELECT Status FROM Doctor WHERE Doctor_ID = @doctorId) AS Doctor_Status,
          (SELECT Status FROM Room WHERE Room_ID = @roomId) AS Room_Status;
      `);
    const { Doctor_Status, Room_Status } = check.recordset[0];
    if (Doctor_Status === null || Doctor_Status === undefined) {
      throw new BadRequestException('ไม่พบแพทย์ที่เลือก');
    }
    if (Room_Status === null || Room_Status === undefined) {
      throw new BadRequestException('ไม่พบห้องที่เลือก');
    }
    if (Doctor_Status !== 'ปฏิบัติงาน') {
      throw new BadRequestException(`แพทย์ท่านนี้ไม่พร้อมรับนัด (สถานะ: ${Doctor_Status})`);
    }
    if (Room_Status !== 'ว่าง') {
      throw new BadRequestException(`ห้องนี้ไม่พร้อมใช้งาน (สถานะ: ${Room_Status})`);
    }

    await pool
      .request()
      .input('patientId', patientId)
      .input('doctorId', doctorId)
      .input('roomId', roomId)
      .input('dateTime', dateTime)
      .input('symptom', symptom?.trim() ? symptom.trim() : null)
      .query(`
        INSERT INTO Appointment (Patient_ID, Doctor_ID, Room_ID, Status, Date_and_Time, Symptom)
        VALUES (@patientId, @doctorId, @roomId, N'รอคิว', @dateTime, @symptom);
      `);
    return { message: 'จองคิวสำเร็จแล้ว' };
  }

  // ===================================================
  // 11.5 สร้างคนไข้ใหม่ (ใช้ตอนกดจองคิวแล้วไม่เจอชื่อในลิสต์)
  // ===================================================
  async createPatient(data: {
    name: string;
    numberPhone?: string;
    address?: string;
    dateOfBirth?: string;
    caseHistory?: string;
    cid?: string;
    insuranceTypeId?: number;
    gender?: string;
    bloodType?: string;
    allergy?: string;
    emergencyContact?: string;
  }) {
    if (!data.name?.trim()) {
      throw new BadRequestException('กรุณากรอกชื่อคนไข้');
    }
    const pool = this.databaseService.getPool();
    const result = await pool
      .request()
      .input('name', data.name.trim())
      .input('numberPhone', data.numberPhone?.trim() || null)
      .input('address', data.address?.trim() || null)
      .input('dateOfBirth', data.dateOfBirth || null)
      .input('caseHistory', data.caseHistory?.trim() || null)
      .input('cid', data.cid?.trim() || null)
      .input('insuranceTypeId', data.insuranceTypeId || null)
      .input('gender', data.gender?.trim() || null)
      .input('bloodType', data.bloodType?.trim() || null)
      .input('allergy', data.allergy?.trim() || null)
      .input('emergencyContact', data.emergencyContact?.trim() || null)
      .query(`
        INSERT INTO Patient
          (Name, Number_Phone, address, Date_of_Birth, Case_History,
           CID, Insurance_Type_ID, Gender, Blood_Type, Allergy, Emergency_Contact)
        OUTPUT INSERTED.Patient_ID
        VALUES
          (@name, @numberPhone, @address, @dateOfBirth, @caseHistory,
           @cid, @insuranceTypeId, @gender, @bloodType, @allergy, @emergencyContact);
      `);
    return {
      message: 'เพิ่มคนไข้ใหม่สำเร็จแล้ว',
      patientId: result.recordset[0].Patient_ID,
    };
  }

  // ===================================================
  // 11.1 บันทึกผลวินิจฉัย (แพทย์เติมหลังตรวจเสร็จ)
  // ===================================================
  async updateDiagnosis(appointmentId: number, diagnosis: string) {
    const pool = this.databaseService.getPool();
    const result = await pool
      .request()
      .input('appointmentId', appointmentId)
      .input('diagnosis', diagnosis?.trim() ? diagnosis.trim() : null)
      .query(`
        UPDATE Appointment SET Diagnosis = @diagnosis
        WHERE Appointment_ID = @appointmentId;
        SELECT @@ROWCOUNT AS affected;
      `);
    if (!result.recordset[0]?.affected) {
      throw new BadRequestException('ไม่พบนัดหมายนี้');
    }
    return { message: 'บันทึกผลวินิจฉัยเรียบร้อยแล้ว' };
  }

  // ===================================================
  // 12. ดึงประวัติคนไข้ (ข้อมูลพื้นฐาน + ประวัตินัด + ประวัติยา)
  // ===================================================
  async getPatientHistory(patientId: number) {
    await this.autoUpdatePastAppointments();
    const pool = this.databaseService.getPool();

    // ข้อมูลพื้นฐานของคนไข้
    const patientInfo = await pool
      .request()
      .input('patientId', patientId)
      .query(`
        SELECT p.*, it.Name AS Insurance_Type_Name, it.Coverage_Limit
        FROM Patient p
        LEFT JOIN Insurance_Type it ON p.Insurance_Type_ID = it.Insurance_Type_ID
        WHERE p.Patient_ID = @patientId;
      `);

    // ประวัติการนัดหมาย
    const appointments = await pool
      .request()
      .input('patientId', patientId)
      .query(`
        SELECT 
          a.Appointment_ID,
          d.Name AS Doctor_Name,
          r.Room_number,
          a.Status,
          a.Date_and_Time,
          a.Symptom,
          a.Diagnosis
        FROM Appointment a
        JOIN Doctor d ON a.Doctor_ID = d.Doctor_ID
        JOIN Room r ON a.Room_ID = r.Room_ID
        WHERE a.Patient_ID = @patientId
        ORDER BY a.Date_and_Time DESC;
      `);

    // ประวัติการรับยา
    const medications = await pool
      .request()
      .input('patientId', patientId)
      .query(`
        SELECT 
          disp.Dispensing_ID,
          m.Name AS Medicine_Name,
          m.Type AS Medicine_Type,
          disp.Order_quantity,
          disp.Total_amount,
          disp.Patient_Pay_Amount,
          disp.Is_dispensed,
          disp.Dispensed_at,
          disp.Payment_date,
          disp.Due_date
        FROM Dispensing disp
        JOIN Appointment a ON disp.Appointment_ID = a.Appointment_ID
        JOIN Medicine m ON disp.Medicine_ID = m.Medicine_ID
        WHERE a.Patient_ID = @patientId
        ORDER BY disp.Payment_date DESC;
      `);

    return {
      patient: patientInfo.recordset[0],
      appointments: appointments.recordset,
      medications: medications.recordset,
    };
  }

  // ===================================================
  // 12.1 แจ้งเตือนคลังยาทั้งหมด: หมดอายุ / ใกล้หมดอายุ (90 วัน) / สต็อกต่ำกว่าจุดสั่งซื้อ
  // ===================================================
  async getStockAlerts() {
    const pool = this.databaseService.getPool();
    const result = await pool.request().query(`
      SELECT
        Medicine_ID, Name, Generic_Name, Type, Unit, Stock, Reorder_Point, Expiry_Date,
        CASE WHEN Expiry_Date IS NOT NULL AND Expiry_Date < CAST(GETDATE() AS DATE)
             THEN 1 ELSE 0 END AS Is_Expired,
        CASE WHEN Expiry_Date IS NOT NULL
              AND Expiry_Date >= CAST(GETDATE() AS DATE)
              AND Expiry_Date <= DATEADD(DAY, 90, CAST(GETDATE() AS DATE))
             THEN 1 ELSE 0 END AS Is_Expiring_Soon,
        CASE WHEN Reorder_Point > 0 AND Stock <= Reorder_Point
             THEN 1 ELSE 0 END AS Is_Low_Stock
      FROM Medicine
      WHERE (Expiry_Date IS NOT NULL AND Expiry_Date <= DATEADD(DAY, 90, CAST(GETDATE() AS DATE)))
         OR (Reorder_Point > 0 AND Stock <= Reorder_Point)
      ORDER BY Is_Expired DESC, Expiry_Date, Stock;
    `);
    return result.recordset;
  }

  // ===================================================
  // 13.ฟังก์ชันช่วย: อัปเดตสถานะนัดหมายที่เวลาผ่านไปแล้วอัตโนมัติ
  // ===================================================
  private async autoUpdatePastAppointments() {
    const pool = this.databaseService.getPool();
    await pool.request().query(`
      UPDATE Appointment
      SET Status = N'เสร็จแล้ว'
      WHERE Date_and_Time < GETDATE()
      AND Status IN (N'รอคิว', N'กำลังตรวจ');
    `);
  }  
}