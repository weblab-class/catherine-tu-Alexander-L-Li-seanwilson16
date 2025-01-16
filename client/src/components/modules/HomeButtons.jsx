import React, { useContext, useState } from "react";
import { GoogleLogin, googleLogout } from "@react-oauth/google";
import { Link } from "react-router-dom";
import { UserContext } from "../App";
import "./HomeButtons.css";

const HomeButtons = (props) => {
  const [showGoogleLogin, setShowGoogleLogin] = useState(false); // if user clicks sign in to dj
  const { userId, handleLogin, handleLogout } = useContext(UserContext);

  const handleDJLoginClick = (res) => {
    setShowGoogleLogin(true); // show GoogleLogin when user clicks 'log in to dj'
    const userToken = res.credential;
  };
  return (
    <div className="button-container">
      {userId ? (
        <>
          <button
            className="homepage-button"
            onClick={() => {
              googleLogout();
              handleLogout();
            }}
          >
            logout
          </button>
          <Link to="/dj/tutorial" className="homepage-button">
            tutorial
          </Link>
          <Link to={`/profile/${props.userId}`} className="homepage-button">
            my profile
          </Link>
        </>
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
    </div>
  );
};

export default HomeButtons;
