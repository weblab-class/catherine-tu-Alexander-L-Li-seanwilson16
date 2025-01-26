import React from "react";
import { Link } from "react-router-dom";
import "./LoginOverlay.css";

const LoginOverlay = () => {
  return (
    <div className="login-overlay">
      <div className="login-message">
        <h2 className="login-title">please log in first!</h2>
        <p className="login-subtitle">you need to be logged in to access this page.</p>
        <Link to="/" className="login-link">
          go to home page
        </Link>
      </div>
    </div>
  );
};

export default LoginOverlay;
