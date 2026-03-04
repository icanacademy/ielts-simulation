import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionIndex: Number,
  questionType: String,
  userAnswer: mongoose.Schema.Types.Mixed,
  correctAnswer: mongoose.Schema.Types.Mixed,
  isCorrect: Boolean,
  explanation: String,
  timeSpent: Number // in seconds
}, { _id: false });

const writingTaskSchema = new mongoose.Schema({
  taskType: { type: String, enum: ['task1', 'task2'] },
  prompt: String,
  userResponse: String,
  wordCount: Number,
  scores: {
    taskAchievement: { type: Number, min: 0, max: 9 },
    coherenceCohesion: { type: Number, min: 0, max: 9 },
    lexicalResource: { type: Number, min: 0, max: 9 },
    grammaticalRange: { type: Number, min: 0, max: 9 }
  },
  overallScore: { type: Number, min: 0, max: 9 },
  feedback: String,
  improvements: [String]
}, { _id: false });

const speakingPartSchema = new mongoose.Schema({
  partNumber: { type: Number, enum: [1, 2, 3] },
  questions: [String],
  audioUrl: String, // stored recording
  transcription: String,
  scores: {
    fluencyCoherence: { type: Number, min: 0, max: 9 },
    lexicalResource: { type: Number, min: 0, max: 9 },
    grammaticalRange: { type: Number, min: 0, max: 9 },
    pronunciation: { type: Number, min: 0, max: 9 }
  },
  overallScore: { type: Number, min: 0, max: 9 },
  feedback: String
}, { _id: false });

const simulationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  type: {
    type: String,
    enum: ['full', 'practice'],
    default: 'full'
  },
  practiceSection: {
    type: String,
    enum: ['listening', 'reading', 'writing', 'speaking']
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned'],
    default: 'in_progress'
  },
  sections: {
    listening: {
      score: { type: Number, min: 0, max: 9 },
      rawScore: { type: Number, min: 0, max: 40 },
      answers: [answerSchema],
      timeSpent: Number,
      completed: { type: Boolean, default: false }
    },
    reading: {
      score: { type: Number, min: 0, max: 9 },
      rawScore: { type: Number, min: 0, max: 40 },
      answers: [answerSchema],
      timeSpent: Number,
      completed: { type: Boolean, default: false }
    },
    writing: {
      score: { type: Number, min: 0, max: 9 },
      task1: writingTaskSchema,
      task2: writingTaskSchema,
      timeSpent: Number,
      completed: { type: Boolean, default: false }
    },
    speaking: {
      score: { type: Number, min: 0, max: 9 },
      parts: [speakingPartSchema],
      timeSpent: Number,
      completed: { type: Boolean, default: false }
    }
  },
  overallBand: {
    type: Number,
    min: 0,
    max: 9
  },
  weaknessesIdentified: [String],
  recommendations: [String],
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
}, {
  timestamps: true
});

// Calculate overall band score
simulationSchema.methods.calculateOverallBand = function() {
  const scores = [];
  if (this.sections.listening?.score) scores.push(this.sections.listening.score);
  if (this.sections.reading?.score) scores.push(this.sections.reading.score);
  if (this.sections.writing?.score) scores.push(this.sections.writing.score);
  if (this.sections.speaking?.score) scores.push(this.sections.speaking.score);

  if (scores.length === 0) return 0;

  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  // IELTS rounds to nearest 0.5
  return Math.round(average * 2) / 2;
};

const Simulation = mongoose.model('Simulation', simulationSchema);

export default Simulation;
