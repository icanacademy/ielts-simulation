import express from 'express';
import jwt from 'jsonwebtoken';
import Student from '../models/Student.js';
import User from '../models/User.js';
import Simulation from '../models/Simulation.js';
import { analyzeWeaknesses } from '../services/openaiService.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'ican-ielts-secret-key-2024';

// Helper to get user from token
const getUserFromToken = async (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return await User.findById(decoded.userId);
  } catch {
    return null;
  }
};

// Get student - tries auth token first, then falls back to device ID
router.get('/current', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const deviceId = req.headers['x-device-id'];

    // Try authenticated user first
    if (token) {
      const user = await getUserFromToken(token);
      if (user && user.studentProfile) {
        const student = await Student.findById(user.studentProfile);
        if (student) {
          return res.json(student);
        }
      }
    }

    // Fall back to device ID for guests
    if (!deviceId) {
      return res.status(400).json({ error: 'Authentication or Device ID required' });
    }

    let student = await Student.findOne({ deviceId });

    if (!student) {
      // Create default student for first-time guest users
      student = await Student.create({
        deviceId,
        name: 'Guest',
        targetBand: 7,
        weaknesses: []
      });
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update student profile
router.post('/', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const deviceId = req.headers['x-device-id'];
    const { name, email, targetBand, testDate, previousScores, weaknesses, customWeaknessNotes } = req.body;

    let student = null;

    // Try authenticated user first
    if (token) {
      const user = await getUserFromToken(token);
      if (user && user.studentProfile) {
        student = await Student.findById(user.studentProfile);
      }
    }

    // Fall back to device ID for guests
    if (!student && deviceId) {
      student = await Student.findOne({ deviceId });
    }

    if (student) {
      // Update existing student
      student.name = name || student.name;
      student.email = email || student.email;
      student.targetBand = targetBand || student.targetBand;
      student.testDate = testDate || student.testDate;
      student.previousScores = previousScores || student.previousScores;
      student.weaknesses = weaknesses || student.weaknesses;
      student.customWeaknessNotes = customWeaknessNotes !== undefined ? customWeaknessNotes : student.customWeaknessNotes;
      await student.save();
    } else if (deviceId) {
      // Create new guest student
      student = await Student.create({
        deviceId,
        name: name || 'Guest',
        email,
        targetBand,
        testDate,
        previousScores,
        weaknesses,
        customWeaknessNotes
      });
    } else {
      return res.status(400).json({ error: 'Authentication or Device ID required' });
    }

    res.status(201).json(student);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update student profile
router.put('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get student's simulation history (includes both completed and in-progress)
router.get('/:id/history', async (req, res) => {
  try {
    const simulations = await Simulation.find({
      studentId: req.params.id,
      // Include both completed and in_progress simulations
      status: { $in: ['completed', 'in_progress'] }
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(30);

    res.json(simulations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get progress data for charts
router.get('/:id/progress', async (req, res) => {
  try {
    const simulations = await Simulation.find({
      studentId: req.params.id,
      status: 'completed'
    })
      .sort({ completedAt: 1 })
      .select('completedAt overallBand sections.listening.score sections.reading.score sections.writing.score sections.speaking.score');

    const progressData = simulations.map(sim => ({
      date: sim.completedAt,
      overall: sim.overallBand,
      listening: sim.sections?.listening?.score,
      reading: sim.sections?.reading?.score,
      writing: sim.sections?.writing?.score,
      speaking: sim.sections?.speaking?.score
    }));

    res.json(progressData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Analysis of student
router.post('/:id/analyze', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const analysis = await analyzeWeaknesses(student.toObject());

    // Save analysis results
    student.analysisResults = {
      ...analysis,
      analyzedAt: new Date()
    };
    await student.save();

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
