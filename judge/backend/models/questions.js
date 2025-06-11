import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema({
  inputFileKey: {
    type: String,
    required: true // S3 object key for input file
  },
  outputFileKey: {
    type: String,
    required: true // S3 object key for output file
  }
});

const QuestionSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  testCases: {
    type: [testCaseSchema],
    default: []
  },
  tags: {
    type: [String],
    default: []
  },
  descriptionFileKey: {
    type: String,
    required: true // S3 object key for description
  }
});

export default mongoose.model('Question', QuestionSchema);
