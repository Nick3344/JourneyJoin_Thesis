import React from "react";
import { useNavigate } from "react-router-dom";
import Form from "../components/Form";
import "../styles/Register.css";  // Make sure to include your CSS file

function Register() {
  const navigate = useNavigate();
  return (
    <div className="register-container">
      <Form route="/register" method="register" />
      <p className="guide-register-link">
        Are you a guide?{" "}
        <span onClick={() => navigate("/guide/register")}>
          Register as a guide
        </span>
      </p>
    </div>
  );
}

export default Register;
