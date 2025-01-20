import React from "react";
import "./Loading.css";
import loadingGif from "/assets/loading-icon.gif";

const Loading = () => {
  return (
    <div className="loading-container">
      <div className="loading-content">
        <img src={loadingGif} alt="Loading..." className="loading-gif" />
        <p className="loading-text">loading your vibe...</p>
      </div>
    </div>
  );
};

export default Loading;
