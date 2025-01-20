import React, { useState, useEffect, useRef, useCallback } from "react";
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
    cursorWidth: 2,
    barWidth: 2,
    barRadius: 3,
    barGap: 3,
    height: 100,
    responsive: true,
    normalize: true,
    partialRender: true,
    interact: true,
  });
};

const DJ = () => {
  const [tracks] = useState(AVAILABLE_TRACKS);
  const [leftTrack, setLeftTrack] = useState({
    name: "",
    bpm: 0,
    key: "",
    volume: 100,
    audioElements: {},
    stemMuted: {
      bass: false,
      drums: false,
      melody: false,
      vocals: false,
    },
  });

  const [rightTrack, setRightTrack] = useState({
    name: "",
    bpm: 0,
    key: "",
    volume: 100,
    audioElements: {},
    stemMuted: {
      bass: false,
      drums: false,
      melody: false,
      vocals: false,
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

  const [selectedElement, setSelectedElement] = useState(null);

  const [syncLocked, setSyncLocked] = useState(false);

  const containerRef = useRef(null);
  const leftContainerRef = useRef(null);
  const rightContainerRef = useRef(null);
  const leftWavesurfer = useRef(null);
  const rightWavesurfer = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  useEffect(() => {
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

  const togglePlay = (deck) => {
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const waveform = deck === "left" ? leftWavesurfer : rightWavesurfer;

    if (!trackState.audioElements?.bass) return;

    setPlaying((prev) => {
      const newPlaying = !prev[deck];

      if (newPlaying) {
        Object.values(trackState.audioElements).forEach((audio) => {
          setTimeout(() => audio.play(), 50);
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

  const handleImportSong = (deck) => {
    setDropdownOpen((prev) => ({
      ...prev,
      [deck]: !prev[deck],
    }));
  };

  const handleSelectTrack = async (deck, track) => {
    // Reset sync lock when new track is selected
    setSyncLocked(false);

    const audioElements = {};
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const setTrackState = deck === "left" ? setLeftTrack : setRightTrack;
    const waveform = deck === "left" ? leftWavesurfer : rightWavesurfer;
    const container = deck === "left" ? leftContainerRef.current : rightContainerRef.current;

    if (trackState.audioElements) {
      Object.values(trackState.audioElements).forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    }

    const loadedAudios = [];
    for (const stem of STEM_TYPES) {
      const audio = new Audio();
      const stemName = stem === "melody" ? "other" : stem;
      audio.src = `/src/public/assets/processed/${track.path}/${track.path}_${stemName}.mp3`;
      audio.volume = trackState.volume / 100;
      audio.muted = false;
      audioElements[stem] = audio;

      const loadPromise = new Promise((resolve) => {
        audio.addEventListener("canplaythrough", resolve, { once: true });
      });
      loadedAudios.push(loadPromise);
    }

    await Promise.all(loadedAudios);

    setDropdownOpen((prev) => ({
      ...prev,
      [deck]: false,
    }));

    setTrackState({
      ...track,
      originalBPM: track.bpm,
      volume: trackState.volume,
      audioElements,
      stemMuted: {
        bass: false,
        drums: false,
        melody: false,
        vocals: false,
      },
    });

    if (waveform.current) {
      try {
        waveform.current.destroy();
        waveform.current = createWaveSurfer(container);
        await waveform.current.load(`/src/public/assets/processed/${track.path}/${track.path}_bass.mp3`);

        const clickHandler = async (e) => {
          if (!audioElements || !waveform.current) return;

          if (playing[deck]) {
            Object.values(audioElements).forEach((audio) => audio.pause());
          }

          const rect = container.getBoundingClientRect();
          const relativeX = e.clientX - rect.left;
          const seekPercentage = relativeX / rect.width;

          waveform.current.seekTo(seekPercentage);

          const duration = waveform.current.getDuration();
          const seekTime = duration * seekPercentage;

          Object.values(audioElements).forEach((audio) => {
            audio.currentTime = seekTime;
            if (playing[deck]) {
              audio.play();
            }
          });
        };

        container.removeEventListener("click", clickHandler);
        container.addEventListener("click", clickHandler);
      } catch (error) {
        console.error("Error loading waveform:", error);
      }
    }
  };

  const toggleEffect = (deck, effect) => {
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const setTrackState = deck === "left" ? setLeftTrack : setRightTrack;

    setTrackState((prev) => {
      const newState = {
        ...prev,
        stemMuted: {
          ...prev.stemMuted,
          [effect]: !prev.stemMuted[effect],
        },
      };

      if (prev.audioElements && prev.audioElements[effect]) {
        prev.audioElements[effect].muted = newState.stemMuted[effect];
      }

      return newState;
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

  const handleBPMChange = (deck, newBpm) => {
    // Adjust playback rate for the specified deck
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const waveform = deck === "left" ? leftWavesurfer : rightWavesurfer;

    const originalBPM = trackState.originalBPM || trackState.bpm;
    const rate = newBpm / originalBPM;

    Object.values(trackState.audioElements).forEach((audio) => {
      audio.playbackRate = rate;
    });

    if (waveform.current) {
      waveform.current.setPlaybackRate(rate);
    }

    // Update BPM state for the changed deck
    if (deck === "left") {
      setLeftTrack((prev) => ({
        ...prev,
        bpm: newBpm,
      }));
      
      // If sync is locked, update right deck BPM too
      if (syncLocked && rightTrack.name) {
        const rightRate = newBpm / (rightTrack.originalBPM || rightTrack.bpm);
        Object.values(rightTrack.audioElements).forEach((audio) => {
          audio.playbackRate = rightRate;
        });
        if (rightWavesurfer.current) {
          rightWavesurfer.current.setPlaybackRate(rightRate);
        }
        setRightTrack((prev) => ({
          ...prev,
          bpm: newBpm,
        }));
      }
    } else {
      setRightTrack((prev) => ({
        ...prev,
        bpm: newBpm,
      }));
      
      // If sync is locked, update left deck BPM too
      if (syncLocked && leftTrack.name) {
        const leftRate = newBpm / (leftTrack.originalBPM || leftTrack.bpm);
        Object.values(leftTrack.audioElements).forEach((audio) => {
          audio.playbackRate = leftRate;
        });
        if (leftWavesurfer.current) {
          leftWavesurfer.current.setPlaybackRate(leftRate);
        }
        setLeftTrack((prev) => ({
          ...prev,
          bpm: newBpm,
        }));
      }
    }
  };

  const handleSync = () => {
    // Check if decks are playing and their effective volume (muted or volume = 0)
    const isLeftPlaying = playing.left && leftTrack.name;
    const isRightPlaying = playing.right && rightTrack.name;
    const isLeftMuted = Object.values(leftTrack.stemMuted).every(muted => muted) || leftTrack.volume === 0;
    const isRightMuted = Object.values(rightTrack.stemMuted).every(muted => muted) || rightTrack.volume === 0;

    // If left is playing and audible, and right is silent, sync right to left
    if (isLeftPlaying && !isLeftMuted && (isRightMuted || !isRightPlaying)) {
      handleBPMChange("right", leftTrack.bpm || leftTrack.originalBPM);
      setSyncLocked(true);
    }
    // If right is playing and audible, and left is silent, sync left to right
    else if (isRightPlaying && !isRightMuted && (isLeftMuted || !isLeftPlaying)) {
      handleBPMChange("left", rightTrack.bpm || rightTrack.originalBPM);
      setSyncLocked(true);
    }
  };

  const handleFileUpload = async (deck, file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        const track = data.track;
        handleSelectTrack(deck, track);
      } else {
        console.error("Error uploading file:", data.error);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const resetBoard = useCallback(() => {
    // Reset sync lock when board is reset
    setSyncLocked(false);
    
    if (leftTrack.audioElements) {
      Object.values(leftTrack.audioElements).forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    }
    if (rightTrack.audioElements) {
      Object.values(rightTrack.audioElements).forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    }

    if (leftWavesurfer.current) {
      leftWavesurfer.current.destroy();
      leftWavesurfer.current = createWaveSurfer(leftContainerRef.current);
    }
    if (rightWavesurfer.current) {
      rightWavesurfer.current.destroy();
      rightWavesurfer.current = createWaveSurfer(rightContainerRef.current);
    }

    setLeftTrack({
      name: "",
      bpm: 0,
      key: "",
      volume: 100,
      audioElements: {},
      stemMuted: {
        bass: false,
        drums: false,
        melody: false,
        vocals: false,
      },
    });

    setRightTrack({
      name: "",
      bpm: 0,
      key: "",
      volume: 100,
      audioElements: {},
      stemMuted: {
        bass: false,
        drums: false,
        melody: false,
        vocals: false,
      },
    });

    setPlaying({
      left: false,
      right: false,
    });

    setDropdownOpen({
      left: false,
      right: false,
    });

    setSelectedElement(null);
  }, [leftTrack.audioElements, rightTrack.audioElements]);

  const handleKeyPress = useCallback((e) => {
    switch (e.key.toLowerCase()) {
      case "q":
        toggleEffect("left", "bass");
        setSelectedElement({ type: "effect", effect: "bass", deck: "left" });
        break;
      case "w":
        toggleEffect("left", "drums");
        setSelectedElement({ type: "effect", effect: "drums", deck: "left" });
        break;
      case "e":
        toggleEffect("left", "melody");
        setSelectedElement({ type: "effect", effect: "melody", deck: "left" });
        break;
      case "r":
        toggleEffect("left", "vocals");
        setSelectedElement({ type: "effect", effect: "vocals", deck: "left" });
        break;
      case "u":
        toggleEffect("right", "bass");
        setSelectedElement({ type: "effect", effect: "bass", deck: "right" });
        break;
      case "i":
        toggleEffect("right", "drums");
        setSelectedElement({ type: "effect", effect: "drums", deck: "right" });
        break;
      case "o":
        toggleEffect("right", "melody");
        setSelectedElement({ type: "effect", effect: "melody", deck: "right" });
        break;
      case "p":
        toggleEffect("right", "vocals");
        setSelectedElement({ type: "effect", effect: "vocals", deck: "right" });
        break;
      case "a":
        togglePlay("left");
        break;
      case "j":
        togglePlay("right");
        break;
      case "z":
        setSelectedElement((prev) =>
          prev?.type === "bpm" && prev?.deck === "left"
            ? null
            : { type: "bpm", deck: "left" }
        );
        break;
      case "m":
        setSelectedElement((prev) =>
          prev?.type === "bpm" && prev?.deck === "right"
            ? null
            : { type: "bpm", deck: "right" }
        );
        break;
      case "x":
        setSelectedElement((prev) =>
          prev?.type === "volume" && prev?.deck === "left"
            ? null
            : { type: "volume", deck: "left" }
        );
        break;
      case "n":
        setSelectedElement((prev) =>
          prev?.type === "volume" && prev?.deck === "right"
            ? null
            : { type: "volume", deck: "right" }
        );
        break;
      case "h":
        handleSync();
        break;
      case "g":
        resetBoard();
        break;
      default:
        break;
    }
  }, [toggleEffect, togglePlay, leftTrack.bpm, rightTrack.bpm, playing, leftTrack.stemMuted, rightTrack.stemMuted, resetBoard]);

  const handleKeyDown = useCallback((e) => {
    if (!selectedElement) return;

    const deck = selectedElement.deck;
    
    if (selectedElement.type === "bpm") {
      const currentBPM = deck === "left" ? leftTrack.bpm : rightTrack.bpm;
      switch (e.key.toLowerCase()) {
        case "arrowup":
          e.preventDefault();
          handleBPMChange(deck, Math.min(200, (currentBPM || 120) + 1));
          break;
        case "arrowdown":
          e.preventDefault();
          handleBPMChange(deck, Math.max(60, (currentBPM || 120) - 1));
          break;
        default:
          break;
      }
    } else if (selectedElement.type === "volume") {
      const currentVolume = deck === "left" ? leftTrack.volume : rightTrack.volume;
      switch (e.key.toLowerCase()) {
        case "arrowup":
          e.preventDefault();
          handleVolumeChange(deck, Math.min(100, currentVolume + 5));
          break;
        case "arrowdown":
          e.preventDefault();
          handleVolumeChange(deck, Math.max(0, currentVolume - 5));
          break;
        default:
          break;
      }
    }
  }, [leftTrack.bpm, rightTrack.bpm, leftTrack.volume, rightTrack.volume, selectedElement]);

  useEffect(() => {
    window.addEventListener("keypress", handleKeyPress);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyPress, handleKeyDown]);

  return (
    <div
      ref={containerRef}
      className="dj-container"
      tabIndex="0"
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget)) {
          e.currentTarget.focus();
        }
      }}
      onClick={(e) => {
        if (!e.target.closest(".import-container")) {
          setDropdownOpen({ left: false, right: false });
        }
        if (containerRef.current) {
          containerRef.current.focus();
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

          <div className="slider-controls">
            <div className="slider-group">
              <div
                className={`slider-container bpm ${selectedElement?.type === "bpm" && selectedElement?.deck === "left" ? "selected" : ""}`}
              >
                <div className="slider-label">BPM (Z)</div>
                <input
                  type="range"
                  className="slider"
                  min="60"
                  max="200"
                  value={leftTrack.bpm || (leftTrack.originalBPM || 120)}
                  onChange={(e) => handleBPMChange("left", parseInt(e.target.value))}
                  orientation="vertical"
                />
              </div>
            </div>

            <div className="slider-group">
              <div
                className={`slider-container volume ${selectedElement?.type === "volume" && selectedElement?.deck === "left" ? "selected" : ""}`}
              >
                <div className="slider-label">VOL (X)</div>
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
            </div>
          </div>

          <div className="controls">
            <div className="effect-buttons">
              <button
                className={`effect-btn ${leftTrack.stemMuted.bass ? "disabled" : ""} ${selectedElement?.type === 'effect' && selectedElement?.effect === 'bass' && selectedElement?.deck === 'left' ? 'selected' : ''}`}
                onClick={() => {
                  toggleEffect("left", "bass");
                  setSelectedElement({ type: 'effect', effect: 'bass', deck: 'left' });
                }}
              >
                BASS (Q)
              </button>
              <button
                className={`effect-btn ${leftTrack.stemMuted.drums ? "disabled" : ""} ${selectedElement?.type === 'effect' && selectedElement?.effect === 'drums' && selectedElement?.deck === 'left' ? 'selected' : ''}`}
                onClick={() => {
                  toggleEffect("left", "drums");
                  setSelectedElement({ type: 'effect', effect: 'drums', deck: 'left' });
                }}
              >
                DRUMS (W)
              </button>
              <button
                className={`effect-btn ${leftTrack.stemMuted.melody ? "disabled" : ""} ${selectedElement?.type === 'effect' && selectedElement?.effect === 'melody' && selectedElement?.deck === 'left' ? 'selected' : ''}`}
                onClick={() => {
                  toggleEffect("left", "melody");
                  setSelectedElement({ type: 'effect', effect: 'melody', deck: 'left' });
                }}
              >
                MELODY (E)
              </button>
              <button
                className={`effect-btn ${leftTrack.stemMuted.vocals ? "disabled" : ""} ${selectedElement?.type === 'effect' && selectedElement?.effect === 'vocals' && selectedElement?.deck === 'left' ? 'selected' : ''}`}
                onClick={() => {
                  toggleEffect("left", "vocals");
                  setSelectedElement({ type: 'effect', effect: 'vocals', deck: 'left' });
                }}
              >
                VOCALS (R)
              </button>
            </div>

            <div className="playback-controls">
              <button className="cue-btn">CUE</button>
              <button
                className={`play-btn ${playing.left ? "playing" : ""} ${selectedElement?.type === 'play' && selectedElement?.deck === 'left' ? 'selected' : ''}`}
                onClick={() => {
                  togglePlay("left");
                  setSelectedElement({ type: 'play', deck: 'left' });
                }}
              >
                {playing.left ? "❚❚" : "▶"} (A)
              </button>
            </div>
          </div>
        </div>

        <div className="deck-controls">
          <button 
            className={`sync-btn ${syncLocked ? "active" : ""}`} 
            onClick={handleSync}
          >
            SYNC (H)
          </button>
          <button className="reset-btn" onClick={resetBoard}>RESET (G)</button>
        </div>

        <div className="deck">
          <div className="waveform-container">
            <div ref={rightContainerRef}></div>
          </div>

          <div className="turntable"></div>

          <div className="slider-controls">
            <div className="slider-group">
              <div
                className={`slider-container volume ${selectedElement?.type === "volume" && selectedElement?.deck === "right" ? "selected" : ""}`}
              >
                <div className="slider-label">VOL (N)</div>
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
            </div>

            <div className="slider-group">
              <div
                className={`slider-container bpm ${selectedElement?.type === "bpm" && selectedElement?.deck === "right" ? "selected" : ""}`}
              >
                <div className="slider-label">BPM (M)</div>
                <input
                  type="range"
                  className="slider"
                  min="60"
                  max="200"
                  value={rightTrack.bpm || (rightTrack.originalBPM || 120)}
                  onChange={(e) => handleBPMChange("right", parseInt(e.target.value))}
                  orientation="vertical"
                />
              </div>
            </div>
          </div>

          <div className="controls">
            <div className="effect-buttons">
              <button
                className={`effect-btn ${rightTrack.stemMuted.bass ? "disabled" : ""} ${selectedElement?.type === 'effect' && selectedElement?.effect === 'bass' && selectedElement?.deck === 'right' ? 'selected' : ''}`}
                onClick={() => {
                  toggleEffect("right", "bass");
                  setSelectedElement({ type: 'effect', effect: 'bass', deck: 'right' });
                }}
              >
                BASS (U)
              </button>
              <button
                className={`effect-btn ${rightTrack.stemMuted.drums ? "disabled" : ""} ${selectedElement?.type === 'effect' && selectedElement?.effect === 'drums' && selectedElement?.deck === 'right' ? 'selected' : ''}`}
                onClick={() => {
                  toggleEffect("right", "drums");
                  setSelectedElement({ type: 'effect', effect: 'drums', deck: 'right' });
                }}
              >
                DRUMS (I)
              </button>
              <button
                className={`effect-btn ${rightTrack.stemMuted.melody ? "disabled" : ""} ${selectedElement?.type === 'effect' && selectedElement?.effect === 'melody' && selectedElement?.deck === 'right' ? 'selected' : ''}`}
                onClick={() => {
                  toggleEffect("right", "melody");
                  setSelectedElement({ type: 'effect', effect: 'melody', deck: 'right' });
                }}
              >
                MELODY (O)
              </button>
              <button
                className={`effect-btn ${rightTrack.stemMuted.vocals ? "disabled" : ""} ${selectedElement?.type === 'effect' && selectedElement?.effect === 'vocals' && selectedElement?.deck === 'right' ? 'selected' : ''}`}
                onClick={() => {
                  toggleEffect("right", "vocals");
                  setSelectedElement({ type: 'effect', effect: 'vocals', deck: 'right' });
                }}
              >
                VOCALS (P)
              </button>
            </div>

            <div className="playback-controls">
              <button className="cue-btn">CUE</button>
              <button
                className={`play-btn ${playing.right ? "playing" : ""} ${selectedElement?.type === 'play' && selectedElement?.deck === 'right' ? 'selected' : ''}`}
                onClick={() => {
                  togglePlay("right");
                  setSelectedElement({ type: 'play', deck: 'right' });
                }}
              >
                {playing.right ? "❚❚" : "▶"} (J)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DJ;
