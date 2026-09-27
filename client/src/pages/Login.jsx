import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

function Login() {
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  // Handle standard email/password login: step 1 -> proceed to OTP verification
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      // Save temporary 2FA token for OTP verification
      if (response.data.tempToken) {
        sessionStorage.setItem("trulyias_temp_token", response.data.tempToken);
      }

      // Navigate to OTP selection screen
      navigate("/verification", { state: { user: response.data.user } });
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.message ||
          "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Login: Google verifies ID directly -> NO OTP needed, straight to profile
  const handleGoogleLogin = async (response) => {
    setError("");
    setGoogleLoading(true);

    try {
      await api.post("/auth/google", {
        credential: response.credential,
      });

      // Clear any pending temp tokens
      sessionStorage.removeItem("trulyias_temp_token");

      // Directly open profile page on selecting Google ID
      navigate("/profile");
    } catch (err) {
      console.error("Google login error:", err);
      setError(
        err.response?.data?.message ||
          "Google login failed. Please try again."
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  // Initialize Google Sign-In button
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      console.warn("Google Client ID is missing. Check client/.env");
      return;
    }

    let intervalId = null;

    const renderGoogleButton = () => {
      if (window.google?.accounts?.id && googleButtonRef.current) {
        googleButtonRef.current.innerHTML = "";

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleLogin,
        });

        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          width: 350,
          text: "continue_with",
          shape: "rectangular",
        });

        return true;
      }
      return false;
    };

    if (!renderGoogleButton()) {
      intervalId = setInterval(() => {
        if (renderGoogleButton()) {
          clearInterval(intervalId);
        }
      }, 300);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand-section">
          <div className="brand-logo">T</div>
          <h1>Welcome Back</h1>
          <p>Login to continue to TrulyIAS</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {googleLoading && (
          <div className="selected-method">
            Signing in with Google... Redirecting to Profile...
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="forgot-password">
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>

          <button
            type="submit"
            className="primary-btn"
            disabled={loading || googleLoading}
          >
            {loading ? "Verifying..." : "Login"}
          </button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <div
          ref={googleButtonRef}
          className="google-login-container"
          style={{ display: "flex", justifyContent: "center", minHeight: "44px" }}
        ></div>

        <p className="switch-text">
          Don't have an account?
          <Link to="/register">Create Account</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
