import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/GuideLogin.css";

function GuideLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Post the login data to the guide login endpoint
      const res = await api.post("/guide/login", { username, password });
      console.log("Guide login response:", res.data);
      // Save tokens to localStorage (adjust keys if needed)
      localStorage.setItem("access_token", res.data.access_token);
      localStorage.setItem("refresh_token", res.data.refresh_token);
      // Navigate to the guide home/dashboard page
      navigate("/guide/home");
    } catch (err) {
      console.error("Error in guide login:", err);
      setError("Error logging in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="guide-login-container">
      <h2>Guide Login</h2>
      <form onSubmit={handleLogin} className="guide-login-form">
        <div className="form-group">
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
          />
        </div>
        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />
        </div>
        <button type="submit" className="submit-button">Login as Guide</button>
      </form>
      {loading && <p className="loading-indicator">Loading...</p>}
      {error && <p className="error-message">{error}</p>}
      <p className="link-text">
        New guide?{" "}
        <span className="link" onClick={() => navigate("/guide/register")}>
          Register here
        </span>.
      </p>
      <p className="link-text">
        Not a guide?{" "}
        <span className="link" onClick={() => navigate("/login")}>
          Login as user
        </span>.
      </p>
    </div>
  );
}

export default GuideLogin;
