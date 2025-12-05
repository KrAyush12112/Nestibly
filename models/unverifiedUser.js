// models/Otp.js
import mongoose from "mongoose";

const unverifiedUserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userType: { type: String, enum: ['host', 'guest'], required: true , default: 'guest' },

  otpHash: { type: String, required: true },   // HMAC hash of OTP
  expiresAt: { type: Date, required: true },   // 5 min expiry
  attempts: { type: Number, default: 0 },      // max 5 attempts
  isUsed: { type: Boolean, default: false },   // one-time use
  createdAt: { type: Date, default: Date.now }
});

// Optional TTL index for auto-cleanup
unverifiedUserSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("UnverifiedUser", unverifiedUserSchema);
