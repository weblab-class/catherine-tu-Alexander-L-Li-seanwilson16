import React, { useState, useRef } from "react";
import backgroundMusic from "../../assets/chill-guy-remix.mp3";

import "./PlayPauseHome.css";

const PlayPauseHome = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="play-pause-container">
      <audio ref={audioRef} src={backgroundMusic} loop />
      <button onClick={togglePlay} className="play-pause-button">
        {isPlaying ? "pause theme music" : "ummute theme music"}
      </button>
    </div>
  );
};

export default PlayPauseHome;
