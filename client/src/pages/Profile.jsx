import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/auth/me");

        setUser(response.data.user);
      } catch (error) {
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error(error);
    }

    navigate("/login");
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-card">
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="profile-page">

      <nav className="profile-navbar">
        <div className="brand">
          TrulyIAS
        </div>

        <button
          className="logout-btn"
          onClick={handleLogout}
        >
          Logout
        </button>
      </nav>

      <div className="profile-card">

        <div className="profile-avatar">
          {user.name.charAt(0).toUpperCase()}
        </div>

        <h1>{user.name}</h1>

        <p className="profile-email">
          {user.email}
        </p>

        <div className="profile-info">

          <div className="info-row">
            <span>Name</span>
            <strong>{user.name}</strong>
          </div>

          <div className="info-row">
            <span>Email</span>
            <strong>{user.email}</strong>
          </div>

          <div className="info-row">
            <span>Phone</span>
            <strong>
              {user.phone || "Not added"}
            </strong>
          </div>

          <div className="info-row">
            <span>Email Verification</span>

            <strong>
              {user.isEmailVerified
                ? "✓ Verified"
                : "Pending"}
            </strong>
          </div>

          <div className="info-row">
            <span>Phone Verification</span>

            <strong>
              {user.isPhoneVerified
                ? "✓ Verified"
                : "Pending"}
            </strong>
          </div>

          <div className="info-row">
            <span>Google Account</span>

            <strong>
              {user.googleId
                ? "✓ Connected"
                : "Not Connected"}
            </strong>
          </div>

        </div>

      </div>

    </div>
  );
}

export default Profile;