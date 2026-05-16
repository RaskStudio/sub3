const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const admin = require('firebase-admin');

// --- FIREBASE SETUP ---
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    // Forsøg at dekode fra base64 først
    serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf-8'));
  } catch (e) {
    try {
      // Hvis det fejler, er det måske bare rå JSON
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e2) {
      console.error('CRITICAL ERROR: Failed to parse FIREBASE_SERVICE_ACCOUNT.', e2);
    }
  }
} else {
  try {
    serviceAccount = require('./serviceAccountKey.json');
  } catch (e) {
    console.log('Running locally without ENV variable.');
  }
}

let db;
let attemptsCollection;
let partiesCollection;

if (serviceAccount && admin.apps.length === 0) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin Initialized.');
  } catch (error) {
    console.error('Firebase Init Error:', error);
  }
}

if (admin.apps.length > 0) {
  db = admin.firestore();
  attemptsCollection = db.collection('attempts');
  partiesCollection = db.collection('parties');
}

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } 
});

app.use(cors());
app.use(bodyParser.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// --- ROUTES ---

let partiesCache = null;
let lastPartiesFetch = 0;
const CACHE_TTL = 30 * 1000; 

// GET ALL PARTIES
app.get('/api/parties', async (req, res) => {
  if (!partiesCollection) return res.status(500).json({error: "Database error: partiesCollection not initialized"});
  
  if (partiesCache && (Date.now() - lastPartiesFetch < CACHE_TTL)) {
    return res.json({data: partiesCache, cached: true});
  }

  try {
    const snapshot = await partiesCollection.get();
    const allAttemptsSnap = await attemptsCollection
      .select('name', 'time', 'partyId', 'deleted', 'created_at', 'image_url')
      .get();
    
    const attemptsByParty = {};
    const allAttempts = allAttemptsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    allAttempts.sort((a, b) => a.time - b.time);

    allAttempts.forEach(data => {
      if (!attemptsByParty[data.partyId]) {
        attemptsByParty[data.partyId] = [];
      }
      attemptsByParty[data.partyId].push(data);
    });

    const parties = snapshot.docs
      .map(doc => {
        const partyData = doc.data();
        if (partyData.deleted === true || partyData.deleted === "true") return null;
        
        const partyId = doc.id;
        const attempts = attemptsByParty[partyId] || [];
        const uniqueAttempts = [];
        const seenNames = new Set();
        
        for (const attempt of attempts) {
          if (attempt.deleted === true || attempt.deleted === "true") continue;
          if (!seenNames.has(attempt.name)) {
            seenNames.add(attempt.name);
            uniqueAttempts.push({
              id: attempt.id,
              name: attempt.name,
              image_url: attempt.image_url || null,
              time: attempt.time
            });
          }
          if (uniqueAttempts.length >= 3) break;
        }

        return {
          id: partyId,
          ...partyData,
          created_at: partyData.created_at?.toDate ? partyData.created_at.toDate().toISOString() : new Date().toISOString(),
          topThree: uniqueAttempts
        };
      })
      .filter(p => p !== null);

    parties.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    partiesCache = parties;
    lastPartiesFetch = Date.now();

    res.json({data: parties});
  } catch (err) {
    console.error("GET PARTIES Error:", err);
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
      deleted: false,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await partiesCollection.add(newParty);
    partiesCache = null; 
    res.json({data: {id: docRef.id, ...newParty}});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.get('/api/parties/:id', async (req, res) => {
  if (!partiesCollection) return res.status(500).json({error: "Database error"});
  try {
    const doc = await partiesCollection.doc(req.params.id).get();
    if (!doc.exists || doc.data().deleted) return res.status(404).json({error: "Fest findes ikke"});
    
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

app.delete('/api/parties/:id', async (req, res) => {
  if (!partiesCollection || !attemptsCollection) return res.status(500).json({error: "Database error"});
  try {
    const partyId = req.params.id;
    const batch = db.batch();
    const attemptsSnapshot = await attemptsCollection.where('partyId', '==', partyId).get();
    
    attemptsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { deleted: true, deleted_at: admin.firestore.FieldValue.serverTimestamp() });
    });
    
    batch.update(partiesCollection.doc(partyId), { deleted: true, deleted_at: admin.firestore.FieldValue.serverTimestamp() });
    await batch.commit();

    partiesCache = null; 
    res.json({message: "Fest og tilhørende tider markeret som slettet"});
  } catch (err) {
    console.error("DELETE PARTY Error:", err);
    res.status(500).json({error: err.message});
  }
});

app.post('/api/parties/:id/restore', async (req, res) => {
  if (!partiesCollection || !attemptsCollection) return res.status(500).json({error: "Database error"});
  try {
    const partyId = req.params.id;
    const batch = db.batch();
    batch.update(partiesCollection.doc(partyId), { deleted: false, restored_at: admin.firestore.FieldValue.serverTimestamp() });
    const attemptsSnapshot = await attemptsCollection.where('partyId', '==', partyId).get();
    attemptsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { deleted: false });
    });
    await batch.commit();
    partiesCache = null; 
    res.json({message: "Fest gendannet"});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// HALL OF FAME
app.get('/api/halloffame', async (req, res) => {
  if (!attemptsCollection) return res.status(500).json({error: "Database error"});
  try {
    const snapshot = await attemptsCollection
      .select('name', 'time', 'partyId', 'deleted', 'created_at', 'image_url')
      .get();
    
    const allAttempts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    allAttempts.sort((a, b) => a.time - b.time);

    const partiesMap = {};
    const partiesSnap = await partiesCollection.get();
    partiesSnap.forEach(doc => {
      const d = doc.data();
      if (d.deleted !== true && d.deleted !== "true") {
        partiesMap[doc.id] = d.name;
      }
    });

    const attempts = [];
    const seenNames = new Set();

    for (const data of allAttempts) {
      if (data.deleted === true || data.deleted === "true") continue;
      if (seenNames.has(data.name)) continue;
      
      const partyName = partiesMap[data.partyId];
      if (data.partyId && !partyName) continue; 

      seenNames.add(data.name);

      attempts.push({
        id: data.id,
        name: data.name,
        time: data.time,
        partyId: data.partyId,
        partyName: partyName || "Ukendt Fest", 
        created_at: data.created_at ? (data.created_at.toDate ? data.created_at.toDate().toISOString() : data.created_at) : new Date().toISOString(),
      });
      
      if (attempts.length >= 50) break;
    }

    res.json({data: attempts});
  } catch (err) {
    console.error("HOF Error:", err);
    res.status(500).json({error: err.message});
  }
});

// IMAGE ENDPOINT
app.get('/api/attempts/:id/image', async (req, res) => {
  if (!attemptsCollection) return res.status(500).json({error: "Database error"});
  try {
    const doc = await attemptsCollection.doc(req.params.id).get();
    if (!doc.exists) return res.status(404).send("Attempt not found");
    
    const data = doc.data();
    const base64Data = data.image_base64 || data.image_url;
    
    if (!base64Data || typeof base64Data !== 'string') return res.status(404).send("No image data");

    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    
    if (matches && matches.length === 3) {
      const type = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      res.set('Content-Type', type);
      res.set('Cache-Control', 'public, max-age=86400');
      return res.send(buffer);
    }
    
    if (base64Data.startsWith('http')) {
      return res.redirect(base64Data);
    }
    
    res.status(400).send("Invalid image format");
  } catch (err) {
    console.error("IMAGE FETCH ERROR:", err);
    res.status(500).send(err.message);
  }
});

// PARTICIPANTS
let participantsCache = null;
let lastParticipantsFetch = 0;

app.get('/api/participants', async (req, res) => {
  if (!attemptsCollection) return res.status(500).json({error: "Database error"});
  
  if (participantsCache && (Date.now() - lastParticipantsFetch < CACHE_TTL)) {
    return res.json({data: participantsCache, cached: true});
  }

  try {
    const snapshot = await attemptsCollection.select('name', 'deleted').get();
    
    const names = new Set();
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.deleted !== true && data.deleted !== "true") {
        if (data.name) names.add(data.name);
      }
    });

    participantsCache = Array.from(names).sort();
    lastParticipantsFetch = Date.now();

    res.json({data: participantsCache});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// ATTEMPTS
app.get('/api/attempts', async (req, res) => {
  if (!attemptsCollection) return res.status(500).json({error: "Database error"});
  
  try {
    const { partyId } = req.query;
    
    let dbQuery = attemptsCollection.select('name', 'time', 'partyId', 'deleted', 'created_at', 'image_url', 'beer_type', 'method');
    
    if (partyId) {
      dbQuery = dbQuery.where('partyId', '==', partyId);
    }
    
    const snapshot = await dbQuery.get();
    
    let attempts = snapshot.docs
      .map(doc => {
        const data = doc.data();
        if (data.deleted === true || data.deleted === "true") return null;

        return {
          id: doc.id,
          ...data,
          created_at: data.created_at ? (data.created_at.toDate ? data.created_at.toDate().toISOString() : data.created_at) : new Date().toISOString(),
        };
      })
      .filter(a => a !== null);

    attempts.sort((a, b) => a.time - b.time);

    res.json({ "message": "success", "data": attempts });
  } catch (err) {
    console.error("GET ATTEMPTS Error:", err);
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
      partyId: partyId || null, 
      image_base64: imageBase64,
      deleted: false,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await attemptsCollection.add(newAttempt);
    
    participantsCache = null;
    partiesCache = null;

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
    await attemptsCollection.doc(id).update({ 
      deleted: true, 
      deleted_at: admin.firestore.FieldValue.serverTimestamp() 
    });
    partiesCache = null;
    res.json({"message": "deleted"});
  } catch (err) {
    res.status(500).json({"error": err.message});
  }
});

app.post('/api/attempts/:id/restore', async (req, res) => {
  if (!attemptsCollection) return res.status(500).json({error: "Database error"});
  try {
    const id = req.params.id;
    await attemptsCollection.doc(id).update({ deleted: false });
    partiesCache = null;
    res.json({"message": "restored"});
  } catch (err) {
    res.status(500).json({"error": err.message});
  }
});

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

module.exports = app;