require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const eventRoutes = require('./routes/eventRoutes');
const taskEmitter = require('./services/eventService');

const app = express();
const PORT = process.env.PORT || 5004;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/events', eventRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    practical: 'Practical 10: Asynchronous Background Processing with EventEmitter',
    studentId: process.env.STUDENT_ID || '24CS038',
    studentName: process.env.STUDENT_NAME || 'Daksh Karangiya',
    port: PORT,
    simulatedDelayMs: process.env.SIMULATED_NOTIFICATION_DELAY_MS || 1500
  });
});

// Database connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/task_manager_p10';
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('----------------------------------------------------');
    console.log(`MongoDB Connected Successfully to: ${MONGO_URI}`);
    console.log(`Practical 10: Native EventEmitter Background Worker`);
    console.log(`Student: Daksh Karangiya | Roll: 24CS038`);
    console.log('----------------------------------------------------');
    app.listen(PORT, () => {
      console.log(`Server is running at: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
