const sql = require('mssql/msnodesqlv8');

const config = {
  connectionString: `Driver={ODBC Driver 18 for SQL Server};Server=localhost\\SQLEXPRESS01;Database=HospitalDB;Trusted_Connection=Yes;TrustServerCertificate=Yes;`,
};

sql.connect(config)
  .then(() => {
    console.log('เชื่อมต่อสำเร็จ!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('เชื่อมต่อไม่สำเร็จ:', err.message);
    process.exit(1);
  });