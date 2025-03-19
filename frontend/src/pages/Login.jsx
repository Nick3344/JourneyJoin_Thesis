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
