import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/auth/me");
        setUser(response.data.user);
        setEditName(response.data.user.name || "");
        setEditPhone(response.data.user.phone || "");
      } catch (err) {
        console.error("Profile unauthorized or session expired:", err);
        // Not authenticated -> kick back to login
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      sessionStorage.removeItem("trulyias_temp_token");
      navigate("/login");
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveError("");
    setSaveMessage("");
    setSaveLoading(true);

    try {
      const response = await api.put("/auth/profile", {
        name: editName,
        phone: editPhone,
      });

      setUser(response.data.user);
      setSaveMessage("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      console.error("Update profile error:", err);
      setSaveError(
        err.response?.data?.message ||
          "Failed to update profile. Please try again."
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Recently";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Recently";
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div
          className="profile-container"
          style={{ textAlign: "center", paddingTop: "100px" }}
        >
          <div className="small-logo" style={{ margin: "0 auto 20px" }}>
            T
          </div>
          <p style={{ color: "#6b7280" }}>Loading candidate profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="profile-page">
      {/* Top Navigation */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="small-logo">T</div>
          <span>TrulyIAS</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "14px", color: "#4b5563" }}>
            Candidate: <strong>{user.name}</strong>
          </span>

          <button
            className="logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="profile-container">
        {/* Header Section */}
        <div className="welcome-section">
          <p className="welcome-small">CIVIL SERVICES ASPIRANT PORTAL</p>
          <h1>Candidate Profile</h1>
          <p>
            Welcome, {user.name}. Manage your credentials and UPSC examination details.
          </p>
        </div>

        {saveMessage && (
          <div
            style={{
              background: "#ecfdf5",
              color: "#047857",
              padding: "12px 16px",
              borderRadius: "10px",
              marginTop: "20px",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            ✓ {saveMessage}
          </div>
        )}

        {saveError && (
          <div
            style={{
              background: "#fee2e2",
              color: "#b91c1c",
              padding: "12px 16px",
              borderRadius: "10px",
              marginTop: "20px",
              fontSize: "14px",
            }}
          >
            {saveError}
          </div>
        )}

        {/* 2-Column Grid */}
        <div className="profile-grid">
          {/* Left Column: Avatar & Summary Card */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="profile-card profile-main">
              <div className="profile-avatar">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <span>{user.name?.charAt(0)?.toUpperCase() || "U"}</span>
                )}
              </div>

              <h2>{user.name}</h2>
              <p className="profile-role">UPSC CSE Aspirant</p>

              <div style={{ width: "100%", marginTop: "25px" }}>
                <div className="status-item">
                  <span>Sign-in Method</span>
                  <strong>
                    {user.googleId ? "Google Account" : "Email & Password"}
                  </strong>
                </div>

                <div className="status-item">
                  <span>Member Since</span>
                  <strong>{formatDate(user.createdAt)}</strong>
                </div>

                <div className="status-item">
                  <span>Account Status</span>
                  <span className="status verified">Active</span>
                </div>
              </div>
            </div>

            {/* Preparation Target Mini-Card */}
            <div className="profile-card">
              <h3>UPSC Target & Preparation</h3>
              <div className="profile-detail">
                <span>Target Exam</span>
                <strong>UPSC CSE 2027</strong>
              </div>
              <div className="profile-detail">
                <span>Course</span>
                <strong>GS Foundation & CSAT</strong>
              </div>
              <div className="profile-detail">
                <span>Study Streak</span>
                <strong>🔥 Day 1 - Active</strong>
              </div>
            </div>
          </div>

          {/* Right Column: Personal Details & Edit Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="profile-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <h3 style={{ margin: 0 }}>Candidate Information</h3>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setSaveError("");
                      setSaveMessage("");
                    }}
                    style={{
                      background: "#eff6ff",
                      color: "#2563eb",
                      border: "1px solid #bfdbfe",
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Edit Details
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    style={{
                      background: "#f3f4f6",
                      color: "#4b5563",
                      border: "none",
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleSaveProfile}>
                  <div className="input-group" style={{ marginBottom: "15px" }}>
                    <label style={{ fontSize: "13px", color: "#374151" }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group" style={{ marginBottom: "20px" }}>
                    <label style={{ fontSize: "13px", color: "#374151" }}>
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                    />
                  </div>

                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={saveLoading}
                    style={{ padding: "10px 20px", width: "auto" }}
                  >
                    {saveLoading ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              ) : (
                <>
                  <div className="profile-detail">
                    <span>Full Name</span>
                    <strong>{user.name}</strong>
                  </div>

                  <div className="profile-detail">
                    <span>Email Address</span>
                    <strong>{user.email}</strong>
                  </div>

                  <div className="profile-detail">
                    <span>Mobile Number</span>
                    <strong>{user.phone || "Not added yet"}</strong>
                  </div>

                  <div className="profile-detail">
                    <span>Google Link</span>
                    <strong>
                      {user.googleId ? "✓ Linked to Google" : "Not Linked"}
                    </strong>
                  </div>
                </>
              )}
            </div>

            {/* Academic Portal Info Card */}
            <div className="profile-card">
              <h3>Academic Quick Links</h3>
              <div className="profile-detail">
                <span>General Studies Modules</span>
                <strong>Polity, History, Economy, Geography</strong>
              </div>
              <div className="profile-detail">
                <span>Answer Writing Practice</span>
                <strong>Daily Mains Practice Active</strong>
              </div>
              <div className="profile-detail">
                <span>Current Affairs Digest</span>
                <strong>The Hindu & Indian Express Summary</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;