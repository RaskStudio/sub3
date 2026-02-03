const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const port = 3000;

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    // Unikt filnavn: timestamp + original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(bodyParser.json());
// Gør uploads mappen tilgængelig som statiske filer
app.use('/uploads', express.static('uploads'));

// Database setup
const dbPath = path.resolve(__dirname, 'sub3.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Create table & Migration
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    time REAL NOT NULL,
    beer_type TEXT DEFAULT 'Ukendt',
    method TEXT DEFAULT 'Glas',
    image_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (!err) {
      // Migrations for existing tables
      db.run("ALTER TABLE attempts ADD COLUMN beer_type TEXT DEFAULT 'Ukendt'", () => {});
      db.run("ALTER TABLE attempts ADD COLUMN method TEXT DEFAULT 'Glas'", () => {});
      db.run("ALTER TABLE attempts ADD COLUMN image_path TEXT", () => {});
    }
  });
});

// Routes
app.get('/api/attempts', (req, res) => {
  db.all("SELECT * FROM attempts ORDER BY time ASC", [], (err, rows) => {
    if (err) {
      res.status(400).json({"error": err.message});
      return;
    }
    // Tilføj fuld URL til billedet hvis det findes
    const attemptsWithImages = rows.map(row => {
      if (row.image_path) {
        return { ...row, image_url: `http://localhost:${port}/${row.image_path}` };
      }
      return row;
    });
    
    res.json({
      "message": "success",
      "data": attemptsWithImages
    });
  });
});

// Opdateret POST route der håndterer både tekst og fil
app.post('/api/attempts', upload.single('image'), (req, res) => {
  const { name, time, beer_type, method } = req.body;
  const image_path = req.file ? req.file.path : null;

  if (!name || !time) {
    res.status(400).json({"error": "Please provide name and time"});
    return;
  }
  
  const sql = 'INSERT INTO attempts (name, time, beer_type, method, image_path) VALUES (?, ?, ?, ?, ?)';
  const params = [name, time, beer_type || 'Ukendt', method || 'Glas', image_path];
  
  db.run(sql, params, function (err, result) {
    if (err) {
      res.status(400).json({"error": err.message});
      return;
    }
    res.json({
      "message": "success",
      "data": { id: this.lastID, name, time, beer_type, method, image_path }
    });
  });
});

app.delete('/api/attempts/:id', (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM attempts WHERE id = ?", id, function (err) {
    if (err) {
      res.status(400).json({"error": err.message});
      return;
    }
    res.json({"message": "deleted", changes: this.changes});
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});