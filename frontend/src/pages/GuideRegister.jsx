import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/GuideRegister.css";

function GuideRegister() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/guide/register/", { username, password });
      console.log("Guide register response:", res.data);
      navigate("/guide/login");
    } catch (err) {
      console.error("Error in guide registration:", err);
      setError("Error registering. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="guide-register-container">
      <h2>Guide Registration</h2>
      <form onSubmit={handleRegister} className="guide-register-form">
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
        <button type="submit" className="submit-button">Register as Guide</button>
      </form>
      {loading && <p className="loading-indicator">Loading...</p>}
      {error && <p className="error-message">{error}</p>}
      <p className="link-text">
        Already registered as a guide?{" "}
        <span className="link" onClick={() => navigate("/guide/login")}>
          Login here
        </span>.
      </p>
      <p className="link-text">
        Not a guide?{" "}
        <span className="link" onClick={() => navigate("/register")}>
          Register as a user
        </span>.
      </p>
    </div>
  );
}

export default GuideRegister;
