import React, { useState, useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js";
import "./DJ.css";

const AVAILABLE_TRACKS = [
  {
    id: 1,
    name: "Fall to Light",
    path: "NCS_Fall_to_Light",
    bpm: 87,
    key: "1B",
  },
  {
    id: 2,
    name: "On & On",
    path: "NCS_On&On",
    bpm: 86,
    key: "1B",
  },
  {
    id: 3,
    name: "Chill Guy Remix",
    path: "chill-guy-remix",
    bpm: 80,
    key: "4B",
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
    const initializeWaveSurfer = (containerRef, wavesurferRef) => {
      if (containerRef.current && !wavesurferRef.current) {
        wavesurferRef.current = createWaveSurfer(containerRef.current);

        // Center waveform on load
        wavesurferRef.current.on("ready", () => {
          const wrapper = wavesurferRef.current.getWrapper();
          wrapper.scrollLeft = (wrapper.scrollWidth - wrapper.clientWidth) / 2;
        });

        // Add scroll handling
        let isScrolling = false;
        let startX = 0;

        const handleMouseDown = (e) => {
          isScrolling = true;
          startX = e.clientX;
          e.preventDefault();
          e.stopPropagation();
        };

        const handleMouseMove = (e) => {
          if (!isScrolling) return;

          const dx = startX - e.clientX;
          startX = e.clientX;

          if (wavesurferRef.current) {
            const wrapper = wavesurferRef.current.getWrapper();
            wrapper.scrollLeft += dx;
          }

          e.preventDefault();
          e.stopPropagation();
        };

        const handleMouseUp = () => {
          isScrolling = false;
        };

        containerRef.current.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
          if (containerRef.current) {
            containerRef.current.removeEventListener("mousedown", handleMouseDown);
          }
        };
      }
    };

    const cleanupLeft = initializeWaveSurfer(leftContainerRef, leftWavesurfer);
    const cleanupRight = initializeWaveSurfer(rightContainerRef, rightWavesurfer);

    return () => {
      if (leftWavesurfer.current) {
        leftWavesurfer.current.destroy();
      }
      if (rightWavesurfer.current) {
        rightWavesurfer.current.destroy();
      }
      cleanupLeft?.();
      cleanupRight?.();
    };
  }, []);

  const handleImportSong = (deck) => {
    setDropdownOpen((prev) => ({
      ...prev,
      [deck]: !prev[deck],
    }));
  };

  const handleSelectTrack = async (deck, track) => {
    const audioElements = {};
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const setTrackState = deck === "left" ? setLeftTrack : setRightTrack;
    const waveform = deck === "left" ? leftWavesurfer : rightWavesurfer;

    // Stop and clean up any existing audio elements
    if (trackState.audioElements) {
      Object.values(trackState.audioElements).forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    }

    // Create new audio elements for each stem
    const loadedAudios = [];
    for (const stem of STEM_TYPES) {
      const audio = new Audio();
      const stemName = stem === "melody" ? "other" : stem;
      audio.src = `/assets/processed/${track.path}/${track.path}_${stemName}.mp3`;
      audio.volume = 1;
      // Start with all stems unmuted
      audio.muted = false;
      audioElements[stem] = audio;

      // Create a promise for each audio load
      const loadPromise = new Promise((resolve) => {
        audio.addEventListener("loadeddata", () => resolve());
      });
      loadedAudios.push(loadPromise);
    }

    // Wait for all audio elements to load
    await Promise.all(loadedAudios);

    // Set up synchronization between all stems
    const stems = Object.entries(audioElements);
    stems.forEach(([stem, audio], index) => {
      // Listen to timeupdate on the first stem (bass)
      if (index === 0) {
        audio.addEventListener("timeupdate", () => {
          // Sync all other stems to the bass stem's time
          stems.slice(1).forEach(([_, otherAudio]) => {
            if (Math.abs(otherAudio.currentTime - audio.currentTime) > 0.1) {
              otherAudio.currentTime = audio.currentTime;
            }
          });
        });
      }
    });

    // Load the waveform
    if (waveform.current) {
      waveform.current.load(`/assets/processed/${track.path}/${track.path}_bass.mp3`);
    }

    // Start with all effects enabled
    setTrackState((prev) => ({
      ...prev,
      name: track.name,
      key: track.key,
      audioElements,
      effectsEnabled: {
        bass: true,
        drums: true,
        melody: true,
        vocals: true,
      },
    }));

    // If currently playing, start playing the new track immediately
    if (playing[deck]) {
      Object.values(audioElements).forEach((audio) => {
        audio.play();
      });
    }

    setDropdownOpen((prev) => ({
      ...prev,
      [deck]: false,
    }));
  };

  const handlePlayPause = (deck) => {
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const waveform = deck === "left" ? leftWavesurfer : rightWavesurfer;

    if (!trackState.name || !waveform.current) return;

    setPlaying((prev) => {
      const newPlaying = !prev[deck];

      // Toggle the turntable animation
      const turntable = document.querySelector(`.${deck}-deck .turntable`);
      if (turntable) {
        turntable.classList.toggle("playing", newPlaying);
      }

      if (newPlaying) {
        // Start playing all stems at the same time
        Object.values(trackState.audioElements || {}).forEach((audio) => {
          if (audio) {
            audio.currentTime = waveform.current.getCurrentTime();
            if (!audio.muted) {
              audio.play();
            }
          }
        });
        waveform.current.play();
      } else {
        // Pause all stems
        Object.values(trackState.audioElements || {}).forEach((audio) => {
          if (audio) {
            audio.pause();
          }
        });
        waveform.current.pause();
      }

      return {
        ...prev,
        [deck]: newPlaying,
      };
    });
  };

  const toggleEffect = (deck, effect) => {
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const setTrackState = deck === "left" ? setLeftTrack : setRightTrack;
    const audio = trackState.audioElements?.[effect];

    if (!audio) return;

    setTrackState((prev) => {
      const newEffectsEnabled = {
        ...prev.effectsEnabled,
        [effect]: !prev.effectsEnabled[effect],
      };

      // Toggle mute state of the audio stem
      audio.muted = !newEffectsEnabled[effect];

      return {
        ...prev,
        effectsEnabled: newEffectsEnabled,
      };
    });
  };

  const handleBPMChange = (deck, value) => {
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const setTrackState = deck === "left" ? setLeftTrack : setRightTrack;
    const waveform = deck === "left" ? leftWavesurfer : rightWavesurfer;

    if (!waveform.current || !trackState.name) return;

    // Calculate playback rate based on BPM change
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
    <div
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
                      handleSelectTrack("left", track);
                      setDropdownOpen((prev) => ({ ...prev, left: false }));
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
                <div className="track-name">{leftTrack.name}</div>
                <div className="track-details">{leftTrack.key}</div>
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
                      handleSelectTrack("right", track);
                      setDropdownOpen((prev) => ({ ...prev, right: false }));
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
                <div className="track-name">{rightTrack.name}</div>
                <div className="track-details">{rightTrack.key}</div>
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
            <div className="deck-row">
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
                <button
                  className={`effect-btn ${!leftTrack.effectsEnabled.bass ? "disabled" : ""}`}
                  onClick={() => toggleEffect("left", "bass")}
                >
                  BASS
                </button>
                <button
                  className={`effect-btn ${!leftTrack.effectsEnabled.drums ? "disabled" : ""}`}
                  onClick={() => toggleEffect("left", "drums")}
                >
                  DRUMS
                </button>
                <button
                  className={`effect-btn ${!leftTrack.effectsEnabled.melody ? "disabled" : ""}`}
                  onClick={() => toggleEffect("left", "melody")}
                >
                  MELODY
                </button>
                <button
                  className={`effect-btn ${!leftTrack.effectsEnabled.vocals ? "disabled" : ""}`}
                  onClick={() => toggleEffect("left", "vocals")}
                >
                  VOCALS
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="deck-controls">
          <button className="sync-btn">SYNC</button>
          <button className="reset-btn">RESET</button>
        </div>

        <div className="deck right-deck">
          <div className="turntable">
            <img className="turntable-image" src="/assets/chill-guy-head.webp" alt="Chill Guy DJ" />
          </div>

          <div className="controls">
            <div className="deck-row">
              <div className="effect-buttons">
                <button
                  className={`effect-btn ${!rightTrack.effectsEnabled.bass ? "disabled" : ""}`}
                  onClick={() => toggleEffect("right", "bass")}
                >
                  BASS
                </button>
                <button
                  className={`effect-btn ${!rightTrack.effectsEnabled.drums ? "disabled" : ""}`}
                  onClick={() => toggleEffect("right", "drums")}
                >
                  DRUMS
                </button>
                <button
                  className={`effect-btn ${!rightTrack.effectsEnabled.melody ? "disabled" : ""}`}
                  onClick={() => toggleEffect("right", "melody")}
                >
                  MELODY
                </button>
                <button
                  className={`effect-btn ${!rightTrack.effectsEnabled.vocals ? "disabled" : ""}`}
                  onClick={() => toggleEffect("right", "vocals")}
                >
                  VOCALS
                </button>
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
