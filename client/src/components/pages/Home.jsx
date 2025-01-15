import React, { useContext } from "react";
import { GoogleLogin, googleLogout } from "@react-oauth/google";

import "../../utilities.css";
import "./Home.css";
import PlayPauseHome from "../modules/PlayPauseHome";
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
      <PlayPauseHome />
      <div className="body" />
      <div className="homepage-container">
        <h1 className="homepage-title">
          chilldeck
          <p className="homepage-subtitle">made by chill people for chill people</p>
        </h1>
        <div className="button-container">
          <button className="homepage-button">log in to dj</button>
          <button className="homepage-button">tutorial</button>
        </div>
      </div>
    </>
  );
};

export default Home;
