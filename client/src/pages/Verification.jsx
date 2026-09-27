import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

function Verification() {
  const navigate = useNavigate();

  const [method, setMethod] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
      setMessage(response.data.message);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

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

      setMessage(response.data.message);

      setTimeout(() => {
        navigate("/profile");
      }, 1000);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Invalid OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Verify Your Account</h1>

        <p className="auth-subtitle">
          Choose a verification method to continue.
        </p>

        {!otpSent ? (
          <>
            <button
              className="verification-option"
              onClick={() => sendOtp("email")}
              disabled={loading}
            >
              <span className="verification-icon">📧</span>

              <div>
                <strong>Email OTP</strong>
                <p>Receive a verification code on your email.</p>
              </div>
            </button>

            <button
              className="verification-option"
              onClick={() => sendOtp("phone")}
              disabled={loading}
            >
              <span className="verification-icon">📱</span>

              <div>
                <strong>SMS OTP</strong>
                <p>Receive a verification code on your mobile.</p>
              </div>
            </button>
          </>
        ) : (
          <form onSubmit={verifyOtp}>
            <div className="selected-method">
              {method === "email"
                ? "📧 Email OTP"
                : "📱 SMS OTP"}
            </div>

            <label>Enter OTP</label>

            <input
              type="text"
              value={otp}
              onChange={(e) =>
                setOtp(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6)
                )
              }
              placeholder="Enter 6-digit OTP"
              maxLength="6"
              required
            />

            <button
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify OTP"}
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
            >
              Choose another method
            </button>

            <button
              type="button"
              className="resend-button"
              onClick={() => sendOtp(method)}
              disabled={loading}
            >
              Resend OTP
            </button>
          </form>
        )}

        {message && (
          <p className="success-message">
            {message}
          </p>
        )}

        {error && (
          <p className="error-message">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default Verification;