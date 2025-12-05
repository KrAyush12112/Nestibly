// File: util/email_service.js (Resend SDK use karte hue)

const { Resend } = require('resend');
require('dotenv').config(); 

// 1. Resend API Key se client banana
// Key aapki .env file mein honi chahiye
const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendOTP = async (toEmail, otpCode) => {
    
    // Yahan FROM email woh hona chahiye jo aapne Resend mein verify kiya ho
    const htmlContent = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ccc; border-radius: 8px;">
            <h2 style="color: #007bff;">Nestibly OTP Verification</h2>
            <p>Aapka verification code yeh hai:</p>
            <h1 style="color: #28a745; font-size: 28px; background-color: #f0f0f0; padding: 10px; border-radius: 5px;">
                ${otpCode}
            </h1>
            <p>Yeh code 5 minute tak valid rahega. Ise kisi ke saath share na karein.</p>
        </div>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: 'Nestibly Verification <onboarding@resend.dev>', // Resend ka default ya verified domain
            to: [toEmail],
            subject: 'Nestibly: Your Verification Code',
            html: htmlContent,
        });

        if (error) {
            console.error('Resend OTP Error:', error);
            throw new Error(`Resend API failed: ${error.name}`);
        }
        
        console.log(`OTP sent to ${toEmail} successfully via Resend.`);
        return true;

    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error("Could not send verification email.");
    }
};