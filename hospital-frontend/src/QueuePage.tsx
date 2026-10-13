import { useEffect, useState } from 'react';

interface Appointment {
  Appointment_ID: number;
  Patient_Name: string;
  Doctor_Name: string;
  Room_number: string;
  Status: string;
  Date_and_Time: string;
  Symptom: string | null;
  Diagnosis: string | null;
}

function QueuePage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [message, setMessage] = useState('');

  const loadQueue = () => {
    fetch('http://localhost:3000/queue-today')
      .then((res) => res.json())
      .then((data) => {
        setAppointments(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const saveDiagnosis = async (id: number) => {
    const res = await fetch(`http://localhost:3000/appointment/${id}/diagnosis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagnosis: drafts[id] ?? '' }),
    });
    const data = await res.json();
    setMessage(data.message || 'เกิดข้อผิดพลาด');
    if (res.ok) {
      setDrafts((d) => {
        const next = { ...d };
        delete next[id];
        return next;
      });
      loadQueue();
    }
  };

  if (loading) return <p>กำลังโหลด...</p>;

  return (
    <div className="page-content">
      <h1>คิวคนไข้วันนี้</h1>
      {message && <p>{message}</p>}
      <div className="card">
        <table border={1} cellPadding={8}>
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ชื่อคนไข้</th>
              <th>หมอ</th>
              <th>ห้อง</th>
              <th>สถานะ</th>
              <th>เวลานัด</th>
              <th>อาการ</th>
              <th>ผลวินิจฉัย</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appt, index) => (
              <tr key={appt.Appointment_ID}>
                <td>{index + 1}</td>
                <td>{appt.Patient_Name}</td>
                <td>{appt.Doctor_Name}</td>
                <td>{appt.Room_number}</td>
                <td>{appt.Status}</td>
                <td>
                  {new Date(appt.Date_and_Time).toLocaleString('th-TH', {
                    timeZone: 'UTC',
                  })}
                </td>
                <td>{appt.Symptom ?? '-'}</td>
                <td>
                  {appt.Diagnosis && drafts[appt.Appointment_ID] === undefined ? (
                    // บันทึกผลไปแล้ว: โชว์เป็นข้อความอย่างเดียว ไม่ต้องมีช่องกรอกค้างไว้
                    <>
                      {appt.Diagnosis}{' '}
                      <button onClick={() => setDrafts((d) => ({ ...d, [appt.Appointment_ID]: appt.Diagnosis ?? '' }))}>
                        แก้ไข
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={drafts[appt.Appointment_ID] ?? appt.Diagnosis ?? ''}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [appt.Appointment_ID]: e.target.value }))
                        }
                        placeholder="ใส่ผลวินิจฉัย"
                        maxLength={255}
                      />{' '}
                      <button
                        disabled={drafts[appt.Appointment_ID] === undefined}
                        onClick={() => saveDiagnosis(appt.Appointment_ID)}
                      >
                        บันทึก
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default QueuePage;
