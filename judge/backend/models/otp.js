import mongoose from 'mongoose';

const OtpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  purpose: { type: String, enum: ['signup', 'forgot_password'], required: true },
});

OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired OTP docs

const Otp = mongoose.model('Otp', OtpSchema);

export default Otp;
