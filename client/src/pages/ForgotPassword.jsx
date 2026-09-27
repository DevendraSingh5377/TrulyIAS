import { Link } from "react-router-dom";

function ForgotPassword() {
  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="logo-box">
          T
        </div>

        <h1>Forgot Password?</h1>

        <p className="auth-subtitle">
          Password recovery will be available here.
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

      </div>
    </div>
  );
}

export default ForgotPassword;