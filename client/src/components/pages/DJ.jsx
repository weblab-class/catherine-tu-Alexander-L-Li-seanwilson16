import React, { useState, useEffect, useRef, useCallback } from "react";
import WaveSurfer from "wavesurfer.js/dist/wavesurfer.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js";
import NavBar from "../modules/NavBar";
import "./DJ.css";

const AVAILABLE_TRACKS = [
  {
    id: 1,
    name: "Fall to Light - NCS",
    path: "NCS_Fall_to_Light",
    bpm: 87,
    key: "1B",
  },
  {
    id: 2,
    name: "On & On - NCS",
    path: "NCS_On&On",
    bpm: 86,
    key: "1B",
  },
  {
    id: 3,
    name: "Chill Guy Remix - 류서진",
    path: "chill-guy-remix",
    bpm: 80,
    key: "4B",
  },
];

const STEM_TYPES = ["bass", "drums", "melody", "vocals"];

const createWaveSurfer = (container, options = {}) => {
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
    waveColor: options.waveColor || "rgba(255, 255, 255, 0.5)",
    progressColor: options.progressColor || "#fff",
    cursorColor: "#ffffff",
    height: 70,
    responsive: true,
    normalize: true,
    minPxPerSec: 100,
    fillParent: true,
    scrollParent: true,
    autoCenter: true,
    hideScrollbar: true,
    plugins: [timeline],
    backend: "MediaElement",
    media: document.createElement("audio"),
    mediaControls: false,
    volume: 0,
    interact: true,
    dragToSeek: true,
    pixelRatio: 1,
  });
};

