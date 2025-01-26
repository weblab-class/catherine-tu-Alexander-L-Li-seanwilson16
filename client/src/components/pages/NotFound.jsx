import React from "react";
import useRequireLogin from "../../hooks/useRequireLogin";
import LoginOverlay from "../modules/LoginOverlay";
import { Link } from "react-router-dom";
import "./NotFound.css";

const NotFound = () => {
  const isLoggedIn = useRequireLogin();

  return (
    <>
      {!isLoggedIn && <LoginOverlay />}
      <div className="body NotFound-container">
        <h1 className="not-found-text">404 Not Found</h1>
        <p className="subtitle-text">
          The page you requested couldn't be found. It's okay, it's chill.
        </p>
        <img src={"favicon.png"} alt="favicon..." className="not-found-img" />
        <Link to="/">Go back to home</Link>
      </div>
    </>
  );
};

export default NotFound;
