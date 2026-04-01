require('dotenv').config();
require('dns').setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const adminRoutes = require('./routes/admin');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();

// --- DATABASE CONNECTION GUARD (PROD FIX) ---
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB GUARD ERROR:", err.message);
    next();
  }
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());

// Serve frontend
const publicPath = path.join(__dirname, '../frontend/public');
app.use(express.static(publicPath));

app.get('/', (req, res) => {
  res.send('Backend is running!');
});

app.get('/api/', (req, res) => {
  res.send('API root. Use /api/auth or /api/attendance.');
});

// Avoid 404 noise for favicon and Chrome DevTools well-known request
app.get('/favicon.ico', (req, res) => res.sendStatus(204));
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => res.sendStatus(204));

app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);

// Proxy OCR requests to HuggingFace
const API_URL = "https://api-inference.huggingface.co/models/DunnBC22/trocr-large-printed-cmc7_tesseract_MICR_ocr";
const API_TOKEN = process.env.HF_API_TOKEN;

app.post('/api/ocr', upload.single('image'), async (req, res) => {
  try {
    const imageBlob = req.file.buffer;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/octet-stream"
      },
      body: imageBlob,
    });

    // Try to parse JSON, but handle empty or invalid responses
    let result;
    try {
      result = await response.json();
    } catch (jsonErr) {
      result = { error: "Invalid or empty response from OCR API" };
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "OCR failed", details: err.message });
  }
});

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;