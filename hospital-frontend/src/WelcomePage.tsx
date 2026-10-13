import { Link } from 'react-router-dom';
import logo from './assets/logo.png';

function WelcomePage() {
  return (
    <div className="page-content" style={{ textAlign: 'center', paddingTop: '40px' }}>
      <img
        src={logo}
        alt="Killerunai Hospital Logo"
        style={{ width: '160px', marginBottom: '16px' }}
      />

      <h1 style={{ display: 'block', fontSize: '36px' }}>
        ระบบบริการดูแลผู้ป่วยในโรงพยาบาล
      </h1>
      <p style={{ marginBottom: '48px', fontSize: '16px' }}>
        เลือกเมนูที่ต้องการใช้งาน
      </p>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
          flexWrap: 'wrap',
        }}
      >
        <Link to="/queue" className="welcome-card">
          🗓️ คิววันนี้
        </Link>
        <Link to="/booking" className="welcome-card">
          📝 จองคิว
        </Link>
        <Link to="/dispense" className="welcome-card">
          💊 จ่ายยา
        </Link>
        <Link to="/fines" className="welcome-card">
          💰 ค่าปรับ
        </Link>
        <Link to="/history" className="welcome-card">
          📋 ประวัติคนไข้
        </Link>
        <Link to="/blacklist" className="welcome-card">
          🚫 Blacklist
        </Link>
        <Link to="/stock" className="welcome-card">
          ⚠️ แจ้งเตือนคลังยา
        </Link>
      </div>
    </div>
  );
}

export default WelcomePage;