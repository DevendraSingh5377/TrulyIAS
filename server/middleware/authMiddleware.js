const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware for routes that require full login (e.g. /me, /profile, /logout)
const protect = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        message: "Not authenticated. Please log in.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // If token is only a pending 2FA token, block access to full profile
    if (decoded.stage === "2fa_pending") {
      return res.status(401).json({
        message: "Two-step verification required",
      });
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired session. Please log in again.",
    });
  }
};

// Middleware for OTP stage routes (/send-email-otp, /verify-email-otp, etc.)
// Accepts temp_token cookie, x-temp-token header, req.body.tempToken, or existing token
const protectPending = async (req, res, next) => {
  try {
    const token =
      req.cookies.temp_token ||
      req.headers["x-temp-token"] ||
      req.body.tempToken ||
      req.cookies.token;

    if (!token) {
      return res.status(401).json({
        message: "Login session expired. Please log in again.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Session expired or invalid. Please log in again.",
    });
  }
};

module.exports = {
  protect,
  protectPending,
};