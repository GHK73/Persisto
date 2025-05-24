import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
    questionId:{
        type: String,
        required: true,
        unique: true
    },
    title:{
        type: String,
        required: true
    },
    difficulty:{
        type: String,
        enum: ['easy', 'medium', 'hard'],
        required: true
    },
    directoryPath:{
        type: String,
        required: true
    },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to User model
    required: true,
  }
});

const Question = mongoose.model('Question',QuestionSchema);
export default Question;