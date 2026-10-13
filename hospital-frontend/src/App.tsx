import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import WelcomePage from './WelcomePage';
import QueuePage from './QueuePage';
import DispensePage from './DispensePage';
import FinesPage from './FinesPage';
import BookingPage from './BookingPage';
import PatientHistoryPage from './PatientHistoryPage';
import BlacklistPage from './BlacklistPage';
import StockAlertPage from './StockAlertPage';

function App() {
  return (
    <BrowserRouter>
      <nav style={{ padding: '16px', borderBottom: '1px solid #ccc' }}>
        <Link to="/" style={{ marginRight: '16px' }}>
          หน้าแรก
        </Link>
        <Link to="/queue" style={{ marginRight: '16px' }}>
          คิววันนี้
        </Link>
        <Link to="/booking" style={{ marginRight: '16px' }}>
          จองคิว
        </Link>
        <Link to="/dispense" style={{ marginRight: '16px' }}>
          จ่ายยา
        </Link>
        <Link to="/fines" style={{ marginRight: '16px' }}>
          ค่าปรับ
        </Link>
        <Link to="/history" style={{ marginRight: '16px' }}>
          ประวัติคนไข้
        </Link>
        <Link to="/blacklist" style={{ marginRight: '16px' }}>
          Blacklist
        </Link>
        <Link to="/stock">แจ้งเตือนคลังยา</Link>
      </nav>

      <div style={{ padding: '16px' }}>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/dispense" element={<DispensePage />} />
          <Route path="/fines" element={<FinesPage />} />
          <Route path="/history" element={<PatientHistoryPage />} />
          <Route path="/blacklist" element={<BlacklistPage />} />
          <Route path="/stock" element={<StockAlertPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;