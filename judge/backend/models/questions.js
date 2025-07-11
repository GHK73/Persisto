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
  descriptionFile: {
    type: String,
  }
}, {
  timestamps: true
});

export default mongoose.model('Question', QuestionSchema);
