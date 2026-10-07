const sql = require('mssql');

const config = {
  user: 'MES_USER',
  password: 'Office26',
  server: '10.90.104.27',
  database: 'labbelMain',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function test() {
  try {
    const pool = await sql.connect(config);

    const result = await pool.request().query(`
      SELECT TOP 10
        k.ExternalKanbanId,
        m.strName AS Material,
        m.strDescription AS MaterialDescription,
        a.strName AS AreaName,
        b.strName AS AreaLocation,
        k.intQuantity AS Quantity
      FROM dbo.tblKanban k
      LEFT JOIN dbo.tblMaterial m
        ON k.intMaterial = m.id
      LEFT JOIN dbo.tblBins b
        ON k.intBin = b.id
      LEFT JOIN dbo.tblAreas a
        ON k.intArea = a.id
    `);

    console.log(result.recordset);

    await pool.close();
  }
  catch (err) {
    console.error('DB ERROR:', err);
  }
}

test();