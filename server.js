const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;
const DB_FILE = path.join(__dirname, 'database.json');

// In-Memory Database State
let db = {
  bloodBanks: [],
  donors: [],
  sosRequests: []
};

// Load Database from File
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const rawData = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(rawData);
      console.log('Database loaded successfully. Records loaded:');
      console.log(`- Blood Banks: ${db.bloodBanks.length}`);
      console.log(`- Donors: ${db.donors.length}`);
      console.log(`- SOS Requests: ${db.sosRequests.length}`);
    } else {
      console.log('database.json not found. Initializing empty structures.');
    }
  } catch (err) {
    console.error('Error loading database.json:', err);
  }
}

// Persist Database back to JSON file
function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    console.log('Database successfully persisted to database.json');
  } catch (err) {
    console.error('Failed to write database.json:', err);
  }
}

// Helper to send JSON responses
function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// Helper to serve Static Files
function serveStaticFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 File Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Internal Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}

// Initialize Database
loadDatabase();

// Create HTTP Server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS Preflight Options
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // --- API ROUTES ---

  // GET /api/blood-banks
  if (pathname === '/api/blood-banks' && method === 'GET') {
    return sendJSON(res, db.bloodBanks);
  }

  // GET /api/donors
  if (pathname === '/api/donors' && method === 'GET') {
    return sendJSON(res, db.donors);
  }

  // GET /api/sos
  if (pathname === '/api/sos' && method === 'GET') {
    return sendJSON(res, db.sosRequests);
  }

  // POST /api/sos
  if (pathname === '/api/sos' && method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        
        // Validate payload fields
        if (!payload.patient || !payload.hospital || !payload.phone || !payload.location) {
          return sendJSON(res, { error: "Missing required fields (patient, hospital, phone, location)." }, 400);
        }

        // Map and append new SOS record
        const newRequest = {
          id: Date.now(),
          patient: payload.patient,
          group: payload.group || 'O-',
          units: parseInt(payload.units) || 1,
          hospital: payload.hospital,
          phone: payload.phone,
          location: payload.location,
          time: "Just now",
          active: true
        };

        db.sosRequests.unshift(newRequest);
        saveDatabase(); // Persist changes

        return sendJSON(res, { success: true, request: newRequest }, 201);
      } catch (err) {
        return sendJSON(res, { error: "Invalid JSON format payload." }, 400);
      }
    });
    return;
  }

  // --- STATIC ASSETS ROUTING ---
  
  let targetPath = '';
  let contentType = 'text/html';

  if (pathname === '/' || pathname === '/index.html') {
    targetPath = path.join(__dirname, 'index.html');
    contentType = 'text/html';
  } else if (pathname === '/style.css') {
    targetPath = path.join(__dirname, 'style.css');
    contentType = 'text/css';
  } else if (pathname === '/script.js') {
    targetPath = path.join(__dirname, 'script.js');
    contentType = 'text/javascript';
  } else {
    // Treat as potential static file request or fallback to 404
    targetPath = path.join(__dirname, pathname);
    const ext = path.extname(targetPath);
    if (ext === '.js') contentType = 'text/javascript';
    else if (ext === '.css') contentType = 'text/css';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.json') contentType = 'application/json';
    else contentType = 'text/plain';
  }

  serveStaticFile(res, targetPath, contentType);
});

// Bind Port listener
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`Blood Bank Live Radar Node API Server active.`);
  console.log(`Serving local console endpoints at http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
