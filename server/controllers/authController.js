const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const generateOtp = require("../utils/generateOtp");
const sendSmsOtp = require("../utils/sendSmsOtp");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const tempCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 15 * 60 * 1000, // 15 mins for OTP verification
};

// ==========================================
// REGISTER
// ==========================================

const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please fill all required fields",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "An account with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone ? phone.trim() : null,
    });

    return res.status(201).json({
      message: "Registration successful! Please login to continue.",
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      message: "Registration failed. Please try again.",
    });
  }
};

// ==========================================
// LOGIN (Step 1: Verify Password -> Require OTP)
// ==========================================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!user.password) {
      return res.status(401).json({
        message: "This account uses Google Login. Please continue with Google.",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Generate temporary 2FA token (valid for 15 minutes)
    // Note: FULL auth session token is NOT issued here!
    const tempToken = jwt.sign(
      { userId: user._id, stage: "2fa_pending" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.cookie("temp_token", tempToken, tempCookieOptions);

    return res.status(200).json({
      message: "Password verified. Please select Email OTP or SMS OTP.",
      requiresOtp: true,
      tempToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Server error during login",
    });
  }
};

// ==========================================
// GET PENDING USER DETAILS (For Verification page)
// ==========================================

const getPendingUser = async (req, res) => {
  return res.status(200).json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
    },
  });
};

// ==========================================
// SEND EMAIL OTP (Step 2a)
// ==========================================

