import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import assignmentRoutes from './routes/assignments.js';
import notificationRoutes, { setupWebPush, scheduleNotifications } from './routes/notifications.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Initialize and start
async function start() {
  await initDb();
  setupWebPush();
  scheduleNotifications();

  // Only listen if not running in Vercel
  if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

// Vercel expects an exported function or app
if (process.env.VERCEL === '1') {
  initDb(); // Initialize async in background
  setupWebPush();
} else {
  start().catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
}

export default app;
