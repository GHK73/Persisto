import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionId: { type: String, required: true },
  language: { type: String, default: 'cpp' },
  code: { type: String, required: true },
  codeFileKey: { type: String, required: true }, 
  passed: { type: Boolean, required: true },
  failedCases: [String], 
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Submission', submissionSchema);
