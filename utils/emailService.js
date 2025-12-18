import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

console.log("DEBUG: Email User is:", process.env.EMAIL_USER);
console.log("DEBUG: Email Pass length:", process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : "0");

const transporter = nodemailer.createTransport({
    service: 'gmail', // Or your SMTP host
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Use App Password if using Gmail
    }
});

export const sendOtpEmail = async (email, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your Login OTP',
        text: `Your verification code is: ${otp}. It expires in 5 minutes.`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 OTP sent to ${email}`);
        return true;
    } catch (error) {
        console.error("❌ Email Error:", error);
        return false;
    }
};