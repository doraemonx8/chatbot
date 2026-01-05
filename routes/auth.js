import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../utils/db.js';
import { sendOtpEmail } from '../utils/emailService.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

router.post('/send-otp', authLimiter, async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins from now

    try {
        // Store/Update OTP in DB
        await pool.query(
            `INSERT INTO otps (email, otp_code, expires_at) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE otp_code=?, expires_at=?`,
            [email, otp, expiresAt, otp, expiresAt]
        );

        // Send Email
        const emailSent = await sendOtpEmail(email, otp);
        if (!emailSent) throw new Error("Failed to send email");

        res.json({ message: "OTP sent successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP required" });

    try {
        // Check OTP
        const [rows] = await pool.query(
            "SELECT * FROM otps WHERE email = ? AND otp_code = ? AND expires_at > NOW()",
            [email, otp]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: "Invalid or expired OTP" });
        }

        // OTP Valid: Create/Get User
        await pool.query(
            "INSERT IGNORE INTO users (email) VALUES (?)", 
            [email]
        );

        // Generate JWT
        const token = jwt.sign(
            { email: email }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        // Cleanup used OTP
        await pool.query("DELETE FROM otps WHERE email = ?", [email]);

        res.json({ 
            message: "Login successful", 
            token: token,
            user: email 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Verification failed" });
    }
});

export default router;