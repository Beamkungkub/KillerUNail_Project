import { useEffect, useState } from 'react';
import ThaiDateInput from './ThaiDateInput';
import ThaiDateTimeInput from './ThaiDateTimeInput';

interface Patient {
  Patient_ID: number;
  Name: string;
}

interface Doctor {
  Doctor_ID: number;
  Name: string;
  department: string;
}

interface Room {
  Room_ID: number;
  Room_number: string;
  Type: string;
}

interface InsuranceType {
  Insurance_Type_ID: number;
  Name: string;
}

const emptyNewPatient = {
  name: '',
  numberPhone: '',
  address: '',
  dateOfBirth: '',
  cid: '',
  insuranceTypeId: '',
  gender: '',
  bloodType: '',
  allergy: '',
  emergencyContact: '',
  caseHistory: '',
};

function BookingPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [insuranceTypes, setInsuranceTypes] = useState<InsuranceType[]>([]);

  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [symptom, setSymptom] = useState('');
  const [message, setMessage] = useState('');

  const [newPatient, setNewPatient] = useState(emptyNewPatient);
  const [newPatientMessage, setNewPatientMessage] = useState('');

  const loadPatients = () => {
    fetch('http://localhost:3000/patients')
      .then((res) => res.json())
      .then(setPatients);
  };

  useEffect(() => {
    loadPatients();

    fetch('http://localhost:3000/doctors')
      .then((res) => res.json())
      .then(setDoctors);

    fetch('http://localhost:3000/rooms')
      .then((res) => res.json())
      .then(setRooms);

    fetch('http://localhost:3000/insurance-types')
      .then((res) => res.json())
      .then(setInsuranceTypes);
  }, []);

  const handleCreatePatient = async () => {
    if (!newPatient.name.trim()) {
      setNewPatientMessage('กรุณากรอกชื่อคนไข้');
      return;
    }
    const response = await fetch('http://localhost:3000/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newPatient.name,
        numberPhone: newPatient.numberPhone,
        address: newPatient.address,
        dateOfBirth: newPatient.dateOfBirth || null,
        cid: newPatient.cid,
        insuranceTypeId: newPatient.insuranceTypeId
          ? Number(newPatient.insuranceTypeId)
          : null,
        gender: newPatient.gender,
        bloodType: newPatient.bloodType,
        allergy: newPatient.allergy,
        emergencyContact: newPatient.emergencyContact,
        caseHistory: newPatient.caseHistory,
      }),
    });
    const data = await response.json();
    setNewPatientMessage(data.message || 'เกิดข้อผิดพลาด');
    if (response.ok) {
      loadPatients(); // ดึงรายชื่อใหม่จาก database (ข้อมูลถูกบันทึกลง SQL แล้วจริงๆ)
      setSelectedPatient(String(data.patientId)); // เลือกคนไข้ที่เพิ่งเพิ่มให้อัตโนมัติ
      setNewPatient(emptyNewPatient);
    }
  };

  const handleBooking = async () => {
    if (!selectedPatient || !selectedDoctor || !selectedRoom || !dateTime) {
      setMessage('กรุณาเลือกข้อมูลให้ครบทุกช่อง');
      return;
    }

    const response = await fetch('http://localhost:3000/book-appointment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: Number(selectedPatient),
        doctorId: Number(selectedDoctor),
        roomId: Number(selectedRoom),
        dateTime, // มาจาก ThaiDateTimeInput แล้ว เป็น 'YYYY-MM-DD HH:MM' (ค.ศ.) พร้อมส่งเลย
        symptom,
      }),
    });
    const data = await response.json();
    setMessage(data.message || 'เกิดข้อผิดพลาด');
    if (response.ok) setSymptom('');
  };

  return (
    <div className="page-content">
      <h1>จองคิว</h1>
      <div className="form-card">
        <p>เลือกคนไข้:</p>
        <select
          value={selectedPatient}
          onChange={(e) => setSelectedPatient(e.target.value)}
        >
          <option value="">-- เลือกคนไข้ --</option>
          {patients.map((p) => (
            <option key={p.Patient_ID} value={p.Patient_ID}>
              {p.Name}
            </option>
          ))}
        </select>

        <div
          style={{
            border: '1px solid #ccc',
            borderRadius: 8,
            padding: 12,
            marginTop: 12,
          }}
        >
          <p style={{ fontWeight: 'bold', margin: 0 }}>เพิ่มคนไข้ใหม่ (ถ้ายังไม่มีชื่อในลิสต์ด้านบน)</p>
          <p>ชื่อ-นามสกุล *</p>
            <input
              type="text"
              value={newPatient.name}
              onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
              placeholder="ชื่อ นามสกุล"
              style={{ width: '100%' }}
            />

            <p>เบอร์โทร</p>
            <input
              type="text"
              value={newPatient.numberPhone}
              onChange={(e) =>
                setNewPatient({ ...newPatient, numberPhone: e.target.value })
              }
              style={{ width: '100%' }}
            />

            <p>ที่อยู่</p>
            <input
              type="text"
              value={newPatient.address}
              onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
              style={{ width: '100%' }}
            />

            <p>วันเกิด (พ.ศ.)</p>
            <ThaiDateInput
              value={newPatient.dateOfBirth}
              onChange={(iso) => setNewPatient({ ...newPatient, dateOfBirth: iso })}
              yearRangeBack={100}
              yearRangeForward={0}
            />

            <p>เลขบัตรประชาชน (13 หลัก)</p>
            <input
              type="text"
              maxLength={13}
              value={newPatient.cid}
              onChange={(e) => setNewPatient({ ...newPatient, cid: e.target.value })}
            />

            <p>สิทธิการรักษา</p>
            <select
              value={newPatient.insuranceTypeId}
              onChange={(e) =>
                setNewPatient({ ...newPatient, insuranceTypeId: e.target.value })
              }
            >
              <option value="">-- ไม่ระบุ --</option>
              {insuranceTypes.map((it) => (
                <option key={it.Insurance_Type_ID} value={it.Insurance_Type_ID}>
                  {it.Name}
                </option>
              ))}
            </select>

            <p>เพศ</p>
            <select
              value={newPatient.gender}
              onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
            >
              <option value="">-- ไม่ระบุ --</option>
              <option value="ชาย">ชาย</option>
              <option value="หญิง">หญิง</option>
              <option value="อื่นๆ">อื่นๆ</option>
            </select>

            <p>กรุ๊ปเลือด</p>
            <select
              value={newPatient.bloodType}
              onChange={(e) =>
                setNewPatient({ ...newPatient, bloodType: e.target.value })
              }
            >
              <option value="">-- ไม่ระบุ --</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="AB">AB</option>
              <option value="O">O</option>
            </select>

            <p>ประวัติแพ้ยา</p>
            <input
              type="text"
              value={newPatient.allergy}
              onChange={(e) => setNewPatient({ ...newPatient, allergy: e.target.value })}
              placeholder="ไม่มี"
              style={{ width: '100%' }}
            />

            <p>เบอร์ติดต่อฉุกเฉิน</p>
            <input
              type="text"
              value={newPatient.emergencyContact}
              onChange={(e) =>
                setNewPatient({ ...newPatient, emergencyContact: e.target.value })
              }
            />

            <p>ประวัติการป่วย / โรคประจำตัว</p>
            <textarea
              value={newPatient.caseHistory}
              onChange={(e) =>
                setNewPatient({ ...newPatient, caseHistory: e.target.value })
              }
              rows={2}
              style={{ width: '100%' }}
            />

          <br />
          <button type="button" onClick={handleCreatePatient}>
            บันทึกคนไข้ใหม่
          </button>
          {newPatientMessage && <p>{newPatientMessage}</p>}
        </div>

        <p>เลือกหมอ:</p>
        <select
          value={selectedDoctor}
          onChange={(e) => setSelectedDoctor(e.target.value)}
        >
          <option value="">-- เลือกหมอ --</option>
          {doctors.map((d) => (
            <option key={d.Doctor_ID} value={d.Doctor_ID}>
              {d.Name} ({d.department})
            </option>
          ))}
        </select>

        <p>เลือกห้อง:</p>
        <select
          value={selectedRoom}
          onChange={(e) => setSelectedRoom(e.target.value)}
        >
          <option value="">-- เลือกห้อง --</option>
          {rooms.map((r) => (
            <option key={r.Room_ID} value={r.Room_ID}>
              {r.Room_number} ({r.Type})
            </option>
          ))}
        </select>

        <p>เลือกวันเวลานัด (พ.ศ.):</p>
        <ThaiDateTimeInput value={dateTime} onChange={setDateTime} />

        <p>อาการ / เหตุผลที่มาพบแพทย์:</p>
        <textarea
          value={symptom}
          onChange={(e) => setSymptom(e.target.value)}
          placeholder="เช่น ปวดหัว มีไข้ 2 วัน"
          rows={3}
          maxLength={255}
          style={{ width: '100%' }}
        />

        <br />
        <br />
        <button onClick={handleBooking}>ยืนยันจองคิว</button>
        {message && <p>{message}</p>}
      </div>
    </div>
  );
}

export default BookingPage;
