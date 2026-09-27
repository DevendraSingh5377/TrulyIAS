
const User = require("../models/User"); 
const bcrypt = require("bcryptjs"); 
 
const generateOtp = require("../utils/generateOtp"); 
const sendSmsOtp = require("../utils/sendSmsOtp"); 
const generateToken = require("../utils/generateToken"); 
const sendEmail = require("../utils/sendEmail"); 
const { OAuth2Client } = require("google-auth-library"); 

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

const cookieOptions = { 
  httpOnly: true, 
  secure: process.env.NODE_ENV === "production", 
  sameSite: 
    process.env.NODE_ENV === "production" ? "none" : "lax", 
  maxAge: 7 * 24 * 60 * 60 * 1000, 
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
 
    const user = await User.create({ 
      name: name.trim(), 
      email: normalizedEmail, 
      password: hashedPassword, 
      phone: phone ? phone.trim() : null, 
      isEmailVerified: false, 
      isPhoneVerified: false, 
    }); 
 
    // Generate email OTP 
    const otp = generateOtp(); 
 
    user.emailOtp = otp; 
    user.emailOtpExpires = new Date( 
      Date.now() + 10 * 60 * 1000 
    ); 
 
    await user.save(); 
 
    // Send email OTP 
    try { 
      await sendEmail({ 
        to: user.email, 
        subject: "Your TrulyIAS Email Verification OTP", 
        html: ` 
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; background: #f5f9ff;"> 
            <div style="background: white; padding: 30px; border-radius: 16px; text-align: center;"> 
               
              <h1 style="color: #2563eb;"> 
                TrulyIAS 
              </h1> 
 
              <h2> 
                Verify Your Email 
              </h2> 
 
              <p> 
                Hello ${user.name}, 
              </p> 
 
              <p> 
                Thank you for creating your TrulyIAS account. 
                Use the OTP below to verify your email address. 
              </p> 
 
              <div style="font-size: 34px; font-weight: bold; letter-spacing: 8px; color: #2563eb; margin: 25px 0;"> 
                ${otp} 
              </div> 
 
              <p> 
                This OTP will expire in 10 minutes. 
              </p> 
 
              <p style="color: #999; font-size: 12px;"> 
                If you did not create this account, you can ignore this email. 
              </p> 
 
            </div> 
          </div> 
        `, 
      }); 
    } catch (emailError) { 
      console.error( 
        "Registration email error:", 
        emailError 
      ); 
 
      await User.findByIdAndDelete(user._id); 
 
      return res.status(500).json({ 
        message: 
          "Account could not be created because the verification email could not be sent.", 
      }); 
    } 
 
    // Create JWT login session 
    const token = generateToken(user._id); 
 
    res.cookie("token", token, cookieOptions); 
 
    return res.status(201).json({ 
      message: 
        "Registration successful. A verification OTP has been sent to your email.", 
 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        phone: user.phone, 
        isEmailVerified: user.isEmailVerified, 
        isPhoneVerified: user.isPhoneVerified, 
      }, 
    }); 
  } catch (error) { 
    console.error("Register error:", error); 
 
    return res.status(500).json({ 
      message: "Registration failed. Please try again.", 
    }); 
  } 
}; 
 
// ========================================== 
// LOGIN 
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
        message: 
          "This account uses Google Login. Please continue with Google.", 
      }); 
    } 
 
    const passwordMatch = await bcrypt.compare( 
      password, 
      user.password 
    ); 
 
    if (!passwordMatch) { 
      return res.status(401).json({ 
        message: "Invalid email or password", 
      }); 
    } 
 
    const token = generateToken(user._id); 
 
    res.cookie("token", token, cookieOptions); 
 
    return res.status(200).json({ 
      message: "Login successful", 
 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        phone: user.phone, 
        isEmailVerified: user.isEmailVerified, 
        isPhoneVerified: user.isPhoneVerified, 
      }, 
    }); 
  } catch (error) { 
    console.error("Login error:", error); 
 
    return res.status(500).json({ 
      message: "Server error", 
    }); 
  } 
}; 
 
// ========================================== 
// SEND EMAIL OTP 
// ========================================== 
 
const sendEmailOtp = async (req, res) => { 
  try { 
    const user = await User.findById(req.user._id); 
 
    if (!user) { 
      return res.status(404).json({ 
        message: "User not found", 
      }); 
    } 
 
    if (user.isEmailVerified) { 
      return res.status(400).json({ 
        message: "Email is already verified", 
      }); 
    } 
 
    const otp = generateOtp(); 
 
    user.emailOtp = otp; 
    user.emailOtpExpires = new Date( 
      Date.now() + 10 * 60 * 1000 
    ); 
 
    await user.save(); 
 
    await sendEmail({ 
      to: user.email, 
      subject: "Your TrulyIAS Email Verification OTP", 
      html: ` 
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; background: #f5f9ff;"> 
          <div style="background: white; padding: 30px; border-radius: 16px; text-align: center;"> 
             
            <h1 style="color: #2563eb;"> 
              TrulyIAS 
            </h1> 
 
            <h2> 
              Email Verification 
            </h2> 
 
            <p> 
              Hello ${user.name}, 
            </p> 
 
            <p> 
              Your verification OTP is: 
            </p> 
 
            <div style="font-size: 34px; font-weight: bold; letter-spacing: 8px; color: #2563eb; margin: 25px 0;"> 
              ${otp} 
            </div> 
 
            <p> 
              This OTP will expire in 10 minutes. 
            </p> 
 
          </div> 
        </div> 
      `, 
    }); 
 
    return res.status(200).json({ 
      message: "Email OTP sent successfully", 
    }); 
  } catch (error) { 
    console.error( 
      "Send email OTP error:", 
      error 
    ); 
 
    return res.status(500).json({ 
      message: "Unable to send email OTP", 
    }); 
  } 
}; 
 
