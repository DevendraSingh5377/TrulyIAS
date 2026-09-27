const express = require("express");

const {
  register,
  login,
  getPendingUser,
  googleLogin,
  sendEmailOtp,
  verifyEmailOtp,
  sendPhoneOtp,
  verifyPhoneOtp,
  getMe,
  updateProfile,
  logout,
} = require("../controllers/authController");

const { protect, protectPending } = require("../middleware/authMiddleware");

const router = express.Router();

// Register
router.post("/register", register);

// Login (Step 1: password check -> tempToken)
router.post("/login", login);

// Google Login (Direct full login -> NO OTP)
router.post("/google", googleLogin);

// Get pending user for 2-step verification page
router.get("/pending-user", protectPending, getPendingUser);

// Email OTP (Step 2)
router.post("/send-email-otp", protectPending, sendEmailOtp);
router.post("/verify-email-otp", protectPending, verifyEmailOtp);

// Phone/SMS OTP (Step 2)
router.post("/send-phone-otp", protectPending, sendPhoneOtp);
router.post("/verify-phone-otp", protectPending, verifyPhoneOtp);

// Fully Authenticated User Profile
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);

// Logout
router.post("/logout", logout);

module.exports = router;
