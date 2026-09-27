import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api";

function Verification() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(location.state?.user || null);
  const [checkingAuth, setCheckingAuth] = useState(!location.state?.user);

  const [method, setMethod] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Check pending 2FA login session
  useEffect(() => {
    const fetchPendingUser = async () => {
      try {
        const response = await api.get("/auth/pending-user");
        setUser(response.data.user);
      } catch (err) {
        console.error("No active pending 2FA login:", err);
        navigate("/login");
      } finally {
        setCheckingAuth(false);
      }
    };

    if (!user) {
      fetchPendingUser();
    }
  }, [user, navigate]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const maskEmail = (emailStr) => {
    if (!emailStr) return "";
    const [local, domain] = emailStr.split("@");
    if (!domain) return emailStr;
    const masked =
      local.length <= 2
        ? local[0] + "***"
        : local[0] + "***" + local[local.length - 1];
    return `${masked}@${domain}`;
  };

  const maskPhone = (phoneStr) => {
    if (!phoneStr) return "";
    const str = phoneStr.trim();
    if (str.length <= 4) return str;
    const last4 = str.slice(-4);
    return `******${last4}`;
  };

  // Send OTP
  const sendOtp = async (selectedMethod) => {
    setMethod(selectedMethod);
    setError("");
    setMessage("");
    setOtp("");
    setLoading(true);

    try {
      const endpoint =
        selectedMethod === "email"
          ? "/auth/send-email-otp"
          : "/auth/send-phone-otp";

      const response = await api.post(endpoint);

      setOtpSent(true);
      setMessage(response.data.message || "OTP sent successfully.");
      setResendCooldown(30);
    } catch (err) {
      console.error("Send OTP error:", err);
      setError(
        err.response?.data?.message ||
          "Unable to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Verify entered OTP -> Only on success redirect to Profile
  const verifyOtp = async (e) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const endpoint =
        method === "email"
          ? "/auth/verify-email-otp"
          : "/auth/verify-phone-otp";

      const response = await api.post(endpoint, {
        otp,
      });

      // Clear temp token from storage
      sessionStorage.removeItem("trulyias_temp_token");

      setMessage(response.data.message || "OTP verified! Opening profile...");

      // Redirect to profile page only on correct OTP verification
      setTimeout(() => {
        navigate("/profile");
      }, 500);
    } catch (err) {
      console.error("Verify OTP error:", err);
      setError(
        err.response?.data?.message ||
          "Invalid or expired OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div className="brand-logo" style={{ margin: "0 auto 20px" }}>T</div>
          <p>Verifying login session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand-section">
          <div className="brand-logo">T</div>
          <h1>Two-Step Login Verification</h1>
          <p>
            {user?.name ? `Welcome, ${user.name}! ` : ""}
            Please verify your identity using OTP to complete login.
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {message && (
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
            ✓ {message}
          </div>
        )}

        {!otpSent ? (
          <div>
            <p
              style={{
                fontSize: "14px",
                color: "#4b5563",
                marginBottom: "16px",
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              Choose where to receive your one-time verification code:
            </p>

            {/* Option 1: Phone OTP */}
            <button
              type="button"
              className="verification-option"
              onClick={() => sendOtp("phone")}
              disabled={loading || !user?.phone}
              style={{
                opacity: !user?.phone ? 0.6 : 1,
                cursor: !user?.phone ? "not-allowed" : "pointer",
              }}
            >
              <span className="verification-icon">📱</span>
              <div>
                <strong>Phone OTP</strong>
                <p>
                  {user?.phone
                    ? `Send OTP to ${maskPhone(user.phone)}`
                    : "No phone registered on this account (use Email OTP)"}
                </p>
              </div>
            </button>

            {/* Option 2: Email OTP */}
            <button
              type="button"
              className="verification-option"
              onClick={() => sendOtp("email")}
              disabled={loading}
            >
              <span className="verification-icon">📧</span>
              <div>
                <strong>Email OTP</strong>
                <p>
                  Send OTP to {user?.email ? maskEmail(user.email) : "your email"}
                </p>
              </div>
            </button>

            <p className="switch-text" style={{ marginTop: "20px" }}>
              <Link to="/login">← Cancel and Back to Login</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={verifyOtp}>
            <div className="selected-method">
              {method === "email"
                ? `📧 OTP sent to ${maskEmail(user?.email)}`
                : `📱 OTP sent to ${maskPhone(user?.phone)}`}
            </div>

            <div className="input-group">
              <label htmlFor="otp-input">Enter 6-Digit OTP</label>
              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="• • • • • •"
                maxLength="6"
                style={{
                  fontSize: "24px",
                  letterSpacing: "8px",
                  textAlign: "center",
                  fontWeight: "bold",
                }}
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              className="primary-btn"
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Verifying OTP..." : "Verify & Open Profile"}
            </button>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "16px",
              }}
            >
              <button
                type="button"
                className="resend-button"
                onClick={() => sendOtp(method)}
                disabled={loading || resendCooldown > 0}
                style={{
                  margin: 0,
                  textAlign: "left",
                  opacity: resendCooldown > 0 ? 0.6 : 1,
                  cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
                }}
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend OTP"}
              </button>

              <button
                type="button"
                className="change-method"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                  setError("");
                  setMessage("");
                }}
                style={{ margin: 0, textAlign: "right" }}
              >
                Choose other method
              </button>
            </div>

            <p className="switch-text" style={{ marginTop: "25px" }}>
              <Link to="/login">← Cancel and Back to Login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default Verification;