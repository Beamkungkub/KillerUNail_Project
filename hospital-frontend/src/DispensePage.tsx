import { useEffect, useState } from 'react';

interface PendingItem {
  Dispensing_ID: number;
  Patient_Name: string;
  Medicine_Name: string;
  Medicine_Type: string;
  Order_quantity: number;
  Unit_Price: number | null;
  Total_amount: number | null;
  Insurance_Type_Name: string | null;
  Patient_Pay_Amount: number | null;
  Current_Stock: number;
  Reorder_Point: number | null;
  Expiry_Date: string | null;
}

interface HistoryItem {
  Dispensing_ID: number;
  Patient_Name: string;
  Medicine_Name: string;
  Medicine_Type: string;
  Order_quantity: number;
  Total_amount: number | null;
  Patient_Pay_Amount: number | null;
  Insurance_Type_Name: string | null;
  Dispensed_at: string | null;
}

const money = (v: number | null | undefined) =>
  v === null || v === undefined ? '-' : Number(v).toLocaleString('th-TH', { minimumFractionDigits: 2 });

const dateText = (v: string | null) =>
  v ? new Date(v).toLocaleDateString('th-TH') : '-';

const dateTimeText = (v: string | null) =>
  v ? new Date(v).toLocaleString('th-TH') : '-';

function DispensePage() {
  const [dispensingId, setDispensingId] = useState('');
  const [message, setMessage] = useState('');
  const [pendingList, setPendingList] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadPendingList = () => {
    fetch('http://localhost:3000/pending-dispensing')
      .then((res) => res.json())
      .then((data) => {
        setPendingList(data);
        setLoading(false);
      });
  };

  const loadHistory = () => {
    setHistoryLoading(true);
    fetch('http://localhost:3000/dispensing-history')
      .then((res) => res.json())
      .then((data) => {
        setHistoryList(data);
        setHistoryLoading(false);
      });
  };

  useEffect(() => {
    loadPendingList();
  }, []);

  const openHistory = () => {
    setShowHistory(true);
    loadHistory();
  };

  const dispense = async (id: string | number) => {
    if (!id) {
      setMessage('กรุณาใส่ Dispensing ID');
      return;
    }

    const response = await fetch(`http://localhost:3000/dispense/${id}`, {
      method: 'POST',
    });
    const data = await response.json();

    if (response.ok && data.patientPayAmount !== undefined) {
      setMessage(
        `${data.message} — คนไข้ต้องจ่ายเอง ${money(data.patientPayAmount)} บาท`,
      );
    } else {
      setMessage(data.message || 'เกิดข้อผิดพลาด');
    }
    setDispensingId('');
    loadPendingList(); // โหลดตารางใหม่: รายการที่จ่ายแล้วจะหายออก + Stock อัปเดต
  };

  const today = new Date().toISOString().slice(0, 10);

  const warningOf = (item: PendingItem) => {
    const warns: string[] = [];
    if (item.Expiry_Date && item.Expiry_Date.slice(0, 10) < today) warns.push('ยาหมดอายุ');
    if (item.Current_Stock < item.Order_quantity) warns.push('สต็อกไม่พอ');
    else if (item.Reorder_Point && item.Current_Stock - item.Order_quantity <= item.Reorder_Point)
      warns.push(`สต็อกต่ำหลังจ่าย (เหลือ ${item.Current_Stock - item.Order_quantity})`);
    return warns;
  };

  const blocked = (item: PendingItem) =>
    warningOf(item).some((w) => w === 'ยาหมดอายุ' || w === 'สต็อกไม่พอ');

  return (
    <div className="page-content">
      <h1>จ่ายยา (ตัดสต็อก)</h1>

      <div style={{ marginBottom: 12 }}>
        <button onClick={openHistory}>ดูประวัติการจ่ายยา</button>
      </div>

      <div className="card">
        {loading ? (
          <p style={{ padding: 16 }}>กำลังโหลด...</p>
        ) : pendingList.length === 0 ? (
          <p style={{ padding: 16 }}>ไม่มีรายการรอจ่ายยา</p>
        ) : (
          <table border={1} cellPadding={8}>
            <thead>
              <tr>
                <th>Dispensing ID</th>
                <th>ชื่อคนไข้</th>
                <th>ชื่อยา</th>
                <th>ประเภทยา</th>
                <th>จำนวนที่จะจ่าย</th>
                <th>ราคา/หน่วย</th>
                <th>ราคารวม</th>
                <th>สิทธิการรักษา</th>
                <th>คนไข้จ่ายเอง</th>
                <th>Stock คงเหลือ</th>
                <th>วันหมดอายุ</th>
                <th>แจ้งเตือน</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pendingList.map((item) => {
                const warns = warningOf(item);
                return (
                  <tr key={item.Dispensing_ID}>
                    <td>{item.Dispensing_ID}</td>
                    <td>{item.Patient_Name}</td>
                    <td>{item.Medicine_Name}</td>
                    <td>{item.Medicine_Type}</td>
                    <td>{item.Order_quantity}</td>
                    <td>{money(item.Unit_Price)}</td>
                    <td>{money(item.Total_amount)}</td>
                    <td>{item.Insurance_Type_Name ?? '-'}</td>
                    <td>{money(item.Patient_Pay_Amount)}</td>
                    <td>{item.Current_Stock}</td>
                    <td>{dateText(item.Expiry_Date)}</td>
                    <td style={{ color: warns.length ? 'crimson' : undefined }}>
                      {warns.length ? warns.join(', ') : '-'}
                    </td>
                    <td>
                      <button
                        disabled={blocked(item)}
                        onClick={() => dispense(item.Dispensing_ID)}
                      >
                        จ่ายยา
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="form-card">
        <p>หรือใส่ Dispensing ID ที่ต้องการจ่ายยา:</p>
        <input
          type="number"
          value={dispensingId}
          onChange={(e) => setDispensingId(e.target.value)}
          placeholder="เช่น 1, 2, 3"
        />
        <button onClick={() => dispense(dispensingId)}>ยืนยันจ่ายยา</button>
        {message && <p>{message}</p>}
      </div>

      {showHistory && (
        <div
          onClick={() => setShowHistory(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              color: '#000',
              padding: 20,
              borderRadius: 8,
              maxWidth: '90vw',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>ประวัติการจ่ายยา</h2>
              <button onClick={() => setShowHistory(false)}>ปิด</button>
            </div>
            {historyLoading ? (
              <p>กำลังโหลด...</p>
            ) : historyList.length === 0 ? (
              <p>ยังไม่มีประวัติการจ่ายยา</p>
            ) : (
              <table border={1} cellPadding={8}>
                <thead>
                  <tr>
                    <th>Dispensing ID</th>
                    <th>ชื่อคนไข้</th>
                    <th>ชื่อยา</th>
                    <th>ประเภทยา</th>
                    <th>จำนวน</th>
                    <th>ราคารวม</th>
                    <th>สิทธิการรักษา</th>
                    <th>คนไข้จ่ายเอง</th>
                    <th>วันเวลาที่จ่าย</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map((h) => (
                    <tr key={h.Dispensing_ID}>
                      <td>{h.Dispensing_ID}</td>
                      <td>{h.Patient_Name}</td>
                      <td>{h.Medicine_Name}</td>
                      <td>{h.Medicine_Type}</td>
                      <td>{h.Order_quantity}</td>
                      <td>{money(h.Total_amount)}</td>
                      <td>{h.Insurance_Type_Name ?? '-'}</td>
                      <td>{money(h.Patient_Pay_Amount)}</td>
                      <td>{dateTimeText(h.Dispensed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DispensePage;
