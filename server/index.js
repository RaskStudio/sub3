const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const admin = require('firebase-admin');
const path = require('path');

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

let bucket;
const db = admin.firestore ? admin.firestore() : null; // Initier kun hvis admin virker
let attemptsCollection;

if (serviceAccount) {
  try {
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`;
    console.log(`Initializing Firebase with bucket: ${bucketName}`);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: bucketName
    });
    
    // Refresh referencer efter init
    attemptsCollection = admin.firestore().collection('attempts');
    bucket = admin.storage().bucket();
    console.log('Firebase Admin Initialized successfully.');
  } catch (error) {
    console.error('Firebase Init Error:', error);
  }
} else {
  console.error("FATAL: No service account credentials found. Database will not work.");
}

const app = express();
const port = 3000;

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // Max 5MB
});

app.use(cors());
app.use(bodyParser.json());

// --- ROUTES ---

app.get('/api/attempts', async (req, res) => {
  if (!attemptsCollection) return res.status(500).json({error: "Database not connected"});
  
  try {
    const snapshot = await attemptsCollection.orderBy('time', 'asc').get();
    
    const attempts = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
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
  if (!attemptsCollection) return res.status(500).json({error: "Database not connected"});

  try {
    const { name, time, beer_type, method } = req.body;
    let image_url = null;

    if (!name || !time) {
      return res.status(400).json({"error": "Please provide name and time"});
    }

    console.log(`Processing attempt for: ${name}, Time: ${time}`);

    // Prøv at uploade billede - men lad ikke hele requesten fejle hvis det går galt
    if (req.file && bucket) {
      try {
        console.log(`Uploading image (${req.file.size} bytes)...`);
        const filename = `attempts/${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(req.file.originalname)}`;
        const file = bucket.file(filename);

        await file.save(req.file.buffer, {
          metadata: { contentType: req.file.mimetype },
          resumable: false 
        });

        // Gør filen offentlig
        await file.makePublic();
        image_url = `https://storage.googleapis.com/${bucket.name}/${filename}`;
        console.log(`Image uploaded to: ${image_url}`);
      } catch (imgError) {
        console.error("Image upload failed (continuing without image):", imgError);
        // Vi fortsætter uden image_url
      }
    } else if (req.file && !bucket) {
      console.warn("Image received but Storage Bucket not initialized.");
    }
    
    const newAttempt = {
      name,
      time: parseFloat(time),
      beer_type: beer_type || 'Ukendt',
      method: method || 'Glas',
      image_url: image_url,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await attemptsCollection.add(newAttempt);
    console.log(`Attempt saved with ID: ${docRef.id}`);
    
    res.json({
      "message": "success",
      "data": { 
        id: docRef.id, 
        ...newAttempt,
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