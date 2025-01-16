import React, { useContext, useState } from "react";
import { GoogleLogin, googleLogout } from "@react-oauth/google";
import { Link } from "react-router-dom";
import { UserContext } from "../App";
import "./HomeButtons.css";

const HomeButtons = () => {
  const [showGoogleLogin, setShowGoogleLogin] = useState(false); // if user clicks sign in to dj
  const { userId, handleLogin, handleLogout } = useContext(UserContext);

  const handleDJLoginClick = () => {
    setShowGoogleLogin(true); // show GoogleLogin when user clicks 'log in to dj'
  };
  return (
    <div className="button-container">
      {userId ? (
        <button
          className="homepage-button"
          onClick={() => {
            googleLogout();
            handleLogout();
          }}
        >
          logout
        </button>
      ) : (
        <>
          {!showGoogleLogin ? (
            <button onClick={handleDJLoginClick} className="homepage-button">
              log in to dj
            </button>
          ) : (
            <GoogleLogin onSuccess={handleLogin} onError={(err) => console.log(err)} />
          )}
        </>
      )}
      <Link to="/dj/tutorial" className="homepage-button">
        tutorial
      </Link>
    </div>
  );
};

export default HomeButtons;
