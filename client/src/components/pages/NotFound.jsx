import React from "react";
import "./NotFound.css";

const NotFound = () => {
  return (
    <div className="body">
      <h1 className="not-found-text">404 Not Found</h1>
      <p className="subtitle-text">
        The page you requested couldn't be found. It's okay, it's chill.
      </p>
      <img src={"favicon.png"} alt="favicon..." className="not-found-img" />
    </div>
  );
};

export default NotFound;
