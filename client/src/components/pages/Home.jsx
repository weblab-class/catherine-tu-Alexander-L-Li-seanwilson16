import "../../utilities.css";
import "./Home.css";
import PlayPauseHome from "../modules/PlayPauseHome";
import { ThemeContext } from "../context/Context";
import React, { useContext, useEffect } from "react";
import HomeButtons from "../modules/HomeButtons";

const Home = () => {
  return (
    <>
      <PlayPauseHome />
      <div className="body" />
      <div className="homepage-container">
        <h1 className="homepage-title">
          chilldeck
          <p className="homepage-subtitle">made by chill people for chill people</p>
        </h1>
        <HomeButtons />
      </div>
    </>
  );
};

export default Home;
