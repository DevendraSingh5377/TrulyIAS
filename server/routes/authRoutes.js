
const express = require("express");

const {
  register,
  login,
  googleLogin,
  sendEmailOtp,
  verifyEmailOtp,
  sendPhoneOtp,
  verifyPhoneOtp,
  getMe,
  logout,
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Register
router.post("/register", register);

// Login
router.post("/login", login);
router.post("/google", googleLogin);
// Email OTP
router.post("/send-email-otp", protect, sendEmailOtp);

router.post("/verify-email-otp", protect, verifyEmailOtp);

// Phone/SMS OTP
router.post("/send-phone-otp", protect, sendPhoneOtp);

router.post("/verify-phone-otp", protect, verifyPhoneOtp);

// Current logged-in user
router.get("/me", protect, getMe);

// Logout
router.post("/logout", logout);


module.exports = router;

