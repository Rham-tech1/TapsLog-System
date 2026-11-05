const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const rsoRoutes = require('./routes/rsoRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint (supports /api/health and /health)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'TapsLog Smart Attendance Backend (Phase 3)',
    timestamp: new Date().toISOString()
  });
});
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'TapsLog Smart Attendance Backend (Phase 3)',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rso', rsoRoutes);
app.use('/api/reports', reportRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 TapsLog Backend API active on http://0.0.0.0:${PORT}`);
  console.log(`📡 Ready for Web NFC scanning & portal requests`);
  console.log(`=======================================================`);
});
