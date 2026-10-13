import { useEffect, useState } from 'react';

interface Fine {
  Dispensing_ID: number;
  Patient_ID: number;
  Patient_Name: string;
  Medicine_Name: string;
  Total_amount: number | null;
  Insurance_Type_Name: string | null;
  Patient_Pay_Amount: number | null;
  Payment_date: string | null;
  Due_date: string | null;
  Is_Unpaid: boolean;
  Days_Late: number;
  Fine_Amount: number;
  Total_Fine_Per_Patient: number;
  Items_Per_Patient: number;
}

const money = (v: number | null | undefined) =>
  v === null || v === undefined
    ? '-'
    : Number(v).toLocaleString('th-TH', { minimumFractionDigits: 2 });

const dateOnly = (v: string | null) =>
  v ? new Date(v).toLocaleDateString('th-TH', { timeZone: 'UTC' }) : '-';

function FinesPage() {
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyLate, setOnlyLate] = useState(false);
  const [payMessage, setPayMessage] = useState('');

  const loadFines = () => {
    fetch('http://localhost:3000/late-fines')
      .then((res) => res.json())
      .then((data) => {
        setFines(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadFines();
  }, []);

  const markPaid = async (id: number) => {
    const res = await fetch(`http://localhost:3000/dispensing/${id}/mark-paid`, {
      method: 'POST',
    });
    const data = await res.json();
    setPayMessage(data.message || 'เกิดข้อผิดพลาด');
    if (res.ok) loadFines(); // โหลดใหม่จาก database ให้ยอดค่าปรับอัปเดตทันที
  };

  if (loading) return <p>กำลังโหลด...</p>;

  // สรุปยอดค่าปรับรวมต่อคนไข้ (คนไข้ที่มียามากกว่า 1 รายการคิดรวมกัน)
  const perPatient = Array.from(
    new Map(
      fines
        .filter((f) => f.Total_Fine_Per_Patient > 0)
        .map((f) => [f.Patient_ID, f] as const),
    ).values(),
  );
  const grandTotal = perPatient.reduce((sum, f) => sum + f.Total_Fine_Per_Patient, 0);

  const rows = onlyLate ? fines.filter((f) => f.Days_Late > 0) : fines;

  return (
    <div className="page-content">
      <h1>รายการค่าปรับจ่ายช้า</h1>
      <p style={{ color: '#12372a' }}>
        หน้านี้ใช้ดูว่าคนไข้คนไหนรับยาไปแล้วแต่ยังไม่มาชำระเงินตามกำหนด
        ระบบจะคิดค่าปรับให้อัตโนมัติวันละ 10 บาทต่อรายการยา (เริ่มคิดตั้งแต่วันที่เลยกำหนดชำระ)
        ถ้าคนไข้คนเดียวค้างหลายรายการ ระบบจะรวมยอดค่าปรับทั้งหมดให้เป็นก้อนเดียว
        พอคนไข้มาจ่ายเงินแล้ว กดปุ่ม "จ่ายแล้ว" ท้ายแถว ค่าปรับของรายการนั้นจะหยุดคิดทันที
      </p>
      {payMessage && <p style={{ color: '#12372a' }}>{payMessage}</p>}

      <div className="form-card">
        <h3>สรุปค่าปรับรวมต่อคนไข้</h3>
        {perPatient.length === 0 ? (
          <p>ไม่มีคนไข้ที่มีค่าปรับ</p>
        ) : (
          <>
            <ul>
              {perPatient.map((f) => (
                <li key={f.Patient_ID}>
                  {f.Patient_Name}: {money(f.Total_Fine_Per_Patient)} บาท
                </li>
              ))}
            </ul>
            <p>
              <b>รวมทั้งหมด: {money(grandTotal)} บาท</b>
            </p>
          </>
        )}
        <label>
          <input
            type="checkbox"
            checked={onlyLate}
            onChange={(e) => setOnlyLate(e.target.checked)}
          />{' '}
          แสดงเฉพาะรายการที่จ่ายช้า
        </label>
      </div>

      <div className="card">
        <table border={1} cellPadding={8}>
          <thead>
            <tr>
              <th>Dispensing ID</th>
              <th>ชื่อคนไข้</th>
              <th>สิทธิการรักษา</th>
              <th>ชื่อยา</th>
              <th>ราคายา (บาท)</th>
              <th>คนไข้จ่ายเอง (หลังหักสิทธิ)</th>
              <th>วันครบกำหนด</th>
              <th>วันที่จ่าย</th>
              <th>ช้ากี่วัน</th>
              <th>ค่าปรับ (บาท)</th>
              <th>รวมค่าปรับทั้งหมดของคนไข้คนนี้</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((fine) => (
              <tr key={fine.Dispensing_ID}>
                <td>{fine.Dispensing_ID}</td>
                <td>{fine.Patient_Name}</td>
                <td>{fine.Insurance_Type_Name ?? '-'}</td>
                <td>{fine.Medicine_Name}</td>
                <td>{money(fine.Total_amount)}</td>
                <td>{money(fine.Patient_Pay_Amount)}</td>
                <td>{dateOnly(fine.Due_date)}</td>
                <td>{dateOnly(fine.Payment_date)}</td>
                <td>{fine.Days_Late}</td>
                <td>{money(fine.Fine_Amount)}</td>
                <td>{money(fine.Total_Fine_Per_Patient)}</td>
                <td>
                  {fine.Is_Unpaid ? (
                    <button onClick={() => markPaid(fine.Dispensing_ID)}>
                      ✅ กดว่าจ่ายแล้ว
                    </button>
                  ) : (
                    <span style={{ color: '#2e7d32' }}>ชำระแล้ว</span>
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

export default FinesPage;
