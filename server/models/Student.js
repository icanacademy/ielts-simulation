import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  deviceId: {
    type: String,
    sparse: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  targetBand: {
    type: Number,
    min: 1,
    max: 9,
    default: 7
  },
  testDate: {
    type: Date
  },
  previousScores: {
    listening: { type: Number, min: 0, max: 9 },
    reading: { type: Number, min: 0, max: 9 },
    writing: { type: Number, min: 0, max: 9 },
    speaking: { type: Number, min: 0, max: 9 }
  },
  weaknesses: [{
    type: String,
    enum: [
      // Listening weaknesses
      'Multiple Choice', 'Map/Diagram Labeling', 'Form Completion',
      'Note Completion', 'Table Completion', 'Sentence Completion',
      'Summary Completion', 'Matching',
      // Reading weaknesses
      'True/False/Not Given', 'Yes/No/Not Given', 'Matching Headings',
      'Matching Information', 'Matching Features', 'Matching Sentence Endings',
      'Short Answer Questions', 'Diagram Labeling',
      // Writing weaknesses
      'Task 1 Data Description', 'Task 1 Process Description',
      'Task 1 Map Description', 'Task 2 Opinion Essays',
      'Task 2 Discussion Essays', 'Task 2 Problem-Solution',
      'Task 2 Advantages-Disadvantages', 'Grammar Accuracy',
      'Vocabulary Range', 'Coherence & Cohesion',
      // Speaking weaknesses
      'Fluency', 'Pronunciation', 'Vocabulary Usage',
      'Grammatical Range', 'Part 2 Long Turn', 'Part 3 Discussion'
    ]
  }],
  customWeaknessNotes: {
    type: String,
    maxlength: 5000 // Allow detailed notes/findings
  },
  analysisResults: {
    overallWeakness: String,
    recommendations: [String],
    focusAreas: [String],
    analyzedAt: Date
  }
}, {
  timestamps: true
});

const Student = mongoose.model('Student', studentSchema);

export default Student;
