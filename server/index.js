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

let db;
let attemptsCollection;
let partiesCollection;

if (serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    db = admin.firestore();
    attemptsCollection = db.collection('attempts');
    partiesCollection = db.collection('parties');
    console.log('Firebase Admin Initialized.');
  } catch (error) {
    console.error('Firebase Init Error:', error);
  }
} else {
  console.error("FATAL: No service account credentials found.");
}

const app = express();
const port = 3000;

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } 
});

app.use(cors());
app.use(bodyParser.json());

// --- ROUTES ---

// PARTIES
app.get('/api/parties', async (req, res) => {
  if (!partiesCollection) return res.status(500).json({error: "Database error"});
  try {
    // Sorter nyeste fester først
    const snapshot = await partiesCollection.orderBy('created_at', 'desc').get();
    const parties = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate ? doc.data().created_at.toDate().toISOString() : new Date().toISOString()
    }));
    res.json({data: parties});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.post('/api/parties', async (req, res) => {
  if (!partiesCollection) return res.status(500).json({error: "Database error"});
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({error: "Manglende navn"});
    
    const newParty = {
      name,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await partiesCollection.add(newParty);
    res.json({data: {id: docRef.id, ...newParty}});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.get('/api/parties/:id', async (req, res) => {
  if (!partiesCollection) return res.status(500).json({error: "Database error"});
  try {
    const doc = await partiesCollection.doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({error: "Fest findes ikke"});
    
    const data = doc.data();
    res.json({
      data: {
        id: doc.id, 
        ...data,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// HALL OF FAME (Top 10 all time)
app.get('/api/halloffame', async (req, res) => {
  if (!attemptsCollection) return res.status(500).json({error: "Database error"});
  try {
    const snapshot = await attemptsCollection.orderBy('time', 'asc').limit(10).get();
    
    // Hent også fest-navne så vi kan vise hvor rekorden blev sat
    const attempts = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data();
      let partyName = "Ukendt Fest";
      if (data.partyId && partiesCollection) {
        const partyDoc = await partiesCollection.doc(data.partyId).get();
        if (partyDoc.exists) partyName = partyDoc.data().name;
      }

      const imageUrl = data.image_base64 || data.image_url || null;
      return {
        id: doc.id,
        ...data,
        partyName, 
        image_url: imageUrl,
        created_at: data.created_at ? (data.created_at.toDate ? data.created_at.toDate().toISOString() : data.created_at) : new Date().toISOString(),
      };
    }));

    res.json({data: attempts});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// ATTEMPTS (Med partyId filter)
app.get('/api/attempts', async (req, res) => {
  if (!attemptsCollection) return res.status(500).json({error: "Database error"});
  
  try {
    const { partyId } = req.query;
    
    let query = attemptsCollection;
    if (partyId) {
      query = query.where('partyId', '==', partyId);
    }
    
    // Vi sorterer client-side eller med composite index hvis nødvendigt, 
    // men for simpelthedens skyld henter vi bare og sorterer i memory hvis filter er på,
    // fordi Firestore kræver index for .where().orderBy()
    const snapshot = await query.get();
    
    let attempts = snapshot.docs.map(doc => {
      const data = doc.data();
      const imageUrl = data.image_base64 || data.image_url || null;
      return {
        id: doc.id,
        ...data,
        image_url: imageUrl,
        created_at: data.created_at ? (data.created_at.toDate ? data.created_at.toDate().toISOString() : data.created_at) : new Date().toISOString(),
      };
    });

    // Sortér manuelt her for at undgå index-krav i Firestore lige nu
    attempts.sort((a, b) => a.time - b.time);

    res.json({ "message": "success", "data": attempts });
  } catch (err) {
    console.error("GET Error:", err);
    res.status(500).json({"error": err.message});
  }
});

app.post('/api/attempts', upload.single('image'), async (req, res) => {
  if (!attemptsCollection) return res.status(500).json({error: "Database error"});

  try {
    const { name, time, beer_type, method, partyId } = req.body;
    
    if (!name || !time) {
      return res.status(400).json({"error": "Please provide name and time"});
    }

    let imageBase64 = null;
    if (req.file) {
      const b64 = req.file.buffer.toString('base64');
      imageBase64 = `data:${req.file.mimetype};base64,${b64}`;
    }
    
    const newAttempt = {
      name,
      time: parseFloat(time),
      beer_type: beer_type || 'Ukendt',
      method: method || 'Glas',
      partyId: partyId || null, // Gem hvilket fest det hører til
      image_base64: imageBase64,
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
  if (!attemptsCollection) return res.status(500).json({error: "Database error"});
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