const sendEmailOtp = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Generate a fresh 6-digit OTP at every login
    const otp = generateOtp();

    user.emailOtp = otp;
    user.emailOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Your TrulyIAS Login OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; background: #f5f9ff;">
          <div style="background: white; padding: 30px; border-radius: 16px; text-align: center;">
            <h1 style="color: #2563eb;">TrulyIAS</h1>
            <h2>Login Verification Code</h2>
            <p>Hello ${user.name},</p>
            <p>Your one-time login OTP is:</p>
            <div style="font-size: 34px; font-weight: bold; letter-spacing: 8px; color: #2563eb; margin: 25px 0;">
              ${otp}
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p style="color: #999; font-size: 12px;">If you did not request this OTP, please contact support.</p>
          </div>
        </div>
      `,
    });

    console.log(`Email OTP sent to ${user.email}`);

    return res.status(200).json({
      message: "OTP sent to your email successfully",
    });
  } catch (error) {
    console.error("Send email OTP error:", error);
    return res.status(500).json({
      message: "Unable to send email OTP. Please try again.",
    });
  }
};

// ==========================================
// VERIFY EMAIL OTP (Step 2b -> Complete Login)
// ==========================================

const verifyEmailOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        message: "OTP is required",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.emailOtp || !user.emailOtpExpires) {
      return res.status(400).json({
        message: "No OTP was requested. Please request an OTP first.",
      });
    }

    if (user.emailOtpExpires < new Date()) {
      return res.status(400).json({
        message: "Email OTP has expired. Please request a new code.",
      });
    }

    if (user.emailOtp !== String(otp).trim()) {
      return res.status(400).json({
        message: "Invalid OTP. Please check the code and try again.",
      });
    }

    // Clear OTP fields
    user.emailOtp = null;
    user.emailOtpExpires = null;
    await user.save();

    // ISSUE FULL SESSION TOKEN ONLY AFTER SUCCESSFUL OTP VERIFICATION
    const token = generateToken(user._id);
    res.cookie("token", token, cookieOptions);
    res.clearCookie("temp_token", tempCookieOptions);

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        picture: user.picture || null,
      },
    });
  } catch (error) {
    console.error("Verify email OTP error:", error);
    return res.status(500).json({
      message: "Email OTP verification failed",
    });
  }
};

// ==========================================
// SEND PHONE OTP (Step 2c)
// ==========================================

const sendPhoneOtp = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.phone) {
      return res.status(400).json({
        message: "No phone number is registered with this account. Please use Email OTP.",
      });
    }

    // Generate a fresh 6-digit OTP at every login
    const otp = generateOtp();

    user.phoneOtp = otp;
    user.phoneOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendSmsOtp({
      phone: user.phone,
      otp,
    });

    console.log(`SMS OTP sent to ${user.phone}`);

    return res.status(200).json({
      message: "SMS OTP sent successfully",
    });
  } catch (error) {
    console.error("Send phone OTP error:", error);
    return res.status(500).json({
      message: "Unable to send SMS OTP. Please try again or use Email OTP.",
    });
  }
};

// ==========================================
// VERIFY PHONE OTP (Step 2d -> Complete Login)
// ==========================================

const verifyPhoneOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        message: "OTP is required",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.phoneOtp || !user.phoneOtpExpires) {
      return res.status(400).json({
        message: "No SMS OTP was requested. Please request an OTP first.",
      });
    }

    if (user.phoneOtpExpires < new Date()) {
      return res.status(400).json({
        message: "SMS OTP has expired. Please request a new code.",
      });
    }

    if (user.phoneOtp !== String(otp).trim()) {
      return res.status(400).json({
        message: "Invalid SMS OTP. Please check the code and try again.",
      });
    }

    // Clear OTP fields
    user.phoneOtp = null;
    user.phoneOtpExpires = null;
    await user.save();

    // ISSUE FULL SESSION TOKEN ONLY AFTER SUCCESSFUL OTP VERIFICATION
    const token = generateToken(user._id);
    res.cookie("token", token, cookieOptions);
    res.clearCookie("temp_token", tempCookieOptions);

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        picture: user.picture || null,
      },
    });
  } catch (error) {
    console.error("Verify phone OTP error:", error);
    return res.status(500).json({
      message: "SMS OTP verification failed",
    });
  }
};

// ==========================================
// GOOGLE LOGIN (Direct login to Profile - NO OTP)
// ==========================================

const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Google credential is required",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture, email_verified } = payload;

    if (!email || !email_verified) {
      return res.status(400).json({
        message: "Google email could not be verified",
      });
    }

    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.findOne({ email: email.toLowerCase() });
    }

    if (user) {
      if (!user.googleId) user.googleId = googleId;
      if (!user.name && name) user.name = name;
      if (picture) user.picture = picture;
      await user.save();
    } else {
      user = await User.create({
        name: name || "Google User",
        email: email.toLowerCase(),
        password: null,
        googleId,
        picture: picture || null,
      });
    }

    // Google Login DIRECTLY grants full session token - NO OTP required!
    const token = generateToken(user._id);
    res.cookie("token", token, cookieOptions);
    res.clearCookie("temp_token", tempCookieOptions);

    return res.status(200).json({
      message: "Google login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        picture: user.picture || picture || null,
      },
    });
  } catch (error) {
    console.error("Google login error:", error.message);
    return res.status(401).json({
      message: "Google authentication failed",
    });
  }
};

// ==========================================
// GET CURRENT USER PROFILE (Requires full auth token)
// ==========================================

const getMe = async (req, res) => {
  return res.status(200).json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      picture: req.user.picture || null,
      googleId: req.user.googleId,
      createdAt: req.user.createdAt,
    },
  });
};

// ==========================================
// UPDATE PROFILE
// ==========================================

const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (name && name.trim()) user.name = name.trim();
    if (phone !== undefined) user.phone = phone ? phone.trim() : null;

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        picture: user.picture || null,
        googleId: user.googleId,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      message: "Failed to update profile",
    });
  }
};

// ==========================================
// LOGOUT
// ==========================================

const logout = async (req, res) => {
  res.clearCookie("token", cookieOptions);
  res.clearCookie("temp_token", tempCookieOptions);

  return res.status(200).json({
    message: "Logged out successfully",
  });
};

module.exports = {
  register,
  login,
  getPendingUser,
  sendEmailOtp,
  verifyEmailOtp,
  sendPhoneOtp,
  verifyPhoneOtp,
  googleLogin,
  getMe,
  updateProfile,
  logout,
};
