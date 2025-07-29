const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const memberRoutes = require('./routes/memberRoutes');
const recordingRoutes = require('./routes/recordingRoutes');
const prosConsRoutes = require("./routes/prosConsRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// Middleware
app.use(cors({
  origin: [
    'https://titan-talk.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true
}));
app.use(express.json());

// ✅ Recordings now served from Firebase Storage - no local static serving needed

// Routes
app.use('/api/members', memberRoutes);
app.use('/api/recordings', recordingRoutes);
app.use("/api/pros-cons", prosConsRoutes); // ✅ NEW: Register recording route
app.use("/api/admin", adminRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('Server running ✅');
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection failed:", err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
