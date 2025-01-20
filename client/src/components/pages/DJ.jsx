import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import WaveSurfer from "wavesurfer.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js";
import "./DJ.css";
import NavBar from "../modules/NavBar";

const AVAILABLE_TRACKS = [
  {
    id: 1,
    name: "Fall to Light",
    path: "NCS_Fall_to_Light",
    bpm: 87,
    key: "1B",
    stems: {
      bass: "/assets/processed/NCS_Fall_to_Light/NCS_Fall_to_Light_bass.mp3",
      drums: "/assets/processed/NCS_Fall_to_Light/NCS_Fall_to_Light_drums.mp3",
      melody: "/assets/processed/NCS_Fall_to_Light/NCS_Fall_to_Light_melody.mp3",
      vocals: "/assets/processed/NCS_Fall_to_Light/NCS_Fall_to_Light_vocals.mp3",
    },
  },
  {
    id: 2,
    name: "On & On",
    path: "NCS_On&On",
    bpm: 86,
    key: "1B",
    stems: {
      bass: "/assets/processed/NCS_On&On/NCS_On&On_bass.mp3",
      drums: "/assets/processed/NCS_On&On/NCS_On&On_drums.mp3",
      melody: "/assets/processed/NCS_On&On/NCS_On&On_melody.mp3",
      vocals: "/assets/processed/NCS_On&On/NCS_On&On_vocals.mp3",
    },
  },
  {
    id: 3,
    name: "Chill Guy Remix",
    path: "chill-guy-remix",
    bpm: 80,
    key: "4B",
    stems: {
      bass: "/assets/processed/chill-guy-remix/chill-guy-remix_bass.mp3",
      drums: "/assets/processed/chill-guy-remix/chill-guy-remix_drums.mp3",
      melody: "/assets/processed/chill-guy-remix/chill-guy-remix_melody.mp3",
      vocals: "/assets/processed/chill-guy-remix/chill-guy-remix_vocals.mp3",
    },
  },
];

const STEM_TYPES = ["bass", "drums", "melody", "vocals"];

const createWaveSurfer = (container) => {
  const timeline = TimelinePlugin.create({
    height: 20,
    timeInterval: 0.1,
    primaryLabelInterval: 1,
    style: {
      fontSize: "10px",
      color: "#ffffff",
    },
  });

  return WaveSurfer.create({
    container,
    waveColor: {
      progressive: "#4a9eff",
      gradient: ["#4a9eff", "#1e4976"],
    },
    progressColor: "#1e4976",
    cursorColor: "#ffffff",
    barWidth: 2,
    barRadius: 3,
    barGap: 3,
    height: 70,
    responsive: true,
    normalize: true,
    minPxPerSec: 100,
    fillParent: false,
    scrollParent: true,
    autoCenter: true,
    hideScrollbar: true,
    plugins: [timeline],
  });
};