const DJ = () => {
  const [tracks] = useState(AVAILABLE_TRACKS);
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

  const [cuePoints, setCuePoints] = useState({ left: 0, right: 0 });
  const [isCueing, setIsCueing] = useState({ left: false, right: false });
  const [cueActive, setCueActive] = useState({ left: false, right: false });
  const [playButtonPressed, setPlayButtonPressed] = useState({ left: false, right: false });
  const [cueKeyPressed, setCueKeyPressed] = useState({ left: false, right: false });

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
  const leftWavesurfers = useRef({});
  const rightWavesurfers = useRef({});

  const handlePlayPause = useCallback(
    (deck) => {
      const wavesurfers = deck === "left" ? leftWavesurfers : rightWavesurfers;
      const trackState = deck === "left" ? leftTrack : rightTrack;
      const isCueing = deck === "left" ? cueActive.left : cueActive.right;

      if (!trackState.name || !wavesurfers.current) return;

      setPlaying((prev) => {
        const newPlaying = { ...prev, [deck]: !prev[deck] };
        const currentTime = Object.values(wavesurfers.current)[0].getCurrentTime();

        if (newPlaying[deck]) {
          // Ensure all wavesurfers are at the same position before playing
          Object.values(wavesurfers.current).forEach((wavesurfer) => {
            wavesurfer.setTime(currentTime);
            wavesurfer.play();
          });
          // Sync audio elements
          Object.values(trackState.audioElements).forEach((audio) => {
            if (audio) {
              audio.currentTime = currentTime;
              audio.play();
            }
          });
        } else {
          Object.values(wavesurfers.current).forEach((wavesurfer) => {
            wavesurfer.pause();
          });
          Object.values(trackState.audioElements).forEach((audio) => {
            if (audio) {
              audio.pause();
            }
          });
        }

        if (isCueing) {
          setCueActive((prev) => ({ ...prev, [deck]: false }));
        }

        return newPlaying;
      });
    },
    [leftTrack, rightTrack, cueActive, leftWavesurfers, rightWavesurfers]
  );

  const handlePlayDown = useCallback(
    (deck) => {
      if (playButtonPressed[deck]) return; // Prevent repeated toggles while holding
      setPlayButtonPressed((prev) => ({ ...prev, [deck]: true }));
      handlePlayPause(deck);
    },
    [playButtonPressed, handlePlayPause]
  );

  const handlePlayUp = useCallback((deck) => {
    setPlayButtonPressed((prev) => ({ ...prev, [deck]: false }));
  }, []);

  const handleCueDown = useCallback(
    (deck) => {
      const wavesurfers = deck === "left" ? leftWavesurfers : rightWavesurfers;
      const trackState = deck === "left" ? leftTrack : rightTrack;
      const isPlaying = deck === "left" ? playing.left : playing.right;

      if (!trackState.name || !wavesurfers.current) return;

      // Store current position as cue point
      const currentTime = Object.values(wavesurfers.current)[0].getCurrentTime();
      setCuePoints((prev) => ({ ...prev, [deck]: currentTime }));

      // If not already playing, start playing from current position
      if (!isPlaying) {
        // Ensure all wavesurfers are at the same position
        Object.values(wavesurfers.current).forEach((wavesurfer) => {
          wavesurfer.setTime(currentTime);
          wavesurfer.play();
        });
        // Sync audio elements
        Object.values(trackState.audioElements).forEach((audio) => {
          if (audio) {
            audio.currentTime = currentTime;
            audio.play();
          }
        });
      }

      setIsCueing((prev) => ({ ...prev, [deck]: true }));
      setCueActive((prev) => ({ ...prev, [deck]: true }));
    },
    [leftTrack, rightTrack, playing, leftWavesurfers, rightWavesurfers]
  );

  const handleCueUp = useCallback(
    (deck) => {
      const wavesurfers = deck === "left" ? leftWavesurfers : rightWavesurfers;
      const trackState = deck === "left" ? leftTrack : rightTrack;
      const isPlaying = deck === "left" ? playing.left : playing.right;

      if (!trackState.name || !wavesurfers.current) return;

      setIsCueing((prev) => ({ ...prev, [deck]: false }));

      // Only pause and seek if we're not in regular playback mode
      if (!isPlaying) {
        const storedCuePoint = cuePoints[deck];
        // First pause everything
        Object.values(wavesurfers.current).forEach((wavesurfer) => {
          wavesurfer.pause();
        });
        Object.values(trackState.audioElements).forEach((audio) => {
          if (audio) {
            audio.pause();
          }
        });

        // Then set all times to the stored cue point
        Object.values(wavesurfers.current).forEach((wavesurfer) => {
          wavesurfer.setTime(storedCuePoint);
        });
        Object.values(trackState.audioElements).forEach((audio) => {
          if (audio) {
            audio.currentTime = storedCuePoint;
          }
        });
        setCueActive((prev) => ({ ...prev, [deck]: false }));
      }
    },
    [leftTrack, rightTrack, playing, leftWavesurfers, rightWavesurfers, cuePoints]
  );

  const handleEffectToggle = (deck, effect) => {
    const setTrackState = deck === "left" ? setLeftTrack : setRightTrack;
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const wavesurfers = deck === "left" ? leftWavesurfers : rightWavesurfers;

    if (!trackState.name) return;

    setTrackState((prev) => {
      const newEffectsEnabled = {
        ...prev.effectsEnabled,
        [effect]: !prev.effectsEnabled[effect],
      };

      // Update audio element mute state
      if (prev.audioElements && prev.audioElements[effect]) {
        prev.audioElements[effect].muted = !newEffectsEnabled[effect];
      }

      // Update waveform colors
      if (wavesurfers.current && wavesurfers.current[effect]) {
        const isEnabled = newEffectsEnabled[effect];
        const colors = {
          bass: {
            waveColor: "rgba(255, 49, 140, 0.5)", // Hot Pink
            progressColor: "rgba(255, 49, 140, 0.4)",
            disabledColor: "rgba(128, 128, 128, 0.2)",
          },
          drums: {
            waveColor: "rgba(56, 255, 130, 0.5)", // Neon Green
            progressColor: "rgba(56, 255, 130, 0.4)",
            disabledColor: "rgba(128, 128, 128, 0.2)",
          },
          melody: {
            waveColor: "rgba(255, 247, 32, 0.5)", // Neon Yellow
            progressColor: "rgba(255, 247, 32, 0.4)",
            disabledColor: "rgba(128, 128, 128, 0.2)",
          },
          vocals: {
            waveColor: "rgba(70, 237, 255, 0.5)", // Cyan
            progressColor: "rgba(70, 237, 255, 0.4)",
            disabledColor: "rgba(128, 128, 128, 0.2)",
          },
        };

        wavesurfers.current[effect].setOptions({
          waveColor: isEnabled ? colors[effect].waveColor : colors[effect].disabledColor,
          progressColor: isEnabled ? colors[effect].progressColor : colors[effect].disabledColor,
        });
      }

      return {
        ...prev,
        effectsEnabled: newEffectsEnabled,
      };
    });
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.target.tagName === "INPUT") return;
      if (event.repeat) return; // Prevent key repeat

      const key = event.key.toLowerCase();

      // Play/Pause controls
      if (key === "g") {
        handlePlayDown("left");
      } else if (key === "h") {
        handlePlayDown("right");
      }

      // Cue controls
      if (key === "t") {
        event.preventDefault();
        handleCueDown("left");
      } else if (key === "y") {
        event.preventDefault();
        handleCueDown("right");
      }

      // Effect toggles
      if (key === "q" && leftTrack.name) {
        event.preventDefault();
        handleEffectToggle("left", "bass");
      }
      if (key === "w" && leftTrack.name) {
        event.preventDefault();
        handleEffectToggle("left", "drums");
      }
      if (key === "e" && leftTrack.name) {
        event.preventDefault();
        handleEffectToggle("left", "melody");
      }
      if (key === "r" && leftTrack.name) {
        event.preventDefault();
        handleEffectToggle("left", "vocals");
      }

      // Right deck effect toggles
      if (key === "u" && rightTrack.name) {
        event.preventDefault();
        handleEffectToggle("right", "bass");
      }
      if (key === "i" && rightTrack.name) {
        event.preventDefault();
        handleEffectToggle("right", "drums");
      }
      if (key === "o" && rightTrack.name) {
        event.preventDefault();
        handleEffectToggle("right", "melody");
      }
      if (key === "p" && rightTrack.name) {
        event.preventDefault();
        handleEffectToggle("right", "vocals");
      }
    };

    const handleKeyUp = (event) => {
      if (event.target.tagName === "INPUT") return;

      const key = event.key.toLowerCase();

      // Play button release
      if (key === "g") {
        handlePlayUp("left");
      } else if (key === "h") {
        handlePlayUp("right");
      }

      // Cue controls
      if (key === "t") {
        event.preventDefault();
        handleCueUp("left");
      } else if (key === "y") {
        event.preventDefault();
        handleCueUp("right");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    handlePlayDown,
    handlePlayUp,
    handleCueDown,
    handleCueUp,
    handleEffectToggle,
    leftTrack.name,
    rightTrack.name,
  ]);

  useEffect(() => {
    const initializeWaveSurfers = async (containerRef, wavesurfersRef) => {
      if (!containerRef.current) return;

      containerRef.current.innerHTML = "";

      const stemColors = {
        bass: {
          waveColor: "rgba(255, 49, 140, 0.5)", // Hot Pink
          progressColor: "rgba(255, 49, 140, 0.5)",
          disabledColor: "rgba(128, 128, 128, 0.2)",
        },
        drums: {
          waveColor: "rgba(56, 255, 130, 0.5)", // Neon Green
          progressColor: "rgba(56, 255, 130, 0.5)",
          disabledColor: "rgba(128, 128, 128, 0.2)",
        },
        melody: {
          waveColor: "rgba(255, 247, 32, 0.5)", // Neon Yellow
          progressColor: "rgba(255, 247, 32, 0.5)",
          disabledColor: "rgba(128, 128, 128, 0.2)",
        },
        vocals: {
          waveColor: "rgba(70, 237, 255, 0.5)", // Cyan
          progressColor: "rgba(70, 237, 255, 0.5)",
          disabledColor: "rgba(128, 128, 128, 0.2)",
        },
      };

      containerRef.current.style.position = "relative";
      containerRef.current.style.height = "70px";
      containerRef.current.style.width = "100%";
      containerRef.current.style.pointerEvents = "none";
      containerRef.current.style.zIndex = "1";
      containerRef.current.classList.add("waveform-container");

      for (const [stem, colors] of Object.entries(stemColors)) {
        const stemContainer = document.createElement("div");
        stemContainer.style.position = "absolute";
        stemContainer.style.left = "0";
        stemContainer.style.right = "0";
        stemContainer.style.top = "0";
        stemContainer.style.height = "100%";
        stemContainer.style.pointerEvents = "none";
        stemContainer.style.zIndex = "1";
        containerRef.current.appendChild(stemContainer);

        wavesurfersRef.current[stem] = createWaveSurfer(stemContainer, {
          waveColor: colors.waveColor,
          progressColor: colors.progressColor,
          height: 70,
          cursorColor: "transparent",
          interact: false,
        });
      }
    };

    initializeWaveSurfers(leftContainerRef, leftWavesurfers);
    initializeWaveSurfers(rightContainerRef, rightWavesurfers);

    return () => {
      Object.values(leftWavesurfers.current).forEach((wavesurfer) => {
        if (wavesurfer) wavesurfer.destroy();
      });
      Object.values(rightWavesurfers.current).forEach((wavesurfer) => {
        if (wavesurfer) wavesurfer.destroy();
      });
      leftWavesurfers.current = {};
      rightWavesurfers.current = {};
    };
  }, []);

  useEffect(() => {
    return () => {
      if (leftTrack.audioElements) {
        Object.values(leftTrack.audioElements).forEach((audio) => {
          if (audio) audio.pause();
        });
      }
      if (rightTrack.audioElements) {
        Object.values(rightTrack.audioElements).forEach((audio) => {
          if (audio) audio.pause();
        });
      }

      Object.values(leftWavesurfers.current || {}).forEach((wavesurfer) => {
        if (wavesurfer) wavesurfer.pause();
      });
      Object.values(rightWavesurfers.current || {}).forEach((wavesurfer) => {
        if (wavesurfer) wavesurfer.pause();
      });

      setPlaying({ left: false, right: false });

      const leftTurntable = document.querySelector(".left-deck .turntable");
      const rightTurntable = document.querySelector(".right-deck .turntable");
      if (leftTurntable) leftTurntable.classList.remove("playing");
      if (rightTurntable) rightTurntable.classList.remove("playing");
    };
  }, [leftTrack.audioElements, rightTrack.audioElements]);

  const handleImportSong = (deck) => {
    setDropdownOpen((prev) => ({
      ...prev,
      [deck]: !prev[deck],
    }));
  };

  const handleTrackSelect = async (track, deck) => {
    const wavesurfers = deck === "left" ? leftWavesurfers : rightWavesurfers;
    const setTrackState = deck === "left" ? setLeftTrack : setRightTrack;
    const trackState = deck === "left" ? leftTrack : rightTrack;

    const turntable = document.querySelector(`.${deck}-deck .turntable`);
    if (turntable) turntable.classList.remove("playing");

    if (trackState.audioElements) {
      Object.values(trackState.audioElements).forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    }

    Object.values(wavesurfers.current || {}).forEach((wavesurfer) => {
      if (wavesurfer) {
        wavesurfer.pause();
        wavesurfer.seekTo(0);
      }
    });

    // Always use the new track's original BPM
    const newRate = 1.0; // Reset playback rate to original speed
    const audioElements = {};

    for (const stem of STEM_TYPES) {
      const audio = new Audio();
      audio.src = `/assets/processed/${track.path}/${track.path}_${stem}.mp3`;
      audio.volume = 1;
      audio.muted = false;
      audio.playbackRate = newRate;
      audioElements[stem] = audio;
      await new Promise((resolve) => audio.addEventListener("loadeddata", resolve));
    }

    // Load waveforms
    if (Object.keys(wavesurfers.current).length > 0) {
      const loadPromises = STEM_TYPES.map(async (stem) => {
        const url = `/assets/processed/${track.path}/${track.path}_${stem}.mp3`;
        try {
          await wavesurfers.current[stem].load(url);
          wavesurfers.current[stem].setVolume(0);
          wavesurfers.current[stem].setPlaybackRate(newRate);
          const mediaElement = wavesurfers.current[stem].getMediaElement();
          if (mediaElement) {
            mediaElement.volume = 0;
            mediaElement.muted = true;
            mediaElement.playbackRate = newRate;
          }
        } catch (error) {
          console.error(`Error loading waveform for ${stem}:`, error);
        }
      });
      await Promise.all(loadPromises);
    }

    // Sync audio timing
    const stems = Object.entries(audioElements);
    stems.forEach(([stem, audio], index) => {
      if (index === 0) {
        audio.addEventListener("timeupdate", () => {
          stems.slice(1).forEach(([_, otherAudio]) => {
            if (Math.abs(otherAudio.currentTime - audio.currentTime) > 0.1) {
              otherAudio.currentTime = audio.currentTime;
            }
          });
        });
      }
    });

    setTrackState((prev) => ({
      ...prev,
      name: track.name,
      key: track.key,
      bpm: track.bpm, // Use the original BPM from the track
      audioElements,
      effectsEnabled: {
        bass: true,
        drums: true,
        melody: true,
        vocals: true,
      },
    }));

    setDropdownOpen((prev) => ({ ...prev, [deck]: false }));
  };

  const handleBPMChange = (deck, value) => {
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const setTrackState = deck === "left" ? setLeftTrack : setRightTrack;
    const wavesurfers = deck === "left" ? leftWavesurfers : rightWavesurfers;

    if (!wavesurfers.current || !trackState.name) return;

    const originalBPM = trackState.name
      ? tracks.find((t) => t.name === trackState.name)?.bpm || 120
      : 120;
    const newRate = value / originalBPM;

    Object.values(wavesurfers.current).forEach((wavesurfer) => {
      wavesurfer.setPlaybackRate(newRate);
    });
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
      <div
        className="dj-page"
        onClick={(e) => {
          if (!e.target.closest(".import-container")) {
            setDropdownOpen({ left: false, right: false });
          }
        }}
      >
        <div className="top-bar">
          <div className="deck-controls">
            <div className="import-container">
              <button
                className="import-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleImportSong("left");
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
                        handleTrackSelect(track, "left");
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
                  handleImportSong("right");
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
                        handleTrackSelect(track, "right");
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
              <img
                className="turntable-image"
                src="/assets/chill-guy-head.webp"
                alt="Chill Guy DJ"
              />
            </div>
            <div className="bpm-slider-container-left">
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

            <div className="deck-row left-deck-row">
              <div className="playback-section">
                <div className="playback-controls">
                  <button
                    className={`cue-btn cue-btn-left ${isCueing.left ? "active" : ""}`}
                    onMouseDown={() => handleCueDown("left")}
                    onMouseUp={() => handleCueUp("left")}
                    onMouseLeave={() => isCueing.left && handleCueUp("left")}
                  >
                    <span className="cue-symbol">CUE</span>
                  </button>
                  <button
                    className={`play-btn play-btn-left ${playing.left ? "playing" : ""}`}
                    onMouseDown={() => handlePlayDown("left")}
                    onMouseUp={() => handlePlayUp("left")}
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
                        onClick={() => handleEffectToggle("left", effect)}
                      >
                        <div className="effect-content"></div>
                      </button>
                      <span className="effect-label">{effect}</span>
                    </div>
                  );
                })}
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
              <img
                className="turntable-image"
                src="/assets/chill-guy-head.webp"
                alt="Chill Guy DJ"
              />
            </div>
            <div className="bpm-slider-container-right">
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
                        onClick={() => handleEffectToggle("right", effect)}
                      >
                        <div className="effect-content"></div>
                      </button>
                      <span className="effect-label">{effect}</span>
                    </div>
                  );
                })}
              </div>

              <div className="playback-section">
                <div className="playback-controls">
                  <button
                    className={`cue-btn cue-btn-right ${isCueing.right ? "active" : ""}`}
                    onMouseDown={() => handleCueDown("right")}
                    onMouseUp={() => handleCueUp("right")}
                    onMouseLeave={() => isCueing.right && handleCueUp("right")}
                  >
                    <span className="cue-symbol">CUE</span>
                  </button>
                  <button
                    className={`play-btn play-btn-right ${playing.right ? "playing" : ""}`}
                    onMouseDown={() => handlePlayDown("right")}
                    onMouseUp={() => handlePlayUp("right")}
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
    </>
  );
};

export default DJ;
