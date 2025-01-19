import React, { useState, useRef, useContext } from "react";
import backgroundMusic from "/assets/chill-guy-remix.mp3";
import { ThemeContext } from "../context/Context";

import lofibackground from "/assets/lofi-bg.png";
import naturebackground from "/assets/nature-background.jpeg";
// import oceanbackground from "/assets/ocean-background.jpg";

import "./PlayPauseHome.css";

const PlayPauseHome = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const { theme, _ } = useContext(ThemeContext);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    // <div className="play-pause-container">
    //   <audio ref={audioRef} src={backgroundMusic} loop />
    //   <button onClick={togglePlay} className="play-pause-button">
    //     {isPlaying ? "pause theme music" : "ummute theme music"}
    //   </button>
    // </div>
    // <div className={isDark ? darkStyles.darkTheme : lightStyles.lightTheme}>

    <div className="play-pause-container">
      <audio ref={audioRef} src={backgroundMusic} loop />
      <button
        onClick={togglePlay}
        className={
          theme === lofibackground
            ? "play-pause-button-lofi"
            : theme === naturebackground
            ? "play-pause-button-nature"
            : "play-pause-button-ocean"
        }
      >
        {isPlaying ? "pause theme music" : "ummute theme music"}
      </button>
    </div>
  );
};

export default PlayPauseHome;