const DJ = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tracks, setTracks] = useState(AVAILABLE_TRACKS);
  const [leftTrack, setLeftTrack] = useState({
    name: "",
    key: "",
    bpm: "",
    effectsEnabled: {
      bass: true,
      drums: true,
      melody: true,
      vocals: true,
    },
  });

  const [rightTrack, setRightTrack] = useState({
    name: "",
    key: "",
    bpm: "",
    effectsEnabled: {
      bass: true,
      drums: true,
      melody: true,
      vocals: true,
    },
  });

  const [dropdownOpen, setDropdownOpen] = useState({
    left: false,
    right: false,
  });

  const [playing, setPlaying] = useState({
    left: false,
    right: false,
  });

  const [timeInfo, setTimeInfo] = useState({
    left: { current: 0, total: 0 },
    right: { current: 0, total: 0 },
  });

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const leftContainerRef = useRef(null);
  const rightContainerRef = useRef(null);
  const leftWaveformRef = useRef(null);
  const rightWaveformRef = useRef(null);
  const leftWavesurfer = useRef(null);
  const rightWavesurfer = useRef(null);

  useEffect(() => {
    if (!leftWavesurfer.current && leftContainerRef.current) {
      leftWavesurfer.current = createWaveSurfer(leftContainerRef.current);
    }
    if (!rightWavesurfer.current && rightContainerRef.current) {
      rightWavesurfer.current = createWaveSurfer(rightContainerRef.current);
    }
  }, []);

  const handleKeyPress = (event) => {
    const key = event.key.toLowerCase();

    if (key === "q" && leftTrack.name) {
      event.preventDefault();
      toggleEffect("left", "bass");
    }
    if (key === "w" && leftTrack.name) {
      event.preventDefault();
      toggleEffect("left", "drums");
    }
    if (key === "e" && leftTrack.name) {
      event.preventDefault();
      toggleEffect("left", "melody");
    }
    if (key === "r" && leftTrack.name) {
      event.preventDefault();
      toggleEffect("left", "vocals");
    }

    if (key === "u" && rightTrack.name) {
      event.preventDefault();
      toggleEffect("right", "bass");
    }
    if (key === "i" && rightTrack.name) {
      event.preventDefault();
      toggleEffect("right", "drums");
    }
    if (key === "o" && rightTrack.name) {
      event.preventDefault();
      toggleEffect("right", "melody");
    }
    if (key === "p" && rightTrack.name) {
      event.preventDefault();
      toggleEffect("right", "vocals");
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [leftTrack.name, rightTrack.name]);

  const toggleEffect = useCallback((deck, effect) => {
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const setTrackState = deck === "left" ? setLeftTrack : setRightTrack;
    const audio = trackState.audioElements?.[effect];

    if (!audio) return;

    setTrackState((prev) => {
      const newEffectsEnabled = {
        ...prev.effectsEnabled,
        [effect]: !prev.effectsEnabled[effect],
      };

      audio.muted = !newEffectsEnabled[effect];

      return {
        ...prev,
        effectsEnabled: newEffectsEnabled,
      };
    });
  }, [leftTrack, rightTrack]);

  const handleTrackSelect = async (deck, track) => {
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const setTrackState = deck === "left" ? setLeftTrack : setRightTrack;
    const wavesurfer = deck === "left" ? leftWavesurfer : rightWavesurfer;

    if (trackState.audioElements) {
      Object.values(trackState.audioElements).forEach((audio) => {
        if (audio) {
          audio.pause();
        }
      });
    }

    if (wavesurfer.current) {
      wavesurfer.current.pause();
      wavesurfer.current.empty();
    }

    const audioElements = {};

    try {
      for (const stem of STEM_TYPES) {
        const audio = new Audio();
        const stemName = stem === "melody" ? "other" : stem;
        audio.src = `/assets/processed/${track.path}/${track.path}_${stemName}.mp3`;
        audio.volume = 1;
        audio.muted = false;
        audioElements[stem] = audio;

        await new Promise((resolve, reject) => {
          audio.addEventListener("loadeddata", resolve, { once: true });
          audio.addEventListener("error", reject, { once: true });
        });
      }

      const stems = Object.entries(audioElements);
      const mainAudio = stems[0][1];

      const syncAudio = () => {
        const mainTime = mainAudio.currentTime;
        stems.slice(1).forEach(([_, audio]) => {
          if (Math.abs(audio.currentTime - mainTime) > 0.1) {
            audio.currentTime = mainTime;
          }
        });
      };

      mainAudio.addEventListener("timeupdate", syncAudio);

      if (wavesurfer.current) {
        await wavesurfer.current.load(`/assets/processed/${track.path}/${track.path}_bass.mp3`);
      }

      setTrackState({
        name: track.name,
        key: track.key,
        bpm: track.bpm,
        audioElements,
        effectsEnabled: {
          bass: true,
          drums: true,
          melody: true,
          vocals: true,
        },
      });

    } catch (error) {
      console.error("Error setting up track:", error);
      Object.values(audioElements).forEach((audio) => {
        if (audio) {
          audio.pause();
        }
      });
    }

    setDropdownOpen((prev) => ({ ...prev, [deck]: false }));
  };

  const handlePlayPause = (deck) => {
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const wavesurfer = deck === "left" ? leftWavesurfer : rightWavesurfer;

    if (!trackState.name || !wavesurfer.current) return;

    setPlaying((prev) => {
      const newPlaying = !prev[deck];

      const turntable = document.querySelector(`.${deck}-deck .turntable`);
      if (turntable) {
        turntable.classList.toggle("playing", newPlaying);
      }

      if (newPlaying) {
        Object.values(trackState.audioElements || {}).forEach((audio) => {
          if (audio) {
            audio.currentTime = wavesurfer.current.getCurrentTime();
            if (!audio.muted) {
              audio.play();
            }
          }
        });
        wavesurfer.current.play();
      } else {
        Object.values(trackState.audioElements || {}).forEach((audio) => {
          if (audio) {
            audio.pause();
          }
        });
        wavesurfer.current.pause();
      }

      return {
        ...prev,
        [deck]: newPlaying,
      };
    });
  };

  const handleBPMChange = (deck, value) => {
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const setTrackState = deck === "left" ? setLeftTrack : setRightTrack;
    const waveform = deck === "left" ? leftWavesurfer : rightWavesurfer;

    if (!waveform.current || !trackState.name) return;

    const originalBPM = trackState.name
      ? tracks.find((t) => t.name === trackState.name)?.bpm || 120
      : 120;
    const newRate = value / originalBPM;

    waveform.current.setPlaybackRate(newRate);
    Object.values(trackState.audioElements || {}).forEach((audio) => {
      if (audio) {
        audio.playbackRate = newRate;
      }
    });

    setTrackState((prev) => ({
      ...prev,
      bpm: value,
    }));
  };

  return (
    <>
      <NavBar />
      <div className="dj-page">
        <div
          className="top-bar"
          onClick={(e) => {
            if (!e.target.closest(".import-container")) {
              setDropdownOpen({ left: false, right: false });
            }
          }}
        >
          <div className="deck-controls">
            <div className="import-container">
              <button
                className="import-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownOpen((prev) => ({
                    ...prev,
                    left: !prev.left,
                  }));
                }}
              >
                IMPORT SONG ▼
              </button>
              {dropdownOpen.left && (
                <div className="import-dropdown">
                  {tracks.map((track) => (
                    <button
                      key={track.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTrackSelect("left", track);
                      }}
                    >
                      <div className="song-info">
                        <span className="song-name">{track.name}</span>
                        <span className="song-details">
                          {track.bpm} BPM • {track.key}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="track-info">
              {leftTrack.name ? (
                <>
                  <div className="track-name-left">{leftTrack.name}</div>
                  <div className="track-details-left">
                    {leftTrack.bpm + " BPM • " + leftTrack.key}
                  </div>
                </>
              ) : (
                <div className="no-track">NO TRACK LOADED</div>
              )}
            </div>
          </div>

          <div className="deck-controls">
            <div className="import-container">
              <button
                className="import-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownOpen((prev) => ({
                    ...prev,
                    right: !prev.right,
                  }));
                }}
              >
                IMPORT SONG ▼
              </button>
              {dropdownOpen.right && (
                <div className="import-dropdown">
                  {tracks.map((track) => (
                    <button
                      key={track.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTrackSelect("right", track);
                      }}
                    >
                      <div className="song-info">
                        <span className="song-name">{track.name}</span>
                        <span className="song-details">
                          {track.bpm} BPM • {track.key}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="track-info">
              {rightTrack.name ? (
                <>
                  <div className="track-name-right">{rightTrack.name}</div>
                  <div className="track-details-right">
                    {rightTrack.bpm + " BPM • " + rightTrack.key}
                  </div>
                </>
              ) : (
                <div className="no-track">NO TRACK LOADED</div>
              )}
            </div>
          </div>
        </div>

        <div className="waveforms-section">
          <div ref={leftContainerRef}></div>
          <div ref={rightContainerRef}></div>
        </div>

        <div className="decks-container">
          <div className="deck left-deck">
            <div className="turntable">
              <img className="turntable-image" src="/assets/chill-guy-head.webp" alt="Chill Guy DJ" />
            </div>

            <div className="controls">
              <div className="deck-row left-deck-row">
                <div className="playback-section">
                  <div className="bpm-slider-container">
                    <input
                      type="range"
                      className="bpm-slider bpm-slider-left"
                      min="60"
                      max="180"
                      value={leftTrack.bpm}
                      onChange={(e) => handleBPMChange("left", parseInt(e.target.value))}
                    />
                    <div className="bpm-display bpm-display-left">{leftTrack.bpm} BPM</div>
                  </div>
                  <div className="playback-controls">
                    <button className="cue-btn cue-btn-left">
                      <span className="cue-symbol">CUE</span>
                    </button>
                    <button
                      className={`play-btn play-btn-left ${playing.left ? "playing" : ""}`}
                      onClick={() => handlePlayPause("left")}
                    >
                      {playing.left ? (
                        <span className="pause-symbol">❚❚</span>
                      ) : (
                        <span className="play-symbol">▶</span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="effect-buttons">
                  {STEM_TYPES.map((effect, index) => {
                    const hotkey = {
                      left: { bass: "Q", drums: "W", melody: "E", vocals: "R" },
                      right: { bass: "U", drums: "I", melody: "O", vocals: "P" },
                    };
                    return (
                      <div key={effect} className="effect-button-container">
                        <div className="hotkey-indicator hotkey">
                          <span className="hotkey-text">{hotkey.left[effect]}</span>
                        </div>
                        <button
                          className={`effect-btn ${
                            leftTrack.effectsEnabled?.[effect] ? "active" : ""
                          }`}
                          onClick={() => toggleEffect("left", effect)}
                        />
                        <span className="effect-label">{effect}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="deck-controls">
            <button className="sync-btn">
              <span className="sync-text">SYNC</span>
            </button>
            <button className="reset-btn">
              <span className="reset-text">RESET</span>
            </button>
          </div>

          <div className="deck right-deck">
            <div className="turntable">
              <img className="turntable-image" src="/assets/chill-guy-head.webp" alt="Chill Guy DJ" />
            </div>

            <div className="controls">
              <div className="deck-row right-deck-row">
                <div className="effect-buttons">
                  {STEM_TYPES.map((effect, index) => {
                    const hotkey = {
                      left: { bass: "Q", drums: "W", melody: "E", vocals: "R" },
                      right: { bass: "U", drums: "I", melody: "O", vocals: "P" },
                    };
                    return (
                      <div key={effect} className="effect-button-container">
                        <div className="hotkey-indicator">
                          <span className="hotkey-text">{hotkey.right[effect]}</span>
                        </div>
                        <button
                          className={`effect-btn ${
                            rightTrack.effectsEnabled?.[effect] ? "active" : ""
                          }`}
                          onClick={() => toggleEffect("right", effect)}
                        />
                        <span className="effect-label">{effect}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="playback-section">
                  <div className="bpm-slider-container">
                    <input
                      type="range"
                      className="bpm-slider bpm-slider-right"
                      min="60"
                      max="180"
                      value={rightTrack.bpm}
                      onChange={(e) => handleBPMChange("right", parseInt(e.target.value))}
                    />
                    <div className="bpm-display bpm-display-right">{rightTrack.bpm} BPM</div>
                  </div>
                  <div className="playback-controls">
                    <button className="cue-btn cue-btn-right">
                      <span className="cue-symbol">CUE</span>
                    </button>
                    <button
                      className={`play-btn play-btn-right ${playing.right ? "playing" : ""}`}
                      onClick={() => handlePlayPause("right")}
                    >
                      {playing.right ? (
                        <span className="pause-symbol">❚❚</span>
                      ) : (
                        <span className="play-symbol">▶</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DJ;
