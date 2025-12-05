// generateOTP() = To generate OTP

const OTP = require('../models/otp');

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP in MongoDB (valid for 10 minutes)
const storeOTP = async (email, otp) => {
    try {
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
        
        // Update existing OTP or create new one
        const result = await OTP.findOneAndUpdate(
            { email: email.toLowerCase() },
            { 
                email: email.toLowerCase(),
                otp: otp,
                expiresAt: expiresAt
            },
            { upsert: true, new: true }
        );
    
        console.log(`OTP stored in database for ${email}:`, otp);
        return { success: true, result };
    } catch (error) {
        console.error("Error storing OTP in database:", error);
        return { success: false, error: error.message };
    }
};

// Verify OTP from MongoDB
const verifyOTP = async (email, otp) => {
    try {
        const stored = await OTP.findOne({ email: email.toLowerCase() });
        
        if (!stored) {
            return { valid: false, message: "OTP has expired. Please request a new one." };
        }
        
        // Check if OTP has expired
        if (new Date() > stored.expiresAt) {
            await OTP.deleteOne({ email: email.toLowerCase() });
            return { valid: false, message: "OTP has expired. Please request a new one." };
        }
        
        // Check if OTP matches
        if (stored.otp !== otp) {
            return { valid: false, message: "Invalid OTP. Please try again." };
        }
        
        // OTP is valid, delete it from database
        await OTP.deleteOne({ email: email.toLowerCase() });
        console.log(`OTP verified and deleted for ${email}`);
        return { valid: true, message: "OTP verified successfully." };
    } catch (error) {
        console.error("Error verifying OTP:", error);
        return { valid: false, message: "Error verifying OTP. Please try again." };
    }
};

module.exports = {
    generateOTP,
    storeOTP,
    verifyOTP
};
