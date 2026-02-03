const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const admin = require('firebase-admin');

// --- FIREBASE SETUP ---
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf-8'));
  } catch (e) {
    console.error('CRITICAL ERROR: Failed to parse FIREBASE_SERVICE_ACCOUNT base64 string.', e);
  }
} else {
  try {
    serviceAccount = require('./serviceAccountKey.json');
  } catch (e) {
    console.log('Running locally without ENV variable (looking for serviceAccountKey.json).');
  }
}

let attemptsCollection;

if (serviceAccount) {
  try {
    // Vi bruger KUN databasen nu - ingen Storage Bucket nødvendig!
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    attemptsCollection = admin.firestore().collection('attempts');
    console.log('Firebase Admin Initialized (Database only).');
  } catch (error) {
    console.error('Firebase Init Error:', error);
  }
} else {
  console.error("FATAL: No service account credentials found. Database will not work.");
}

const app = express();
const port = 3000;

// Multer setup: Memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } 
});

app.use(cors());
app.use(bodyParser.json());

// --- ROUTES ---

app.get('/api/attempts', async (req, res) => {
  if (!attemptsCollection) return res.status(500).json({error: "Database not connected. Check server logs."});
  
  try {
    const snapshot = await attemptsCollection.orderBy('time', 'asc').get();
    
    const attempts = snapshot.docs.map(doc => {
      const data = doc.data();
      // Tjek både ny (base64) og gammel (url) metode
      const imageUrl = data.image_base64 || data.image_url || null;
      
      return {
        id: doc.id,
        ...data,
        image_url: imageUrl,
        created_at: data.created_at ? (data.created_at.toDate ? data.created_at.toDate().toISOString() : data.created_at) : new Date().toISOString(),
      };
    });

    res.json({ "message": "success", "data": attempts });
  } catch (err) {
    console.error("GET Error:", err);
    res.status(500).json({"error": err.message});
  }
});

app.post('/api/attempts', upload.single('image'), async (req, res) => {
  if (!attemptsCollection) return res.status(500).json({error: "Database not connected. Check server logs."});

  try {
    const { name, time, beer_type, method } = req.body;
    
    if (!name || !time) {
      return res.status(400).json({"error": "Please provide name and time"});
    }

    let imageBase64 = null;
    
    // Konverter uploadet fil direkte til Base64 streng
    if (req.file) {
      const b64 = req.file.buffer.toString('base64');
      imageBase64 = `data:${req.file.mimetype};base64,${b64}`;
    }
    
    const newAttempt = {
      name,
      time: parseFloat(time),
      beer_type: beer_type || 'Ukendt',
      method: method || 'Glas',
      image_base64: imageBase64, // Gem billedet direkte i dokumentet
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await attemptsCollection.add(newAttempt);
    
    res.json({
      "message": "success",
      "data": { 
        id: docRef.id, 
        ...newAttempt,
        image_url: imageBase64,
        created_at: new Date().toISOString() 
      }
    });
  } catch (err) {
    console.error("POST Error:", err);
    res.status(500).json({"error": err.message});
  }
});

app.delete('/api/attempts/:id', async (req, res) => {
  if (!attemptsCollection) return res.status(500).json({error: "Database not connected"});
  try {
    const id = req.params.id;
    await attemptsCollection.doc(id).delete();
    res.json({"message": "deleted"});
  } catch (err) {
    res.status(500).json({"error": err.message});
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

module.exports = app;