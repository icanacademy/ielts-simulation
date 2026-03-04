import mongoose from 'mongoose';

const questionItemSchema = new mongoose.Schema({
  questionNumber: Number,
  questionText: String,
  questionType: String, // Flexible to accept AI-generated types
  options: [String], // for multiple choice
  correctAnswer: mongoose.Schema.Types.Mixed,
  explanation: mongoose.Schema.Types.Mixed, // Can be string or object with detailed explanation
  paragraphReference: String,
  keyEvidence: String,
  studyTip: String,
  commonMistake: String,
  timeStamp: String,
  keyPhrase: String,
  spellingNote: String
}, { _id: false });

const questionSchema = new mongoose.Schema({
  section: {
    type: String,
    enum: ['listening', 'reading', 'writing', 'speaking'],
    required: true
  },
  partNumber: {
    type: Number,
    min: 1,
    max: 4
  },
  questionTypes: [String], // types of questions included
  difficulty: {
    type: Number,
    min: 4,
    max: 9,
    default: 6
  },
  targetWeaknesses: [String], // which weaknesses this targets

  // For Reading
  passage: {
    title: String,
    text: String,
    wordCount: Number,
    topic: String
  },

  // For Listening
  audioScript: String, // The script for TTS generation
  audioUrl: String, // Generated audio URL (if cached)
  audioContext: String, // Description of the audio scenario

  // For Writing
  writingPrompt: {
    taskType: { type: String, enum: ['task1', 'task2'] },
    prompt: String,
    imageUrl: String, // for charts/graphs
    chartData: mongoose.Schema.Types.Mixed, // data for generating charts
    sampleAnswer: String,
    keyPoints: [String]
  },

  // For Speaking
  speakingPrompt: {
    partNumber: Number,
    questions: [String],
    cueCard: {
      topic: String,
      bulletPoints: [String],
      followUpQuestions: [String]
    },
    sampleResponses: [String]
  },

  questions: [questionItemSchema],

  usageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient querying
questionSchema.index({ section: 1, difficulty: 1, targetWeaknesses: 1 });

const Question = mongoose.model('Question', questionSchema);

export default Question;
