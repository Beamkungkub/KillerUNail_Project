import { useEffect, useState } from 'react';

interface StockAlert {
  Medicine_ID: number;
  Name: string;
  Generic_Name: string | null;
  Type: string;
  Unit: string | null;
  Stock: number;
  Reorder_Point: number;
  Expiry_Date: string | null;
  Is_Expired: number;
  Is_Expiring_Soon: number;
  Is_Low_Stock: number;
}

function StockAlertPage() {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('http://localhost:3000/stock-alerts')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setAlerts(data))
      .catch(() => setError('โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>กำลังโหลด...</p>;

  const reasons = (a: StockAlert) => {
    const r: string[] = [];
    if (a.Is_Expired) r.push('หมดอายุแล้ว');
    else if (a.Is_Expiring_Soon) r.push('ใกล้หมดอายุ (ภายใน 90 วัน)');
    if (a.Is_Low_Stock) r.push('สต็อกต่ำกว่าจุดสั่งซื้อ');
    return r.join(', ');
  };

  return (
    <div className="page-content">
      <h1>แจ้งเตือนคลังยา</h1>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <div className="card">
        {alerts.length === 0 ? (
          <p style={{ padding: 16 }}>ไม่มียาที่ต้องแจ้งเตือน</p>
        ) : (
          <table border={1} cellPadding={8}>
            <thead>
              <tr>
                <th>รหัสยา</th>
                <th>ชื่อยา</th>
                <th>ชื่อสามัญ</th>
                <th>ประเภท</th>
                <th>คงเหลือ</th>
                <th>จุดสั่งซื้อ</th>
                <th>วันหมดอายุ</th>
                <th>แจ้งเตือน</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.Medicine_ID}>
                  <td>{a.Medicine_ID}</td>
                  <td>{a.Name}</td>
                  <td>{a.Generic_Name ?? '-'}</td>
                  <td>{a.Type}</td>
                  <td>
                    {a.Stock} {a.Unit ?? ''}
                  </td>
                  <td>{a.Reorder_Point}</td>
                  <td>
                    {a.Expiry_Date
                      ? new Date(a.Expiry_Date).toLocaleDateString('th-TH', { timeZone: 'UTC' })
                      : '-'}
                  </td>
                  <td style={{ color: a.Is_Expired ? 'crimson' : undefined }}>{reasons(a)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default StockAlertPage;
