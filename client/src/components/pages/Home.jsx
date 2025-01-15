import React, { useContext } from "react";
import { GoogleLogin, googleLogout } from "@react-oauth/google";

import "../../utilities.css";
import "./Home.css";
import { UserContext } from "../App";

const Home = () => {
  const { userId, handleLogin, handleLogout } = useContext(UserContext);
  return (
    <>
      {userId ? (
        <button
          onClick={() => {
            googleLogout();
            handleLogout();
          }}
        >
          Logout
        </button>
      ) : (
        <GoogleLogin onSuccess={handleLogin} onError={(err) => console.log(err)} />
      )}
      <div className="body" />
      <div className="homepage-container">
        <h1 className="homepage-title">chilldeck</h1>
        <div className="button-container">
          <button className="homepage-button">log in to dj</button>
          <button className="homepage-button">tutorial</button>
        </div>
      </div>
    </>
  );
};

export default Home;
