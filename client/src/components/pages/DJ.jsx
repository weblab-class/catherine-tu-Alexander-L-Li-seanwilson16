import React, { useState, useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import "./DJ.css";

const AVAILABLE_TRACKS = [
  {
    id: 1,
    name: "Fall to Light",
    path: "NCS_Fall_to_Light",
    bpm: 128,
    key: "Am",
  },
  {
    id: 2,
    name: "On & On",
    path: "NCS_On&On",
    bpm: 120,
    key: "C",
  },
  {
    id: 3,
    name: "Chill Guy Remix",
    path: "chill-guy-remix",
    bpm: 95,
    key: "Dm",
  },
];

const STEM_TYPES = ["bass", "drums", "melody", "vocals"];

const createWaveSurfer = (container) => {
  return WaveSurfer.create({
    container,
    waveColor: "#4a9eff",
    progressColor: "#1e4976",
    cursorColor: "#ffffff",
    barWidth: 2,
    barRadius: 3,
    barGap: 3,
    height: 80,
    responsive: true,
    normalize: true,
    partialRender: true,
  });
};

const DJ = () => {
  const [tracks, setTracks] = useState(AVAILABLE_TRACKS);
  const [leftTrack, setLeftTrack] = useState({
    name: "",
    bpm: 0,
    key: "",
    volume: 100,
    audioElements: {},
    effectsEnabled: {
      bass: true,
      drums: true,
      melody: true,
      vocals: true,
    },
  });

  const [rightTrack, setRightTrack] = useState({
    name: "",
    bpm: 0,
    key: "",
    volume: 100,
    audioElements: {},
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
    // Initialize WaveSurfer instances
    if (leftContainerRef.current && !leftWavesurfer.current) {
      leftWavesurfer.current = createWaveSurfer(leftContainerRef.current);
    }

    if (rightContainerRef.current && !rightWavesurfer.current) {
      rightWavesurfer.current = createWaveSurfer(rightContainerRef.current);
    }

    return () => {
      if (leftWavesurfer.current) {
        leftWavesurfer.current.destroy();
      }
      if (rightWavesurfer.current) {
        rightWavesurfer.current.destroy();
      }
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
    for (const stem of STEM_TYPES) {
      const audio = new Audio();
      const stemName = stem === 'melody' ? 'other' : stem;
      audio.src = `/src/assets/processed/${track.path}/${track.path}_${stemName}.mp3`;
      audio.volume = trackState.volume / 100;
      audioElements[stem] = audio;

      // Sync playback of all stems
      if (stem !== "bass") {
        audioElements.bass.addEventListener("play", () => {
          audio.play();
        });
        audioElements.bass.addEventListener("pause", () => {
          audio.pause();
        });
      }
    }

    // Load the waveform
    if (waveform.current) {
      waveform.current.load(`/src/assets/processed/${track.path}/${track.path}_bass.mp3`);
    }

    setTrackState((prev) => ({
      ...prev,
      name: track.name,
      bpm: track.bpm,
      key: track.key,
      audioElements,
    }));

    setDropdownOpen((prev) => ({
      ...prev,
      [deck]: false,
    }));
  };

  const togglePlay = (deck) => {
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const waveform = deck === "left" ? leftWavesurfer : rightWavesurfer;

    if (!trackState.audioElements.bass) return;

    setPlaying((prev) => {
      const newPlaying = !prev[deck];

      if (newPlaying) {
        Object.entries(trackState.audioElements).forEach(([stem, audio]) => {
          if (trackState.effectsEnabled[stem]) {
            audio.play();
          }
        });
        waveform.current?.play();
      } else {
        Object.values(trackState.audioElements).forEach((audio) => {
          audio.pause();
        });
        waveform.current?.pause();
      }

      return {
        ...prev,
        [deck]: newPlaying,
      };
    });
  };

  const handleVolumeChange = (deck, value) => {
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const setTrackState = deck === "left" ? setLeftTrack : setRightTrack;

    Object.values(trackState.audioElements).forEach((audio) => {
      audio.volume = value / 100;
    });

    setTrackState((prev) => ({
      ...prev,
      volume: value,
    }));
  };

  const toggleEffect = (deck, effect) => {
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const setTrackState = deck === "left" ? setLeftTrack : setRightTrack;
    const isPlaying = playing[deck];

    setTrackState((prev) => {
      const newEffectsEnabled = {
        ...prev.effectsEnabled,
        [effect]: !prev.effectsEnabled[effect],
      };

      if (isPlaying) {
        if (newEffectsEnabled[effect]) {
          trackState.audioElements[effect]?.play();
        } else {
          trackState.audioElements[effect]?.pause();
        }
      }

      return {
        ...prev,
        effectsEnabled: newEffectsEnabled,
      };
    });
  };

  return (
    <div
      className="dj-container"
      onClick={(e) => {
        if (!e.target.closest(".import-container")) {
          setDropdownOpen({ left: false, right: false });
        }
      }}
    >
      <div className="top-bar">
        <div className="track-info left">
          <div className="import-container">
            <button
              className="import-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleImportSong("left");
              }}
            >
              Import Song From Library ▼
            </button>
            {dropdownOpen.left && (
              <div className="track-dropdown">
                {tracks && tracks.length > 0 ? (
                  tracks.map((track) => (
                    <button
                      key={track.id}
                      className="track-option"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectTrack("left", track);
                      }}
                    >
                      {track.name}
                    </button>
                  ))
                ) : (
                  <div className="track-option">No tracks available</div>
                )}
              </div>
            )}
          </div>
          <div>
            BPM: {leftTrack.bpm} | Key: {leftTrack.key}
            {leftTrack.name && <div>now playing: "{leftTrack.name}"</div>}
          </div>
        </div>

        <div className="track-info right">
          <div>
            BPM: {rightTrack.bpm} | Key: {rightTrack.key}
            {rightTrack.name && <div>now playing: "{rightTrack.name}"</div>}
          </div>
          <div className="import-container">
            <button
              className="import-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleImportSong("right");
              }}
            >
              Import Song From Library ▼
            </button>
            {dropdownOpen.right && (
              <div className="track-dropdown">
                {tracks && tracks.length > 0 ? (
                  tracks.map((track) => (
                    <button
                      key={track.id}
                      className="track-option"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectTrack("right", track);
                      }}
                    >
                      {track.name}
                    </button>
                  ))
                ) : (
                  <div className="track-option">No tracks available</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="decks-container">
        <div className="deck">
          <div className="waveform-container">
            <div ref={leftContainerRef}></div>
          </div>

          <div className="turntable"></div>

          <div className="controls">
            <div className="slider-container">
              <input
                type="range"
                className="slider"
                min="0"
                max="100"
                value={leftTrack.volume}
                onChange={(e) => handleVolumeChange("left", parseInt(e.target.value))}
                orientation="vertical"
              />
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

            <div className="playback-controls">
              <button className="cue-btn">CUE</button>
              <button
                className={`play-btn ${playing.left ? "playing" : ""}`}
                onClick={() => togglePlay("left")}
              >
                {playing.left ? "❚❚" : "▶"}
              </button>
            </div>
          </div>
        </div>

        <div className="deck-controls">
          <button className="sync-btn">SYNC</button>
          <button className="reset-btn">RESET</button>
        </div>

        <div className="deck">
          <div className="waveform-container">
            <div ref={rightContainerRef}></div>
          </div>

          <div className="turntable"></div>

          <div className="controls">
            <div className="slider-container">
              <input
                type="range"
                className="slider"
                min="0"
                max="100"
                value={rightTrack.volume}
                onChange={(e) => handleVolumeChange("right", parseInt(e.target.value))}
                orientation="vertical"
              />
            </div>

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

            <div className="playback-controls">
              <button className="cue-btn">CUE</button>
              <button
                className={`play-btn ${playing.right ? "playing" : ""}`}
                onClick={() => togglePlay("right")}
              >
                {playing.right ? "❚❚" : "▶"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DJ;
