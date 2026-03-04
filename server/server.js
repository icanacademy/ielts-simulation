import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { initializeOpenAI } from './services/openaiService.js';

// Routes
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import simulationRoutes from './routes/simulations.js';
import aiRoutes from './routes/ai.js';
import ttsRoutes from './routes/tts.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 1375;

// Middleware - Allow all origins for network access
app.use(cors({
  origin: true, // Allow any origin
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Initialize OpenAI if API key is provided
if (process.env.OPENAI_API_KEY) {
  initializeOpenAI(process.env.OPENAI_API_KEY);
  console.log('OpenAI initialized');
} else {
  console.warn('Warning: OPENAI_API_KEY not set. AI features will not work.');
}

// API endpoint to set OpenAI API key dynamically
app.post('/api/config/openai', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }
  initializeOpenAI(apiKey);
  res.json({ message: 'OpenAI API key configured successfully' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/simulations', simulationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/tts', ttsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
      console.log(`Network access: http://0.0.0.0:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
