import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";

function VerifyEmail() {
  const { token } = useParams();

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verify = async () => {
      try {
        const response = await api.get(
          `/auth/verify-email/${token}`
        );

        setStatus("success");
        setMessage(response.data.message);
      } catch (error) {
        setStatus("error");

        setMessage(
          error.response?.data?.message ||
          "Email verification failed."
        );
      }
    };

    verify();
  }, [token]);

  return (
    <div className="auth-page">

      <div className="auth-card">

        <div className="logo-box">
          T
        </div>

        {status === "loading" && (
          <>
            <h1>Verifying Email...</h1>

            <p className="auth-subtitle">
              Please wait while we verify your email.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <h1>Email Verified ✓</h1>

            <p className="auth-subtitle">
              {message}
            </p>

            <Link
              to="/profile"
              className="primary-btn"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              Go to Profile
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <h1>Verification Failed</h1>

            <p className="auth-subtitle">
              {message}
            </p>

            <Link
              to="/login"
              className="primary-btn"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              Back to Login
            </Link>
          </>
        )}

      </div>

    </div>
  );
}

export default VerifyEmail;