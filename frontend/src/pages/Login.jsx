/*import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/Login.css";

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/login", { username, password });
      console.log("Login response:", res.data);
      const { access_token, user_acs_id } = res.data;
      if (!access_token || !user_acs_id) {
        setError("Login failed: Missing token or ACS ID in response.");
        setLoading(false);
        return;
      }
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("user_acs_id", user_acs_id);
      setLoading(false);
      // Use React Router navigate and then force a full reload to ensure home renders correctly
      navigate("/", { replace: true });
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please check your credentials and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          required
          className="login-input"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="login-input"
        />
        {error && <p className="error-message">{error}</p>}
        <button type="submit" className="login-button" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <p className="link-text">
        Are you a guide?{" "}
        <span className="link" onClick={() => navigate("/guide/login")}>
          Login as guide
        </span>.
      </p>
    </div>
  );
}

export default Login;*/





import React from "react";
import { useNavigate } from "react-router-dom";
import Form from "../components/Form";
import "../styles/Login.css";

function Login() {
  const navigate = useNavigate();
  return (
    <div className="login-container">
      <Form route="/login" method="login" />
      <p className="link-text">
        Are you a guide?{" "}
        <span className="link" onClick={() => navigate("/guide/login")}>
          Login as guide
        </span>.
      </p>
    </div>
  );
}

export default Login;
