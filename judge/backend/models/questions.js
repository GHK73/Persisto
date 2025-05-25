import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema({
  inputFile: {
    type: String,
    required: true
  },
  outputFile: {
    type: String,
    required: true
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
  directoryPath: {
    type: String,
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
  descriptionFile: {
    type: String,
    required: true 
  }
});

const Question = mongoose.model('Question', QuestionSchema);
export default Question;
