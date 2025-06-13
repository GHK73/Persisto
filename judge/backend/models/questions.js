import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema({
  inputFileKey: {
    type: String,
    required: true, // S3 key
  },
  outputFileKey: {
    type: String,
    required: true, // S3 key
  }
});

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
  tags: {
    type: [String],
    default: [],
  },
  descriptionFileKey: {
    type: String,
    required: true, // Used to fetch from S3
  },
  descriptionFile: {
    type: String, // Original file name for reference
    required: false,
  }
});

export default mongoose.model('Question', QuestionSchema);
