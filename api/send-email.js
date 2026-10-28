const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://movymmlayggqzjtunlfk.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vdnltbWxheWdncXpqdHVubGZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNjY1MDYsImV4cCI6MjEwODc0MjUwNn0.wnYGxn8vr3EvMMVe__qeTrurkLmCP2-5UsqKA9y9tLw';

const EMAIL_USER = process.env.EMAIL_USER || 'melonoreply@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'wwxgmfabpwqmpcky';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action = 'send-otp', email, code } = req.body || {};

  // 1. Action: SEND OTP
  if (action === 'send-otp') {
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Invalidate existing unused OTPs for this email in Supabase
      try {
        await supabase
          .from('signup_otps')
          .update({ is_used: true })
          .eq('email', cleanEmail)
          .eq('is_used', false);
      } catch (_) {}

      // Store new OTP in Supabase
      const { error: dbError } = await supabase.from('signup_otps').insert({
        email: cleanEmail,
        code: generatedOtp,
        expires_at: expiresAt,
        is_used: false,
      });

      if (dbError) {
        console.error('Supabase DB error storing OTP:', dbError);
      }

      // Configure SMTP Transporter
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASS,
        },
      });

      // FaceTrack Black & White Aesthetic Email Template
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>FaceTrack (DTR) Verification Code</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
          <div style="max-width: 520px; margin: 40px auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 28px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);">
            
            <!-- Brand Header -->
            <div style="padding: 36px 32px 24px; text-align: center; border-bottom: 1px solid #f1f5f9;">
              <div style="display: inline-block; width: 52px; height: 52px; background-color: #000000; border-radius: 16px; margin-bottom: 16px; text-align: center; line-height: 52px;">
                <span style="color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: -1px; vertical-align: middle;">F</span>
              </div>
              <h1 style="margin: 0; color: #000000; font-size: 22px; font-weight: 900; letter-spacing: 0.5px;">FaceTrack (DTR)</h1>
              <p style="margin: 4px 0 0; color: #64748b; font-size: 13px; font-weight: 500;">Biometric Attendance & Personnel Security</p>
            </div>

            <!-- Main Body -->
            <div style="padding: 32px; text-align: center;">
              <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 18px; font-weight: 800;">Verify Your Account Access</h2>
              <p style="margin: 0 0 28px; color: #475569; font-size: 14px; line-height: 1.6;">
                Use the 6-digit verification code below to authorize your session and access the FaceTrack biometric portal:
              </p>

              <!-- OTP Code Display Card -->
              <div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 20px; padding: 22px 28px; margin: 0 auto 28px; display: inline-block;">
                <span style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #000000; display: block; margin-left: 10px;">
                  ${generatedOtp}
                </span>
              </div>

              <!-- Security Information -->
              <div style="background-color: #f1f5f9; border-radius: 16px; padding: 14px 18px; margin-bottom: 24px; text-align: left;">
                <p style="margin: 0; color: #334155; font-size: 12px; line-height: 1.5;">
                  <strong>Security Notice:</strong> This code is valid for <strong>10 minutes</strong>. Never share this code with anyone. FaceTrack support will never ask for your code.
                </p>
              </div>

              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                If you did not request this verification code, please ignore this email. Your account remains secure.
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 11px; font-weight: 500;">
                © 2026 FaceTrack (DTR) System. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: `"FaceTrack (DTR)" <${EMAIL_USER}>`,
        to: cleanEmail,
        subject: `Your FaceTrack Verification Code: ${generatedOtp}`,
        html: htmlContent,
        text: `Your FaceTrack (DTR) verification code is: ${generatedOtp}. It expires in 10 minutes.`,
      });

      console.log(`[FaceTrack] Verification code ${generatedOtp} sent to ${cleanEmail}`);
      return res.status(200).json({ success: true, message: 'Verification code sent successfully' });
    } catch (err) {
      console.error('Error sending FaceTrack OTP:', err);
      return res.status(500).json({ error: err.message || 'Failed to send verification email' });
    }
  }

  // 2. Action: VERIFY OTP
  if (action === 'verify-otp') {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();

    if (!cleanEmail || !cleanCode) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    try {
      const { data, error } = await supabase
        .from('signup_otps')
        .select('*')
        .eq('email', cleanEmail)
        .eq('code', cleanCode)
        .eq('is_used', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired verification code' });
      }

      const otpRecord = data[0];
      if (new Date(otpRecord.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Verification code has expired' });
      }

      // Mark used
      await supabase.from('signup_otps').update({ is_used: true }).eq('id', otpRecord.id);

      return res.status(200).json({ success: true, message: 'Code verified successfully' });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Failed to verify code' });
    }
  }

  return res.status(400).json({ error: 'Invalid action specified' });
};
