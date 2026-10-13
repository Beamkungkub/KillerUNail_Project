// ช่องเลือกวันเวลานัดแบบ พ.ศ. (วัน / เดือน / ปี พ.ศ. / ชั่วโมง / นาที)
// เก็บเวลาไว้ในตัวเอง (local state) เพื่อให้เลือกทีละช่องได้โดยไม่หลุด
// ค่าที่ส่งออก (onChange) เป็นสตริง 'YYYY-MM-DD HH:MM' (ค.ศ.) ส่งเมื่อครบทุกช่องแล้ว
import { useEffect, useState } from 'react';
import ThaiDateInput from './ThaiDateInput';

interface Props {
  value: string; // 'YYYY-MM-DD HH:MM' (ค.ศ.) หรือ ''
  onChange: (value: string) => void;
}

function parseValue(value: string) {
  const [datePart, timePart] = value ? value.split(' ') : ['', ''];
  const [h, m] = timePart ? timePart.split(':').map(Number) : [undefined, undefined];
  return { datePart, h, m };
}

function ThaiDateTimeInput({ value, onChange }: Props) {
  const initial = parseValue(value);
  const [datePart, setDatePart] = useState(initial.datePart);
  const [hour, setHour] = useState<number | undefined>(initial.h);
  const [minute, setMinute] = useState<number | undefined>(initial.m);

  useEffect(() => {
    if (!value) {
      setDatePart('');
      setHour(undefined);
      setMinute(undefined);
    }
  }, [value]);

  const commitIfComplete = (d: string, h?: number, m?: number) => {
    if (d && h !== undefined && m !== undefined) {
      onChange(`${d} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  };

  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <ThaiDateInput
        value={datePart}
        onChange={(iso) => {
          setDatePart(iso);
          commitIfComplete(iso, hour, minute);
        }}
        yearRangeBack={1}
        yearRangeForward={2}
      />
      <select
        value={hour ?? ''}
        onChange={(e) => {
          const h = Number(e.target.value);
          setHour(h);
          commitIfComplete(datePart, h, minute);
        }}
      >
        <option value="">ชม.</option>
        {Array.from({ length: 24 }, (_, i) => i).map((h) => (
          <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
        ))}
      </select>
      :
      <select
        value={minute ?? ''}
        onChange={(e) => {
          const m = Number(e.target.value);
          setMinute(m);
          commitIfComplete(datePart, hour, m);
        }}
      >
        <option value="">นาที</option>
        {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
          <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
        ))}
      </select>
    </span>
  );
}

export default ThaiDateTimeInput;
