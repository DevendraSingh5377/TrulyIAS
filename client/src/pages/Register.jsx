import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

function Register() {
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const response = await api.post("/auth/register", formData);
      setSuccessMsg(
        response.data.message ||
          "Registration successful! Redirecting to login..."
      );

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      console.error("Register error:", err);
      setError(
        err.response?.data?.message ||
          "Registration failed. Please check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In on Register -> directly open profile page (no OTP)
  const handleGoogleLogin = async (response) => {
    setError("");
    setGoogleLoading(true);

    try {
      await api.post("/auth/google", {
        credential: response.credential,
      });

      sessionStorage.removeItem("trulyias_temp_token");
      navigate("/profile");
    } catch (err) {
      console.error("Google sign-in error:", err);
      setError(
        err.response?.data?.message ||
          "Google registration failed. Please try again."
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

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
      <div className="auth-card register-card">
        <div className="brand-section">
          <div className="brand-logo">T</div>
          <h1>Create Account</h1>
          <p>Join TrulyIAS today</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {successMsg && (
          <div
            style={{
              background: "#ecfdf5",
              color: "#047857",
              padding: "12px 14px",
              borderRadius: "10px",
              marginBottom: "18px",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            ✓ {successMsg}
          </div>
        )}
        {googleLoading && (
          <div className="selected-method">
            Signing up with Google... Redirecting to Profile...
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label htmlFor="reg-name">Full Name</label>
            <input
              id="reg-name"
              type="text"
              name="name"
              placeholder="Enter your name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-email">Email Address</label>
            <input
              id="reg-email"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-phone">Phone Number (Optional)</label>
            <input
              id="reg-phone"
              type="tel"
              name="phone"
              placeholder="e.g. 9876543210"
              value={formData.phone}
              onChange={handleChange}
              autoComplete="tel"
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              name="password"
              placeholder="Create a password (min 6 characters)"
              value={formData.password}
              onChange={handleChange}
              minLength="6"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            className="primary-btn"
            disabled={loading || googleLoading}
          >
            {loading ? "Creating Account..." : "Create Account"}
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
          Already have an account?
          <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;