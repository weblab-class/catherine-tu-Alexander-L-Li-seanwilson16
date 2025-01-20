import React, { useState, useEffect, useRef, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js";
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
    waveColor: options.waveColor || {
      progressive: "#4a9eff",
      gradient: ["#4a9eff", "#1e4976"],
    },
    progressColor: options.progressColor || "#1e4976",
    cursorColor: "#ffffff",
    barWidth: 2,
    barRadius: 3,
    barGap: 3,
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
  const leftWavesurfers = useRef({});
  const rightWavesurfers = useRef({});

  useEffect(() => {
    const initializeWaveSurfers = async (containerRef, wavesurfersRef) => {
      console.log("Initializing wavesurfers for container:", containerRef.current);
      if (containerRef.current && Object.keys(wavesurfersRef.current).length === 0) {
        // First clear any existing content
        containerRef.current.innerHTML = "";

        const stemColors = {
          bass: {
            waveColor: "rgba(0, 0, 0, 0.9)",
            progressColor: "rgba(0, 0, 0, 1)",
            disabledColor: "rgba(128, 128, 128, 0.2)",
          },
          drums: {
            waveColor: "rgba(255, 202, 58, 0.9)",
            progressColor: "rgba(255, 202, 58, 1)",
            disabledColor: "rgba(128, 128, 128, 0.2)",
          },
          melody: {
            waveColor: "rgba(138, 201, 38, 0.9)",
            progressColor: "rgba(138, 201, 38, 1)",
            disabledColor: "rgba(128, 128, 128, 0.2)",
          },
          vocals: {
            waveColor: "rgba(255, 89, 94, 0.9)",
            progressColor: "rgba(255, 89, 94, 1)",
            disabledColor: "rgba(128, 128, 128, 0.2)",
          },
        };

        // Style the main container
        containerRef.current.style.position = "relative";
        containerRef.current.style.height = "70px";
        containerRef.current.style.width = "100%";

        // Create a single seek overlay that will sit on top
        const seekOverlay = document.createElement("div");
        seekOverlay.style.position = "absolute";
        seekOverlay.style.left = "0";
        seekOverlay.style.right = "0";
        seekOverlay.style.top = "0";
        seekOverlay.style.height = "100%";
        seekOverlay.style.zIndex = "10";
        seekOverlay.style.pointerEvents = "none"; // Initially disable pointer events

        // Create a cursor line that follows mouse movement
        const cursorLine = document.createElement("div");
        cursorLine.style.position = "absolute";
        cursorLine.style.top = "0";
        cursorLine.style.width = "2px";
        cursorLine.style.height = "100%";
        cursorLine.style.background = "#ffffff";
        cursorLine.style.display = "none";
        seekOverlay.appendChild(cursorLine);

        containerRef.current.appendChild(seekOverlay);

        // Create waveforms for each stem
        for (const [stem, colors] of Object.entries(stemColors)) {
          console.log(`Creating waveform for ${stem}`);
          const stemContainer = document.createElement("div");
          stemContainer.style.position = "absolute";
          stemContainer.style.left = "0";
          stemContainer.style.right = "0";
          stemContainer.style.top = "0";
          stemContainer.style.height = "100%";
          stemContainer.style.pointerEvents = "none"; // Disable pointer events on waveforms
          containerRef.current.appendChild(stemContainer);

          wavesurfersRef.current[stem] = createWaveSurfer(stemContainer, {
            ...colors,
            height: 70,
            cursorColor: "transparent", // Hide individual cursors
          });
        }

        // Handle seeking through the overlay
        let isMouseDown = false;

        const updateSeek = (e) => {
          const rect = seekOverlay.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const progress = x / rect.width;

          if (progress >= 0 && progress <= 1) {
            const deck = containerRef.current.classList.contains("left-deck") ? "left" : "right";
            const trackState = deck === "left" ? leftTrack : rightTrack;
            const wavesurfers = deck === "left" ? leftWavesurfers : rightWavesurfers;

            if (!trackState.name) return;

            // Update cursor line position
            cursorLine.style.left = `${x}px`;

            // Update all waveforms
            Object.values(wavesurfers.current).forEach((wavesurfer) => {
              wavesurfer.seekTo(progress);
            });

            // Update all audio elements
            Object.values(trackState.audioElements || {}).forEach((audio) => {
              if (audio) {
                const duration = audio.duration;
                audio.currentTime = duration * progress;
              }
            });
          }
        };

        const handleMouseMove = (e) => {
          if (!isMouseDown) {
            // Just update cursor line position when hovering
            const rect = seekOverlay.getBoundingClientRect();
            const x = e.clientX - rect.left;
            cursorLine.style.left = `${x}px`;
          } else {
            updateSeek(e);
          }
        };

        const handleMouseDown = (e) => {
          isMouseDown = true;
          updateSeek(e);
        };

        const handleMouseUp = () => {
          isMouseDown = false;
        };

        const handleMouseEnter = () => {
          cursorLine.style.display = "block";
        };

        const handleMouseLeave = () => {
          if (!isMouseDown) {
            cursorLine.style.display = "none";
          }
        };

        // Only enable overlay interaction when a track is loaded
        const enableSeekOverlay = () => {
          const deck = containerRef.current.classList.contains("left-deck") ? "left" : "right";
          const trackState = deck === "left" ? leftTrack : rightTrack;
          seekOverlay.style.pointerEvents = trackState.name ? "auto" : "none";
        };

        // Add event listeners
        seekOverlay.addEventListener("mousedown", handleMouseDown);
        seekOverlay.addEventListener("mousemove", handleMouseMove);
        seekOverlay.addEventListener("mouseenter", handleMouseEnter);
        seekOverlay.addEventListener("mouseleave", handleMouseLeave);
        document.addEventListener("mouseup", handleMouseUp);
        document.addEventListener("mousemove", handleMouseMove);

        // Watch for track changes to enable/disable seek overlay
        const checkTrackInterval = setInterval(enableSeekOverlay, 100);

        return () => {
          clearInterval(checkTrackInterval);
          seekOverlay.removeEventListener("mousedown", handleMouseDown);
          seekOverlay.removeEventListener("mousemove", handleMouseMove);
          seekOverlay.removeEventListener("mouseenter", handleMouseEnter);
          seekOverlay.removeEventListener("mouseleave", handleMouseLeave);
          document.removeEventListener("mouseup", handleMouseUp);
          document.removeEventListener("mousemove", handleMouseMove);
        };
      }
    };

    const cleanupLeft = initializeWaveSurfers(leftContainerRef, leftWavesurfers);
    const cleanupRight = initializeWaveSurfers(rightContainerRef, rightWavesurfers);

    return () => {
      if (cleanupLeft) cleanupLeft();
      if (cleanupRight) cleanupRight();

      Object.values(leftWavesurfers.current).forEach((wavesurfer) => {
        wavesurfer.destroy();
      });
      leftWavesurfers.current = {};

      Object.values(rightWavesurfers.current).forEach((wavesurfer) => {
        wavesurfer.destroy();
      });
      rightWavesurfers.current = {};
    };
  }, []);

  const handleImportSong = (deck) => {
    setDropdownOpen((prev) => ({
      ...prev,
      [deck]: !prev[deck],
    }));
  };

  const handleTrackSelect = async (deck, track) => {
    const audioElements = {};
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const setTrackState = deck === "left" ? setLeftTrack : setRightTrack;
    const wavesurfers = deck === "left" ? leftWavesurfers : rightWavesurfers;

    if (trackState.audioElements) {
      Object.values(trackState.audioElements).forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    }

    for (const stem of STEM_TYPES) {
      const audio = new Audio();
      audio.src = `/assets/processed/${track.path}/${track.path}_${stem}.mp3`;
      audio.volume = 1;
      audio.muted = trackState.effectsEnabled ? !trackState.effectsEnabled[stem] : false;
      audioElements[stem] = audio;

      const loadPromise = new Promise((resolve) => {
        audio.addEventListener("loadeddata", () => resolve());
      });
      await loadPromise;
    }

    try {
      const wavesurfers = deck === "left" ? leftWavesurfers : rightWavesurfers;
      if (Object.keys(wavesurfers.current).length > 0) {
        console.log("Loading waveforms for track:", track.path);
        const loadPromises = STEM_TYPES.map(async (stem) => {
          const url = `/assets/processed/${track.path}/${track.path}_${stem}.mp3`;
          console.log(`Loading waveform for ${stem} from ${url}`);
          try {
            await wavesurfers.current[stem].load(url);
            wavesurfers.current[stem].setVolume(0);
            const mediaElement = wavesurfers.current[stem].getMediaElement();
            if (mediaElement) {
              mediaElement.volume = 0;
              mediaElement.muted = true;
            }
            console.log(`Successfully loaded waveform for ${stem}`);
          } catch (error) {
            console.error(`Error loading waveform for ${stem}:`, error);
          }
        });
        await Promise.all(loadPromises);
        console.log("All waveforms loaded");
      }
    } catch (error) {
      console.error("Error loading waveforms:", error);
    }

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
      bpm: track.bpm,
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

  const handlePlayPause = (deck) => {
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const wavesurfers = deck === "left" ? leftWavesurfers : rightWavesurfers;

    if (!trackState.name || Object.keys(wavesurfers.current).length === 0) return;

    setPlaying((prev) => {
      const newPlaying = !prev[deck];

      const turntable = document.querySelector(`.${deck}-deck .turntable`);
      if (turntable) {
        turntable.classList.toggle("playing", newPlaying);
      }

      if (newPlaying) {
        const currentTime = wavesurfers.current.bass.getCurrentTime();

        Object.entries(trackState.audioElements || {}).forEach(([stem, audio]) => {
          if (audio) {
            audio.currentTime = currentTime;
            audio.muted = trackState.effectsEnabled ? !trackState.effectsEnabled[stem] : false;
            audio.play().catch((e) => console.error("Error playing audio:", e));
          }
        });

        Object.values(wavesurfers.current).forEach((wavesurfer) => {
          wavesurfer.setVolume(0);
          const mediaElement = wavesurfer.getMediaElement();
          if (mediaElement) {
            mediaElement.volume = 0;
            mediaElement.muted = true;
          }
          wavesurfer.play(currentTime);
        });
      } else {
        Object.values(trackState.audioElements || {}).forEach((audio) => {
          if (audio) {
            audio.pause();
          }
        });

        Object.values(wavesurfers.current).forEach((wavesurfer) => {
          wavesurfer.pause();
        });
      }

      return { ...prev, [deck]: newPlaying };
    });
  };

  const handleEffectToggle = (deck, effect) => {
    console.log(`Toggling ${effect} effect for ${deck} deck`);
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const setTrackState = deck === "left" ? setLeftTrack : setRightTrack;
    const wavesurfers = deck === "left" ? leftWavesurfers : rightWavesurfers;

    if (!trackState.name) return;

    setTrackState((prev) => {
      const newEffectsEnabled = {
        ...prev.effectsEnabled,
        [effect]: !prev.effectsEnabled[effect],
      };

      if (trackState.audioElements && trackState.audioElements[effect]) {
        trackState.audioElements[effect].muted = !newEffectsEnabled[effect];
      }

      // Update waveform color instead of hiding
      if (wavesurfers.current && wavesurfers.current[effect]) {
        const isEnabled = newEffectsEnabled[effect];
        const colors = {
          bass: {
            waveColor: "rgba(0, 0, 0, 0.5)",
            progressColor: "rgba(0, 0, 0, 1)",
            disabledColor: "rgba(128, 128, 128, 0.2)",
          },
          drums: {
            waveColor: "rgba(255, 202, 58, 0.5)",
            progressColor: "rgba(255, 202, 58, 1)",
            disabledColor: "rgba(128, 128, 128, 0.2)",
          },
          melody: {
            waveColor: "rgba(138, 201, 38, 0.5)",
            progressColor: "rgba(138, 201, 38, 1)",
            disabledColor: "rgba(128, 128, 128, 0.2)",
          },
          vocals: {
            waveColor: "rgba(255, 89, 94, 0.5)",
            progressColor: "rgba(255, 89, 94, 1)",
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

  useEffect(() => {
    const handleKeyPress = (event) => {
      const key = event.key.toLowerCase();

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

    document.addEventListener("keydown", handleKeyPress);

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleEffectToggle, leftTrack.name, rightTrack.name]);

  return (
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
                        onClick={() => handleEffectToggle("left", effect)}
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
                        onClick={() => handleEffectToggle("right", effect)}
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
  );
};

export default DJ;
