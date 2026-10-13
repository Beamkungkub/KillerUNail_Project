// ช่องเลือกวันที่แบบ พ.ศ. (วัน / เดือน / ปี พ.ศ.)
// เก็บค่าที่เลือกไว้ในตัวเอง (local state) เพื่อให้เลือกทีละช่องได้โดยไม่หลุด
// ค่าที่ส่งออก (onChange) เป็นสตริง ค.ศ. รูปแบบ YYYY-MM-DD ส่งก็ต่อเมื่อเลือกครบ 3 ช่องแล้ว
import { useEffect, useState } from 'react';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
const BE_OFFSET = 543;

interface Props {
  value: string; // 'YYYY-MM-DD' (ค.ศ.) หรือ '' ถ้ายังไม่เลือก
  onChange: (isoDate: string) => void;
  yearRangeBack?: number;
  yearRangeForward?: number;
}

function daysInMonth(yearCE: number, month1to12: number) {
  return new Date(yearCE, month1to12, 0).getDate();
}

function parseValue(value: string) {
  if (!value) return { d: undefined, m: undefined, y: undefined };
  const [y, m, d] = value.split('-').map(Number);
  return { d, m, y };
}

function ThaiDateInput({ value, onChange, yearRangeBack = 100, yearRangeForward = 1 }: Props) {
  const [day, setDay] = useState<number | undefined>(parseValue(value).d);
  const [month, setMonth] = useState<number | undefined>(parseValue(value).m);
  const [yearCE, setYearCE] = useState<number | undefined>(parseValue(value).y);

  // ถ้า value จากข้างนอกถูกเคลียร์ (เช่นกดล้างฟอร์ม) ให้เคลียร์ตามด้วย
  useEffect(() => {
    if (!value) {
      setDay(undefined);
      setMonth(undefined);
      setYearCE(undefined);
    }
  }, [value]);

  const todayCE = new Date().getFullYear();
  const years: number[] = [];
  for (let y = todayCE + yearRangeForward; y >= todayCE - yearRangeBack; y--) years.push(y);

  const maxDay = yearCE && month ? daysInMonth(yearCE, month) : 31;

  const commitIfComplete = (d?: number, m?: number, y?: number) => {
    if (d && m && y) {
      const clampedDay = Math.min(d, daysInMonth(y, m));
      onChange(`${y}-${String(m).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`);
    }
  };

  return (
    <span style={{ display: 'inline-flex', gap: 6 }}>
      <select
        value={day ?? ''}
        onChange={(e) => {
          const d = Number(e.target.value);
          setDay(d);
          commitIfComplete(d, month, yearCE);
        }}
      >
        <option value="">วัน</option>
        {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
      <select
        value={month ?? ''}
        onChange={(e) => {
          const m = Number(e.target.value);
          setMonth(m);
          commitIfComplete(day, m, yearCE);
        }}
      >
        <option value="">เดือน</option>
        {THAI_MONTHS.map((name, i) => (
          <option key={name} value={i + 1}>{name}</option>
        ))}
      </select>
      <select
        value={yearCE ?? ''}
        onChange={(e) => {
          const y = Number(e.target.value);
          setYearCE(y);
          commitIfComplete(day, month, y);
        }}
      >
        <option value="">ปี (พ.ศ.)</option>
        {years.map((y) => (
          <option key={y} value={y}>{y + BE_OFFSET}</option>
        ))}
      </select>
    </span>
  );
}

export default ThaiDateInput;
