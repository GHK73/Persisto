import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionId: { type: String, required: true },
  language: { type: String, default: 'cpp' },
  code: { type: String, required: true },
  codeFileKey: { type: String, required: true }, 
  passed: { type: Boolean, required: true },
  status: {
    type: String,
    enum: [
      'accepted',
      'wrong_answer',
      'time_limit_exceeded',
      'memory_limit_exceeded',
      'runtime_error',
      'output_limit_exceeded',
      'compile_error',
    ],
    default: 'wrong_answer',
    required: true,
  },
  failedCases: [String], 
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Submission', submissionSchema);
