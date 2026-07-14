const User = require("../models/User");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");


// mail auth
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

const passwordResetCodes = new Map();
const RESET_CODE_TTL_MS = 10 * 60 * 1000;
const RESET_CODE_RESEND_MS = 60 * 1000;

function getPasswordResetEmail(code) {
  return {
    subject: "Your InterviewTracker password reset code",
    text: `Your password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="color:#6c63ff">Reset your InterviewTracker password</h2>
        <p>Use this verification code to continue:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:8px">${code}</p>
        <p>This code expires in 10 minutes. If you did not request a reset, you can safely ignore this email.</p>
      </div>
    `,
  };
}

exports.contactForm = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    await transporter.sendMail({
      from: `"Smart Interview Tracker" <${process.env.GMAIL_USER}>`,
      replyTo: email,
      to: process.env.GMAIL_USER,
      subject: `[Contact Form] ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    });
    res.json({ message: "Message sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send email" });
  }
};

exports.registerUser = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
    const existingUser = await User.findByEmail(email);

    if (existingUser.length > 0) {
      return res.json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await User.create(name, phone, email, hashedPassword);

    const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? null : "super_secret_interview_tracker_key_2026");
    if (!secret) {
      return res.status(500).json({ success: false, message: "Internal server security error." });
    }

    const token = jwt.sign(
      { userId: result.insertId },
      secret,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Account Created Successfully",
      token,
      user: {
        id: result.insertId,
        name,
        email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = await User.findByEmail(email);

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User Not Found" });
    }

    const match = await bcrypt.compare(password, users[0].password);

    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid Password" });
    }

    const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? null : "super_secret_interview_tracker_key_2026");
    if (!secret) {
      return res.status(500).json({ success: false, message: "Internal server security error." });
    }

    const token = jwt.sign(
      { userId: users[0].id },
      secret,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login Successful",
      token,
      user: {
        id: users[0].id,
        name: users[0].name,
        email: users[0].email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const users = await User.findByEmail(email);

    if (users.length === 0) {
      return res.json({
        success: true,
        message: "If an account uses that email, a reset code has been sent.",
      });
    }

    const existingReset = passwordResetCodes.get(email);
    if (existingReset && Date.now() - existingReset.sentAt < RESET_CODE_RESEND_MS) {
      return res.status(429).json({
        success: false,
        message: "Please wait a minute before requesting another code.",
      });
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const isMailConfigured = Boolean(process.env.GMAIL_USER && process.env.GMAIL_PASS);

    if (isMailConfigured) {
      const resetEmail = getPasswordResetEmail(code);
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: email,
        ...resetEmail,
      });
    } else if (process.env.NODE_ENV === "production") {
      throw new Error("Password reset email is not configured.");
    } else {
      console.log(`[development] Password reset code for ${email}: ${code}`);
    }

    passwordResetCodes.set(email, {
      codeHash,
      expiresAt: Date.now() + RESET_CODE_TTL_MS,
      sentAt: Date.now(),
      attempts: 0,
    });

    res.json({
      success: true,
      message: isMailConfigured
        ? "A reset code has been sent to your email."
        : "Development reset code generated.",
      ...(isMailConfigured ? {} : { devCode: code }),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to send a reset code right now. Please try again.",
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const code = String(req.body.code || "").trim();
    const newPassword = String(req.body.newPassword || "");
    const pendingReset = passwordResetCodes.get(email);

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Your new password must be at least 8 characters.",
      });
    }

    if (!pendingReset || Date.now() > pendingReset.expiresAt) {
      passwordResetCodes.delete(email);
      return res.status(400).json({
        success: false,
        message: "This reset code is invalid or has expired.",
      });
    }

    if (pendingReset.attempts >= 5) {
      passwordResetCodes.delete(email);
      return res.status(429).json({
        success: false,
        message: "Too many attempts. Please request a new code.",
      });
    }

    const isCodeValid = await bcrypt.compare(code, pendingReset.codeHash);
    if (!isCodeValid) {
      pendingReset.attempts += 1;
      return res.status(400).json({
        success: false,
        message: "The verification code is incorrect.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await User.updatePassword(hashedPassword, email);

    passwordResetCodes.delete(email);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
    }

    res.json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to reset your password right now. Please try again.",
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    const users = await User.findById(userId);

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, users[0].password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.updatePasswordById(hashed, userId);

    res.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    const users = await User.findById(userId);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const isMatch = await bcrypt.compare(password, users[0].password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password." });
    }

    const Interview = require("../models/Interview");
    await Interview.deleteAccountCascade(userId);
    await User.deleteById(userId);

    res.json({ success: true, message: "Account deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const rows = await User.getProfile(userId);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const host = req.get("host");
    const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;

    res.json({
      success: true,
      name: rows[0].name,
      email: rows[0].email,
      phone: rows[0].phoneNo,
      college: rows[0].college || "",
      branch: rows[0].branch || "",
      graduationYear: rows[0].graduation_year || "",
      preferredRole: rows[0].preferred_role || "",
      expectedPackage: rows[0].expected_package || "",
      preferredLocation: rows[0].preferred_location || "",
      workType: rows[0].work_type || "",
      profilePic: rows[0].profile_photo
        ? (rows[0].profile_photo.startsWith("data:") || rows[0].profile_photo.startsWith("http")
            ? rows[0].profile_photo
            : `${baseUrl}/uploads/profile/${rows[0].profile_photo}`)
        : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    await User.updateProfile(userId, req.body);
    res.json({ success: true, message: "Profile updated successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
