// --- models/questions.js ---
import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema({
  inputFileKey: {
    type: String,
    required: true,
  },
  outputFileKey: {
    type: String,
    required: true,
  }
}, { _id: false });

const sampleTestCaseSchema = new mongoose.Schema({
  inputFileKey: {
    type: String,
    required: true,
  },
  outputFileKey: {
    type: String,
    required: true,
  }
}, { _id: false });


const QuestionSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
  },
  timeLimitSec: {
    type: Number,
    enum: [1, 2, 5],
    default: 2,
    required: true,
  },
  memoryLimitMb: {
    type: Number,
    enum: [128, 256, 512, 1024],
    default: 256,
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  testCases: {
    type: [testCaseSchema],
    default: [],
  },
  sampleTestCase: {
  type: [sampleTestCaseSchema], 
  required: false,
  default: [],
},
  tags: {
    type: [String],
    default: [],
  },
  descriptionFileKey: {
    type: String,
    required: true,
  },
}, {
  timestamps: true
});

export default mongoose.model('Question', QuestionSchema);
