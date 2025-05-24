import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendOtpEmail = async (email, otp, purpose) => {
  const subject = purpose === 'signup' ? 'Your signup OTP Code' : 'Your password reset OTP code';
  const text = `Your OTP code is: ${otp}. It is valid for 10 minutes.`;

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${email}`);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
};
