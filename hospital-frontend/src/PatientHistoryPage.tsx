import { useEffect, useState } from 'react';

interface PatientOption {
  Patient_ID: number;
  Name: string;
}

interface Patient {
  Patient_ID: number;
  Name: string;
  Number_Phone: string;
  address: string;
  Date_of_Birth: string;
  Case_History: string;
  CID: string | null;
  Gender: string | null;
  Blood_Type: string | null;
  Allergy: string | null;
  Emergency_Contact: string | null;
  Insurance_Type_Name: string | null;
  Coverage_Limit: number | null;
}

interface AppointmentHistory {
  Appointment_ID: number;
  Doctor_Name: string;
  Room_number: string;
  Status: string;
  Date_and_Time: string;
  Symptom: string | null;
  Diagnosis: string | null;
}

interface MedicationHistory {
  Dispensing_ID: number;
  Medicine_Name: string;
  Medicine_Type: string;
  Order_quantity: number;
  Total_amount: number | null;
  Patient_Pay_Amount: number | null;
  Is_dispensed: boolean;
  Dispensed_at: string | null;
  Payment_date: string | null;
  Due_date: string | null;
}

const dash = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === '' ? '-' : v;

const dateOnly = (v: string | null) =>
  v ? new Date(v).toLocaleDateString('th-TH', { timeZone: 'UTC' }) : '-';

const money = (v: number | null) =>
  v === null || v === undefined
    ? '-'
    : Number(v).toLocaleString('th-TH', { minimumFractionDigits: 2 });

function PatientHistoryPage() {
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientInfo, setPatientInfo] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<AppointmentHistory[]>([]);
  const [medications, setMedications] = useState<MedicationHistory[]>([]);

  useEffect(() => {
    fetch('http://localhost:3000/patients')
      .then((res) => res.json())
      .then(setPatients);
  }, []);

  const handleSelectPatient = async (id: string) => {
    setSelectedPatientId(id);
    if (!id) {
      setPatientInfo(null);
      setAppointments([]);
      setMedications([]);
      return;
    }

    const res = await fetch(`http://localhost:3000/patient-history/${id}`);
    const data = await res.json();
    setPatientInfo(data.patient);
    setAppointments(data.appointments);
    setMedications(data.medications);
  };

  return (
    <div className="page-content">
      <h1>ประวัติคนไข้</h1>

      <div className="form-card">
        <p>เลือกคนไข้:</p>
        <select
          value={selectedPatientId}
          onChange={(e) => handleSelectPatient(e.target.value)}
        >
          <option value="">-- เลือกคนไข้ --</option>
          {patients.map((p) => (
            <option key={p.Patient_ID} value={p.Patient_ID}>
              {p.Name}
            </option>
          ))}
        </select>
      </div>

      {patientInfo && (
        <>
          <div className="card" style={{ padding: 20, marginTop: 20 }}>
            <h3>ข้อมูลพื้นฐาน</h3>
            <p>ชื่อ: {patientInfo.Name}</p>
            <p>เลขบัตรประชาชน: {dash(patientInfo.CID)}</p>
            <p>เพศ: {dash(patientInfo.Gender)}</p>
            <p>กรุ๊ปเลือด: {dash(patientInfo.Blood_Type)}</p>
            <p>เบอร์โทร: {patientInfo.Number_Phone}</p>
            <p>เบอร์ติดต่อฉุกเฉิน: {dash(patientInfo.Emergency_Contact)}</p>
            <p>ที่อยู่: {patientInfo.address}</p>
            <p>วันเกิด: {dateOnly(patientInfo.Date_of_Birth)}</p>
            <p>
              สิทธิการรักษา: {dash(patientInfo.Insurance_Type_Name)}
              {patientInfo.Coverage_Limit !== null &&
                patientInfo.Coverage_Limit !== undefined &&
                ` (วงเงินคุ้มครอง ${money(patientInfo.Coverage_Limit)} บาท)`}
            </p>
            <p>ประวัติแพ้ยา: {dash(patientInfo.Allergy)}</p>
            <p>ประวัติการป่วย: {patientInfo.Case_History}</p>
          </div>

          <h3 style={{ color: '#12372a', marginTop: 24 }}>ประวัติการนัดหมาย</h3>
          <div className="card">
            <table border={1} cellPadding={8}>
              <thead>
                <tr>
                  <th>Appointment ID</th>
                  <th>หมอ</th>
                  <th>ห้อง</th>
                  <th>สถานะ</th>
                  <th>วันเวลานัด</th>
                  <th>อาการ</th>
                  <th>ผลวินิจฉัย</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.Appointment_ID}>
                    <td>{a.Appointment_ID}</td>
                    <td>{a.Doctor_Name}</td>
                    <td>{a.Room_number}</td>
                    <td>{a.Status}</td>
                    <td>
                      {new Date(a.Date_and_Time).toLocaleString('th-TH', {
                        timeZone: 'UTC',
                      })}
                    </td>
                    <td>{dash(a.Symptom)}</td>
                    <td>{dash(a.Diagnosis)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ color: '#12372a', marginTop: 24 }}>ประวัติการรับยา</h3>
          <div className="card">
            <table border={1} cellPadding={8}>
              <thead>
                <tr>
                  <th>Dispensing ID</th>
                  <th>ชื่อยา</th>
                  <th>ประเภทยา</th>
                  <th>จำนวน</th>
                  <th>ราคา</th>
                  <th>คนไข้จ่ายเอง</th>
                  <th>สถานะการจ่ายยา</th>
                  <th>วันครบกำหนด</th>
                  <th>วันที่ชำระ</th>
                </tr>
              </thead>
              <tbody>
                {medications.map((m) => (
                  <tr key={m.Dispensing_ID}>
                    <td>{m.Dispensing_ID}</td>
                    <td>{m.Medicine_Name}</td>
                    <td>{m.Medicine_Type}</td>
                    <td>{m.Order_quantity}</td>
                    <td>{money(m.Total_amount)}</td>
                    <td>{money(m.Patient_Pay_Amount)}</td>
                    <td>
                      {m.Is_dispensed
                        ? `จ่ายแล้ว (${
                            m.Dispensed_at
                              ? new Date(m.Dispensed_at).toLocaleString('th-TH')
                              : '-'
                          })`
                        : 'รอจ่ายยา'}
                    </td>
                    <td>{dateOnly(m.Due_date)}</td>
                    <td>{dateOnly(m.Payment_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default PatientHistoryPage;
