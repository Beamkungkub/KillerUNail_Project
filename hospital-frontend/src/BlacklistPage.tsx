import { useEffect, useState } from 'react';

interface BlacklistItem {
  Blacklist_ID: number;
  Patient_ID: number;
  Patient_Name: string;
  Total_overdue_amount: number;
  Blacklisted_date: string;
}

interface InsuranceType {
  Insurance_Type_ID: number;
  Name: string;
  Coverage_Limit: number;
}

const money = (v: number) =>
  Number(v).toLocaleString('th-TH', { minimumFractionDigits: 2 });

function BlacklistPage() {
  const [blacklist, setBlacklist] = useState<BlacklistItem[]>([]);
  const [insurance, setInsurance] = useState<InsuranceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadAll = async () => {
    try {
      const [bRes, iRes] = await Promise.all([
        fetch('http://localhost:3000/blacklist'),
        fetch('http://localhost:3000/insurance-types'),
      ]);
      if (!bRes.ok || !iRes.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ');
      setBlacklist(await bRes.json());
      setInsurance(await iRes.json());
      setError('');
    } catch {
      setError('โหลดข้อมูลไม่สำเร็จ (เช็คว่ารัน update_v2.sql แล้วและ backend ทำงานอยู่)');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleUpdate = async () => {
    setUpdating(true);
    setMessage('');
    try {
      const res = await fetch('http://localhost:3000/blacklist/update', { method: 'POST' });
      const data = await res.json();
      setMessage(res.ok ? data.message : data.message || 'อัปเดตไม่สำเร็จ');
      await loadAll();
    } catch {
      setMessage('อัปเดตไม่สำเร็จ');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <p>กำลังโหลด...</p>;

  return (
    <div className="page-content">
      <h1>Blacklist คนไข้ค้างชำระ</h1>

      <div className="form-card">
        <p>
          ระบบจะเพิ่มคนไข้ที่ค้างชำระเกินกำหนด 30 วันเข้า Blacklist และปลดแบนคนที่ชำระครบแล้ว
          (ต้องกดปุ่มด้านล่างเพื่ออัปเดตข้อมูลล่าสุด)
        </p>
        <button onClick={handleUpdate} disabled={updating}>
          {updating ? 'กำลังอัปเดต...' : 'อัปเดตสถานะ Blacklist'}
        </button>
        {message && <p>{message}</p>}
      </div>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <h3 style={{ color: '#12372a', marginTop: 24 }}>รายชื่อที่ติด Blacklist ตอนนี้</h3>
      <div className="card">
        {blacklist.length === 0 ? (
          <p style={{ padding: 16 }}>ไม่มีคนไข้ที่ติด Blacklist</p>
        ) : (
          <table border={1} cellPadding={8}>
            <thead>
              <tr>
                <th>รหัสคนไข้</th>
                <th>ชื่อคนไข้</th>
                <th>ยอดค้างชำระรวม (บาท)</th>
                <th>วันที่ถูกขึ้น Blacklist</th>
              </tr>
            </thead>
            <tbody>
              {blacklist.map((b) => (
                <tr key={b.Blacklist_ID}>
                  <td>{b.Patient_ID}</td>
                  <td>{b.Patient_Name}</td>
                  <td>{money(b.Total_overdue_amount)}</td>
                  <td>{new Date(b.Blacklisted_date).toLocaleString('th-TH')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h3 style={{ color: '#12372a', marginTop: 24 }}>สิทธิการรักษาและวงเงินคุ้มครอง</h3>
      <div className="card">
        <table border={1} cellPadding={8}>
          <thead>
            <tr>
              <th>รหัส</th>
              <th>สิทธิการรักษา</th>
              <th>วงเงินคุ้มครอง (บาท)</th>
            </tr>
          </thead>
          <tbody>
            {insurance.map((i) => (
              <tr key={i.Insurance_Type_ID}>
                <td>{i.Insurance_Type_ID}</td>
                <td>{i.Name}</td>
                <td>{money(i.Coverage_Limit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BlacklistPage;
