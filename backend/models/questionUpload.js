import mongoose from 'mongoose';

const uploadFileSchema = new mongoose.Schema({
  key: { type: String, required: true },
  size: { type: Number, required: true },
  contentType: { type: String, required: true },
}, { _id: false });

const uploadPairSchema = new mongoose.Schema({
  input: { type: uploadFileSchema, required: true },
  output: { type: uploadFileSchema, required: true },
}, { _id: false });

const questionUploadSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  questionId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
  },
  timeLimitSec: {
    type: Number,
    enum: [1, 2, 5],
    required: true,
  },
  memoryLimitMb: {
    type: Number,
    enum: [128, 256, 512, 1024],
    required: true,
  },
  tags: { type: [String], default: [] },
  description: { type: uploadFileSchema, required: true },
  testCases: { type: [uploadPairSchema], default: [] },
  sampleTestCases: { type: [uploadPairSchema], default: [] },
  status: {
    type: String,
    enum: ['pending', 'complete'],
    default: 'pending',
  },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

questionUploadSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('QuestionUpload', questionUploadSchema);
