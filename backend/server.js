const express = require('express');
const cors = require('cors');
const sql = require('mssql');

const app = express();

app.use(cors());
app.use(express.json());


// ==================================================
// SQL SERVER CONFIG
// ==================================================

const dbConfig = {
  server: '10.90.104.27',
  database: 'labbelMain',
  user: 'MES_USER',
  password: 'Office26',

  options: {
    encrypt: false,
    trustServerCertificate: true
  },

  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};


// ==================================================
// IMAGE SERVER
// ==================================================

const IMAGE_BASE_URL = 'http://10.90.104.34:9240';


// ==================================================
// SQL CONNECTION
// ==================================================

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log('✅ Connected to SQL Server');
    return pool;
  })
  .catch(err => {
    console.error('❌ SQL CONNECTION ERROR:', err);
    throw err;
  });


// ==================================================
// NORMALIZE LINE
// ==================================================

function normalizeLine(area) {

  const raw = String(area || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(/_/g, '')
    .replace(/-/g, '');


  // ==================================================
  // XT2 / XT4
  // ==================================================

  if (raw.includes('XT2XT4TU')) {
    return 'XT2XT4TU';
  }

  if (raw.includes('XT2XT4ATO1')) {
    return 'XT2XT4ATO1';
  }


  // ==================================================
  // XT5
  // ==================================================

  if (
    raw.includes('XT5TRIPUNIT') ||
    raw.includes('XT5TU')
  ) {
    return 'XT5TU';
  }

  if (raw.includes('XT5STAT')) {
    return 'XT5ATO';
  }

  if (raw.includes('XT5KIT')) {
    return 'XT5KIT';
  }

  if (raw.includes('XT5BB')) {
    return 'XT5KIT';
  }


  // ==================================================
  // TMAX
  // ==================================================

  if (raw.includes('TMAXSTAT')) {
    return 'TMAXATO';
  }

  if (
    raw.includes('TMAXXT3KIT') ||
    raw.includes('TMAXXT6KIT')
  ) {
    return 'TMAXKIT';
  }


  // ==================================================
  // XT7
  // ==================================================

  if (
    raw.includes('XT7E12BB1') ||
    raw.includes('XT7E12BB')
  ) {
    return 'XT7BB';
  }

  if (
    raw.includes('XT7E12KIT') ||
    raw.includes('XT7E12STAT')
  ) {
    return 'XT7_E1.2.KIT';
  }


  // ==================================================
  // EMAX
  // ==================================================

  if (raw.includes('EMAX2BB1STAT')) {
    return 'EMAX2BB1';
  }

  if (
    raw.includes('EMAX2BB23STAT') ||
    raw.includes('EMAX2BB2&3STAT')
  ) {
    return 'EMAX2BB23';
  }

  if (
    raw.includes('EMAX2PLST') ||
    raw.includes('EMAX2PL')
  ) {
    return 'EMAX2PL_ST';
  }


  // Existing + new EMAX ATO names
  if (
    raw.includes('EMAX2KIT') ||
    raw.includes('EMAX2STAT') ||
    raw.includes('EMAX2LINE1&2PREP') ||
    raw.includes('EMAX2LINE1PREP') ||
    raw.includes('EMAX2LINE2PREP')
  ) {
    return 'EMAX2ATO';
  }


  // ==================================================
  // TRUONE
  // ==================================================

  if (raw.includes('ATSTRU1KIT')) {
    return 'TRUONE_LINE1';
  }

  if (
    raw.includes('TRUONESWKITTING') ||
    raw.includes('TRUONESWSTATION') ||
    raw.includes('TRU1SWST')
  ) {
    return 'TRUONE_SW';
  }


  // ==================================================
  // DEFAULT
  // ==================================================

  return 'FLOOR';
}


// ==================================================
// PARSE LOCATION
// ==================================================

function parseLocation(storingPosition) {

  const str = String(storingPosition || '')
    .toUpperCase()
    .trim();


  // CART A, CART-A, CART_A, CARTA, CART 1
  const cartMatch = str.match(
    /^CART[\s\-_]*([A-Z0-9]+)$/
  );

  if (cartMatch) {

    return {
      rack: `CART ${cartMatch[1]}`,
      level: 1,
      bin: 1,

      isFloor: false,
      isCart: true,

      locationType: 'CART'
    };
  }


  // Standard rack format:
  // A.1.2
  // B.3.4
  // N.2.5

  const rackMatch = str.match(
    /^([A-Z])\.(\d+)\.(\d+)$/
  );

  if (rackMatch) {

    return {
      rack: rackMatch[1],

      level:
        Number(rackMatch[2]) || 0,

      bin:
        Number(rackMatch[3]) || 0,

      isFloor: false,
      isCart: false,

      locationType: 'RACK'
    };
  }


  return {
    rack: 'FLOOR',

    level: 0,
    bin: 0,

    isFloor: true,
    isCart: false,

    locationType: 'FLOOR'
  };
}


// ==================================================
// BUILD IMAGE URL
// ==================================================

function getImageUrl(imagePath) {

  if (!imagePath) {
    return '';
  }

  const path = String(imagePath).trim();

  // Already a full URL
  if (
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }


  // SQL path already starts with /
  if (path.startsWith('/')) {
    return `${IMAGE_BASE_URL}${path}`;
  }


  // SQL path does not start with /
  return `${IMAGE_BASE_URL}/${path}`;
}


// ==================================================
// LOAD SQL DATA
// ==================================================

async function loadSqlData() {

  const pool = await poolPromise;


  const result = await pool
    .request()
    .query(`

      SELECT

        k.ExternalKanbanId,

        m.strName AS Material,

        m.strDescription AS MaterialDescription,

        a.strName AS AreaName,

        b.strName AS AreaLocation,

        k.intQuantity AS Quantity,

        bs.strShortName AS BinSizeShortForm,

        bs.strName AS BinSize,

        m.ImagePath AS ImagePath


      FROM dbo.tblKanban k


      LEFT JOIN dbo.tblMaterial m
        ON k.intMaterial = m.id


      LEFT JOIN dbo.tblBins b
        ON k.intBin = b.id


      LEFT JOIN dbo.tblAreas a
        ON k.intArea = a.id


      LEFT JOIN dbo.tblBinSizes bs
        ON b.intSize = bs.id

    `);


  return result.recordset.map(row => {

    const area =
      row.AreaName || '';

    const storingPosition =
      row.AreaLocation || '';


    const parsed =
      parseLocation(storingPosition);


    return {

      material:
        row.Material || '',

      description:
        row.MaterialDescription || '',


      area,

      storingPosition,


      kanbanContainer:
        row.BinSizeShortForm ||
        row.BinSize ||
        '',


      qty:
        Number(row.Quantity || 0),


      idNumber:
        row.ExternalKanbanId || '',


      // IMPORTANT:
      // Convert SQL relative image path to complete browser URL.
      imagePath:
        getImageUrl(row.ImagePath),


      line:
        normalizeLine(area),


      rack:
        parsed.rack,

      level:
        parsed.level,

      bin:
        parsed.bin,


      isFloor:
        parsed.isFloor,

      isCart:
        parsed.isCart,

      locationType:
        parsed.locationType
    };

  });

}


// ==================================================
// MATERIALS API
// ==================================================

app.get('/api/materials', async (req, res) => {

  try {

    let data =
      await loadSqlData();


    const lineFilter =
      String(req.query.line || '')
        .trim()
        .toUpperCase();


    // Filter by selected line
    if (
      lineFilter &&
      lineFilter !== 'ALL'
    ) {

      data = data.filter(
        item => item.line === lineFilter
      );
    }


    // XT5KIT special racks
    if (lineFilter === 'XT5KIT') {

      data = data.filter(item =>
        ['N', 'O', 'P', 'Q']
          .includes(item.rack)
      );
    }


    console.log(
      `TOTAL MATERIALS: ${data.length}` +
      (
        lineFilter
          ? ` (line=${lineFilter})`
          : ''
      )
    );


    res.json({
      success: true,
      data
    });

  }

  catch (err) {

    console.error(
      'SERVER ERROR:',
      err
    );


    res.status(500).json({
      success: false,
      error: err.message
    });
  }

});


// ==================================================
// HEALTH CHECK
// ==================================================

app.get('/api/health', async (req, res) => {

  try {

    const pool =
      await poolPromise;


    await pool
      .request()
      .query(
        'SELECT 1 AS test'
      );


    res.json({

      status: 'ok',

      source: 'SQL Server',

      server:
        dbConfig.server,

      database:
        dbConfig.database

    });

  }

  catch (err) {

    console.error(
      'HEALTH CHECK ERROR:',
      err
    );


    res
      .status(500)
      .json({

        status: 'error',

        source: 'SQL Server',

        error:
          err.message
      });
  }

});


// ==================================================
// ROOT TEST
// ==================================================

app.get('/', (req, res) => {

  res.json({

    message:
      'Material Mapping API is running',

    endpoints: {
      materials:
        '/api/materials',

      health:
        '/api/health'
    }

  });

});


// ==================================================
// START SERVER
// ==================================================

const PORT = 3000;


app.listen(PORT, () => {

  console.log(
    `✅ Server running on http://localhost:${PORT}`
  );

  console.log(
    `✅ Data source: SQL Server ${dbConfig.server}/${dbConfig.database}`
  );

  console.log(
    `✅ Image source: ${IMAGE_BASE_URL}`
  );

});