// ========================================== 
// VERIFY EMAIL OTP 
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
        message: "No email OTP was requested", 
      }); 
    } 
 
    if (user.emailOtpExpires < new Date()) { 
      return res.status(400).json({ 
        message: "Email OTP has expired", 
      }); 
    } 
 
    if (user.emailOtp !== otp.trim()) { 
      return res.status(400).json({ 
        message: "Invalid email OTP", 
      }); 
    } 
 
    user.isEmailVerified = true; 
    user.emailOtp = null; 
    user.emailOtpExpires = null; 
 
    await user.save(); 
 
    return res.status(200).json({ 
      message: "Email verified successfully", 
      isEmailVerified: true, 
    }); 
  } catch (error) { 
    console.error( 
      "Verify email OTP error:", 
      error 
    ); 
 
    return res.status(500).json({ 
      message: "Email verification failed", 
    }); 
  } 
}; 
 
// ========================================== 
// SEND PHONE OTP 
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
        message: "No phone number is registered", 
      }); 
    } 
 
    if (user.isPhoneVerified) { 
      return res.status(400).json({ 
        message: "Phone number is already verified", 
      }); 
    } 
 
    const otp = generateOtp(); 
 
    user.phoneOtp = otp; 
    user.phoneOtpExpires = new Date( 
      Date.now() + 10 * 60 * 1000 
    ); 
 
    await user.save(); 
 
    await sendSmsOtp({ 
      phone: user.phone, 
      otp, 
    }); 
 
    return res.status(200).json({ 
      message: "SMS OTP sent successfully", 
    }); 
  } catch (error) { 
    console.error( 
      "Send phone OTP error:", 
      error 
    ); 
 
    return res.status(500).json({ 
      message: "Unable to send SMS OTP", 
    }); 
  } 
}; 
 
// ========================================== 
// VERIFY PHONE OTP 
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
        message: "No SMS OTP was requested", 
      }); 
    } 
 
    if (user.phoneOtpExpires < new Date()) { 
      return res.status(400).json({ 
        message: "SMS OTP has expired", 
      }); 
    } 
 
    if (user.phoneOtp !== otp.trim()) { 
      return res.status(400).json({ 
        message: "Invalid SMS OTP", 
      }); 
    } 
 
    user.isPhoneVerified = true; 
    user.phoneOtp = null; 
    user.phoneOtpExpires = null; 
 
    await user.save(); 
 
    return res.status(200).json({ 
      message: "Phone number verified successfully", 
      isPhoneVerified: true, 
    }); 
  } catch (error) { 
    console.error( 
      "Verify phone OTP error:", 
      error 
    ); 
 
    return res.status(500).json({ 
      message: "Phone verification failed", 
    }); 
  } 
}; 
 
// ========================================== 
// GET CURRENT USER 
// ========================================== 
 
const getMe = async (req, res) => { 
  return res.status(200).json({ 
    user: { 
      id: req.user._id, 
      name: req.user.name, 
      email: req.user.email, 
      phone: req.user.phone, 
      isEmailVerified: req.user.isEmailVerified, 
      isPhoneVerified: req.user.isPhoneVerified, 
      googleId: req.user.googleId, 
    }, 
  }); 
}; 
 
// ========================================== 
// LOGOUT 
// ========================================== 
 
const logout = async (req, res) => { 
  res.clearCookie("token", { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === "production", 
    sameSite: 
      process.env.NODE_ENV === "production" 
        ? "none" 
        : "lax", 
  }); 
 
  return res.status(200).json({ 
    message: "Logged out successfully", 
  }); 
}; 
 

const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Google credential is required",
      });
    }

    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const {
      sub: googleId,
      email,
      name,
      picture,
      email_verified,
    } = payload;

    if (!email || !email_verified) {
      return res.status(400).json({
        message: "Google email could not be verified",
      });
    }

    // Check if Google account already exists
    let user = await User.findOne({ googleId });

    // If not found, check whether email already exists
    if (!user) {
      user = await User.findOne({ email: email.toLowerCase() });
    }

    // Existing user
    if (user) {
      // Connect Google account to existing account
      if (!user.googleId) {
        user.googleId = googleId;
      }

      // Google has already verified the email
      user.isEmailVerified = true;

      // Update name if missing
      if (!user.name && name) {
        user.name = name;
      }

      await user.save();
    } else {
      // Create new Google user
      user = await User.create({
        name: name || "Google User",
        email: email.toLowerCase(),
        password: null,
        googleId,
        isEmailVerified: true,
        isPhoneVerified: false,
      });
    }

    // Generate TrulyIAS JWT
    const token = generateToken(user._id);

    // Store JWT in HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production"
          ? "none"
          : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Google login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: picture || null,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
      },
    });
  } catch (error) {
    console.error(
      "Google login error:",
      error.message
    );

    return res.status(401).json({
      message: "Google authentication failed",
    });
  }
};



// ========================================== 
// EXPORT 
// ========================================== 
 
module.exports = { 
  register, 
  login, 
  sendEmailOtp, 
  verifyEmailOtp, 
  sendPhoneOtp, 
  verifyPhoneOtp, 
  getMe, 
  logout, 
  googleLogin
}; 
 
