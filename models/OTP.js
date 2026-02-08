import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  // Optional: auto-delete the record when it expires
  createdAt: { type: Date, default: Date.now, expires: 600 } 
});

const OTP = mongoose.model('OTP', otpSchema);
export default OTP;