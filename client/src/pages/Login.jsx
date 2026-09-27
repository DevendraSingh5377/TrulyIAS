import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

function Login() {
  const googleButtonRef = useRef(null);
  const handleGoogleLogin = async (response) => {
  setError("");
  setLoading(true);

  try {
    const result = await api.post("/auth/google", {
      credential: response.credential,
    });

    const user = result.data.user;

 
const handleGoogleLogin = async (response) => {
  setError("");
  setLoading(true);

  try {
    const result = await api.post("/auth/google", {
      credential: response.credential,
    });

    // Google login is successful
    // Directly go to profile
    navigate("/profile");
  } catch (error) {
    console.error("Google login error:", error);

    setError(
      error.response?.data?.message ||
        "Google login failed. Please try again."
    );
  } finally {
    setLoading(false);
  }
};


  } catch (error) {
    console.error("Google login error:", error);

    setError(
      error.response?.data?.message ||
        "Google login failed. Please try again."
    );
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  const clientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID;

  console.log("Google Client ID:", clientId);

  if (!clientId) {
    console.error(
      "Google Client ID is missing. Check client/.env"
    );
    return;
  }

  const initializeGoogle = () => {
    if (
      window.google &&
      googleButtonRef.current
    ) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleLogin,
      });

      window.google.accounts.id.renderButton(
        googleButtonRef.current,
        {
          theme: "outline",
          size: "large",
          width: 350,
          text: "continue_with",
          shape: "rectangular",
        }
      );
    }
  };

  if (window.google) {
    initializeGoogle();
  } else {
    window.addEventListener(
      "load",
      initializeGoogle
    );
  }

  return () => {
    window.removeEventListener(
      "load",
      initializeGoogle
    );
  };
}, []);


  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const user = response.data.user;

   js
const sendEmailOtp = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Generate a fresh OTP every time
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


    } catch (error) {
      console.error("Login error:", error);

      setError(
        error.response?.data?.message ||
          "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="logo-box">
          T
        </div>

        <h1>Welcome Back</h1>

        <p className="auth-subtitle">
          Login to continue to TrulyIAS
        </p>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>

          <div className="input-group">
            <label>Email</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="forgot-password">
            <Link to="/forgot-password">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            className="primary-btn"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        <div className="divider">
          <span>OR</span>
        </div>

     <div
  ref={googleButtonRef}
  className="google-login-container"
></div>

        <p className="bottom-text">
          Don't have an account?{" "}
          <Link to="/register">
            Create Account
          </Link>
        </p>

      </div>
    </div>
  );
}

export default Login;

