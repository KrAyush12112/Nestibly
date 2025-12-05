const { Resend } = require('resend');

// Initialize Resend with your API key from .env
const resend = new Resend(process.env.RESEND_API_KEY);

// Get domain from environment, fallback to example domain
const getFromEmail = () => {
    const domain = process.env.RESEND_DOMAIN;
    if (!domain) {
        console.warn('RESEND_DOMAIN not set in .env');
        return 'noreply@resend.dev'; // Fallback for testing
    }
    return `noreply@${domain}`;
};

// Send OTP email via Resend
const sendOTPEmail = async (email, otp, fullName) => {
    try {
        // Send with exact variable names expected by Resend template
        const response = await resend.emails.send({
            from: getFromEmail(),
            to: email,
            subject: 'Verify Your Nestibly Account - OTP',
            template: {
                id: 'verify-email',
                variables: {
                    USER_NAME: fullName.trim(),
                    OTP_CODE: otp,
                    EXPIRE_IN: 10
                }
            }
        });
    
        console.log('OTP email sent successfully:', response);
        return { success: true, messageId: response.id };
    } catch (error) {
        console.error('Error sending OTP email via template:', error);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        
        // Fallback: send plain HTML email if template fails
        try {
            console.log('Attempting fallback: sending plain HTML email...');
            const htmlFallback = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #333;">Hi ${fullName},</h2>
                    <p style="color: #666; font-size: 16px;">Your One-Time Password (OTP) has been generated successfully. Please use the code below to complete your verification:</p>
                    
                    <p style="color: #666; font-size: 14px;"><strong>Your One-Time Password (OTP) is:</strong></p>
                    
                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #007bff; font-size: 48px; letter-spacing: 5px; margin: 0;">${otp}</h1>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                        This code is valid for the next <strong>10 minutes</strong>.
                    </p>
                    
                    <p style="color: #e74c3c; font-size: 14px;">
                        ⚠️ For security, please do not share this code with anyone.
                    </p>
                    
                    <p style="color: #666; font-size: 14px;">
                        If you did not request this OTP, you can safely ignore this email.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        Nestibly | Security and Verification Team<br>
                        © 2025 Nestibly. All rights reserved.
                    </p>
                </div>
            `;
            
            const fallbackResponse = await resend.emails.send({
                from: getFromEmail(),
                to: email,
                subject: 'Verify Your Nestibly Account - OTP',
                html: htmlFallback
            });
            
            console.log('Fallback HTML email sent successfully:', fallbackResponse);
            return { success: true, messageId: fallbackResponse.id, method: 'html_fallback' };
        } catch (fallbackError) {
            console.error('Fallback HTML email also failed:', fallbackError);
            return { success: false, error: error.message };
        }
    }
};

module.exports = {
    sendOTPEmail
};
