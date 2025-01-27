import React, { useState, useEffect, useRef, useCallback } from "react";
import WaveSurfer from "wavesurfer.js/dist/wavesurfer.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js";
import NavBar from "../modules/NavBar";
import "./DJ.css";
import { get } from "../../utilities";
import useRequireLogin from "../../hooks/useRequireLogin";
import LoginOverlay from "../modules/LoginOverlay";

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

const STEM_TYPE_MAP = {
  bass: "bass",
  drums: "drums",
  melody: "other",
  vocals: "vocals",
};

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

  const wavesurfer = WaveSurfer.create({
    container,
    waveColor: options.waveColor || "rgba(255, 255, 255, 0.5)",
    progressColor: options.progressColor || "#fff",
    cursorColor: options.cursorColor || "#ffffff",
    height: 70,
    responsive: true,
    normalize: true,
    minPxPerSec: 50,
    fillParent: true,
    scrollParent: true,
    autoCenter: true,
    drag: true,
    hideScrollbar: true,
    plugins: options.showTimeline ? [timeline] : [],
    backend: "MediaElement",
    mediaControls: false,
    interact: options.interact !== undefined ? options.interact : true,
    dragToSeek: true,
    pixelRatio: 1,
    autoScroll: true,
    partialRender: true,
    waveColor: options.hideWaveform ? "rgba(0,0,0,0)" : options.waveColor,
    progressColor: options.hideWaveform ? "rgba(0,0,0,0)" : options.progressColor,
  });

  // Create and configure the media element
  const audio = document.createElement("audio");
  audio.preservesPitch = true;
  wavesurfer.setMediaElement(audio);

  return wavesurfer;
};

const DJ = () => {
  const isLoggedIn = useRequireLogin();
  const [tracks, setTracks] = useState(AVAILABLE_TRACKS);
  const [userSongs, setUserSongs] = useState([]);
  const [isLoading, setIsLoading] = useState({
    left: false,
    right: false,
  });
  const [leftTrack, setLeftTrack] = useState({
    name: "",
    path: "",
    key: "",
    bpm: null,
    originalBpm: null,
    audioElements: null,
    effectsEnabled: {
      bass: true,
      drums: true,
      melody: true,
      vocals: true,
    },
  });

  const [rightTrack, setRightTrack] = useState({
    name: "",
    path: "",
    key: "",
    bpm: null,
    originalBpm: null,
    audioElements: null,
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

  const [cuePoints, setCuePoints] = useState({
    left: 0,
    right: 0,
  });

  const [isCueing, setIsCueing] = useState({
    left: false,
    right: false,
  });

  const [cueActive, setCueActive] = useState({
    left: false,
    right: false,
  });

  const [playButtonPressed, setPlayButtonPressed] = useState({
    left: false,
    right: false,
  });

  const [cueKeyPressed, setCueKeyPressed] = useState({
    left: false,
    right: false,
  });

  const [volume, setVolume] = useState({ left: 1, right: 1 });

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

  const syncWavesurfers = useCallback((deck) => {
    const wavesurfers = deck === "left" ? leftWavesurfers : rightWavesurfers;
    if (!wavesurfers.current) return;

    // Get the first wavesurfer as reference
    const stems = Object.keys(wavesurfers.current);
    if (stems.length === 0) return;

    const referenceWavesurfer = wavesurfers.current[stems[0]];
    const referenceTime = referenceWavesurfer.getCurrentTime();

    // Sync all other wavesurfers to the reference time
    stems.forEach((stem) => {
      if (stem === stems[0]) return; // Skip reference wavesurfer
      const wavesurfer = wavesurfers.current[stem];
      const currentTime = wavesurfer.getCurrentTime();

      // Only adjust if drift is more than 5ms
      if (Math.abs(currentTime - referenceTime) > 0) {
        wavesurfer.setTime(referenceTime);
      }
    });
  }, []);

  useEffect(() => {
    let syncInterval;

    if (playing.left || playing.right) {
      // Check sync every 1 second
      syncInterval = setInterval(() => {
        if (playing.left) syncWavesurfers("left");
        if (playing.right) syncWavesurfers("right");
      }, 1000);
    }

    return () => {
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [playing, syncWavesurfers]);

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
        // Get current position - if we're cueing, use current position, otherwise use wavesurfer position
        const currentTime = isCueing[deck]
          ? wavesurfers.current.bass.getCurrentTime()
          : wavesurfers.current.bass.getCurrentTime();

        // First sync all waveforms to the exact same position
        Object.values(wavesurfers.current).forEach((wavesurfer) => {
          wavesurfer.setTime(currentTime);
        });

        // Then sync all audio elements to the same position
        Object.values(trackState.audioElements || {}).forEach((audio) => {
          if (audio) {
            audio.currentTime = currentTime;
          }
        });

        // Now play everything together
        const playPromises = Object.entries(trackState.audioElements || {}).map(([stem, audio]) => {
          if (audio) {
            audio.muted = trackState.effectsEnabled ? !trackState.effectsEnabled[stem] : false;
            return audio.play();
          }
          return Promise.resolve();
        });

        Promise.all(playPromises)
          .then(() => {
            Object.values(wavesurfers.current).forEach((wavesurfer) => {
              wavesurfer.setVolume(0);
              const mediaElement = wavesurfer.getMediaElement();
              if (mediaElement) {
                mediaElement.volume = 0;
                mediaElement.muted = true;
              }
              wavesurfer.play();
            });
          })
          .catch((e) => console.error("Error playing audio:", e));
      } else {
        // When pausing, make sure everything stops at the exact same position
        const currentTime = wavesurfers.current.bass.getCurrentTime();

        Object.values(trackState.audioElements || {}).forEach((audio) => {
          if (audio) {
            audio.pause();
            audio.currentTime = currentTime;
          }
        });

        Object.values(wavesurfers.current).forEach((wavesurfer) => {
          wavesurfer.pause();
          wavesurfer.setTime(currentTime);
        });
      }

      return { ...prev, [deck]: newPlaying };
    });
  };

  // Helper function to get file URL for user uploads only
  const getUserFileUrl = (track, stemType = null) => {
    if (stemType) {
      // Map frontend stem type to AudioShake stem type
      const apiStemType = STEM_TYPE_MAP[stemType];
      return `/api/stems/file/${track.id}/${apiStemType}`;
    }
    // Get filename from the full path
    const filename = track.path.split('/').pop();
    return `/api/uploads/${filename}`;
  };

  // Helper function to get file URL for default tracks
  const getDefaultFileUrl = (track, stemType) => {
    return `/assets/processed/${track.path}/${track.path}_${stemType}.mp3`;
  };

  const loadTrack = async (side, track) => {
    setIsLoading((prev) => ({ ...prev, [side]: true }));
    try {
      const audioElements = {};
      let stemResponse = null;

      if (track.isUserSong) {
        // For user-uploaded songs, check if stems are processed
        stemResponse = await get("/api/stems/" + track.id);
        if (stemResponse.processed) {
          // Load stems if they're ready
          for (const stemType of STEM_TYPES) {
            const audio = new Audio(getUserFileUrl(track, stemType));
            audio.preload = "auto";
            audioElements[stemType] = audio;
          }
        } else {
          // If stems aren't ready, just load the main file
          const audio = new Audio(getUserFileUrl(track));
          audio.preload = "auto";
          audioElements.main = audio;
        }
      } else {
        // Original logic for default tracks
        for (const stemType of STEM_TYPES) {
          const audio = new Audio(getDefaultFileUrl(track, stemType));
          audio.preload = "auto";
          audioElements[stemType] = audio;
        }
      }

      // Update track state
      const trackState = {
        ...track,
        audioElements,
        originalBpm: track.bpm,
        bpm: track.bpm,
        effectsEnabled: Object.fromEntries(
          Object.keys(audioElements).map((key) => [key, true])
        ),
      };

      if (side === "left") {
        setLeftTrack(trackState);
      } else {
        setRightTrack(trackState);
      }

      // Update wavesurfers
      const wavesurfers = side === "left" ? leftWavesurfers : rightWavesurfers;

      // Load audio into wavesurfers
      await Promise.all(
        Object.entries(wavesurfers.current).map(async ([stemType, wavesurfer]) => {
          if (wavesurfer && stemType !== 'timeline') { // Skip loading audio for timeline
            try {
              let audioPath;
              if (track.isUserSong) {
                // Always use stems for user songs if they're processed
                audioPath = stemResponse?.processed 
                  ? getUserFileUrl(track, stemType)
                  : getUserFileUrl(track);
              } else {
                // For default tracks, use the original path format
                audioPath = getDefaultFileUrl(track, stemType);
              }

              await new Promise((resolve, reject) => {
                wavesurfer.once('ready', resolve);
                wavesurfer.once('error', reject);
                wavesurfer.load(audioPath);
              });

              // Set playback rate
              if (track.bpm && track.originalBpm) {
                wavesurfer.setPlaybackRate(track.bpm / track.originalBpm);
              }

              // Ensure waveform starts at beginning
              wavesurfer.seekTo(0);
            } catch (error) {
              console.error(`Error loading waveform for ${stemType}:`, error);
            }
          }
        })
      );

    } catch (error) {
      console.error("Error loading track:", error);
    } finally {
      setIsLoading((prev) => ({ ...prev, [side]: false }));
    }
  };

  const handleTrackSelect = async (deck, track, shouldAutoPlay = false) => {
    // Close the dropdown immediately when a track is selected
    setDropdownOpen((prev) => ({ ...prev, [deck]: false }));

    // Clean up existing resources
    if (deck === "left") {
      if (leftTrack.audioElements) {
        Object.values(leftTrack.audioElements).forEach((audio) => {
          audio.pause();
          audio.currentTime = 0;
        });
      }

      Object.values(leftWavesurfers.current || {}).forEach((wavesurfer) => {
        if (wavesurfer) {
          wavesurfer.pause();
          wavesurfer.seekTo(0);
        }
      });
    } else {
      if (rightTrack.audioElements) {
        Object.values(rightTrack.audioElements).forEach((audio) => {
          audio.pause();
          audio.currentTime = 0;
        });
      }

      Object.values(rightWavesurfers.current || {}).forEach((wavesurfer) => {
        if (wavesurfer) {
          wavesurfer.pause();
          wavesurfer.seekTo(0);
        }
      });
    }

    await loadTrack(deck, track);

    // Only start playing if explicitly requested
    if (shouldAutoPlay) {
      handlePlayPause(deck);
    }
  };

  const handleBPMChange = (deck, value) => {
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const setTrackState = deck === "left" ? setLeftTrack : setRightTrack;
    const wavesurfers = deck === "left" ? leftWavesurfers : rightWavesurfers;

    if (!trackState.name) return;

    const newRate = value / trackState.originalBpm;

    // Store current position before changing rates
    const currentTime = Object.values(wavesurfers.current)[0].getCurrentTime();

    // Update audio elements playback rate
    Object.values(trackState.audioElements || {}).forEach((audio) => {
      if (audio) {
        audio.preservesPitch = true;
        audio.playbackRate = newRate;
      }
    });

    // Update wavesurfer playback rates and ensure synchronization
    const updatePromises = Object.values(wavesurfers.current || {}).map(async (wavesurfer) => {
      if (wavesurfer) {
        const mediaElement = wavesurfer.getMediaElement();
        if (mediaElement) {
          mediaElement.preservesPitch = true;
          mediaElement.playbackRate = newRate;
        }
        wavesurfer.setPlaybackRate(newRate);
        // Ensure all waveforms are at the same position
        wavesurfer.setTime(currentTime);
      }
    });

    Promise.all(updatePromises).then(() => {
      // After all updates are complete, ensure waveforms stay in sync
      requestAnimationFrame(() => {
        Object.values(wavesurfers.current || {}).forEach((wavesurfer) => {
          if (wavesurfer && Math.abs(wavesurfer.getCurrentTime() - currentTime) > 0) {
            wavesurfer.setTime(currentTime);
          }
        });
      });
    });

    setTrackState((prev) => ({
      ...prev,
      bpm: value,
    }));

    // Blur the slider to restore keyboard event handling
    document.activeElement.blur();
  };

  const handleEffectToggle = useCallback(
    (deck, effect) => {
      const trackState = deck === "left" ? leftTrack : rightTrack;
      const setTrackState = deck === "left" ? setLeftTrack : setRightTrack;
      const wavesurfers = deck === "left" ? leftWavesurfers : rightWavesurfers;

      if (!trackState.name) return;

      setTrackState((prev) => {
        const newEffectsEnabled = {
          ...prev.effectsEnabled,
          [effect]: !prev.effectsEnabled[effect],
        };

        // Mute/unmute the audio element
        if (trackState.audioElements && trackState.audioElements[effect]) {
          trackState.audioElements[effect].muted = !newEffectsEnabled[effect];
        }

        // Update wavesurfer colors for visualization
        if (wavesurfers.current && wavesurfers.current[effect]) {
          const isEnabled = newEffectsEnabled[effect];
          const colors = {
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
    },
    [leftTrack, rightTrack]
  );

  const handleVolumeChange = (deck, value) => {
    const normalizedValue = value / 100; // Convert percentage to decimal
    const trackState = deck === "left" ? leftTrack : rightTrack;

    // Update volume state
    setVolume((prev) => ({ ...prev, [deck]: normalizedValue }));

    // Update volume for all audio stems
    if (trackState.audioElements) {
      Object.values(trackState.audioElements).forEach((audio) => {
        if (audio) {
          audio.volume = normalizedValue;
        }
      });
    }

    // Blur the slider to restore keyboard event handling
    document.activeElement.blur();
  };

  const handleSync = () => {
    // Don't sync if either track is not loaded
    if (!leftTrack.name || !rightTrack.name) return;

    // Get the current BPM of both tracks
    const leftBPM = leftTrack.bpm;
    const rightBPM = rightTrack.bpm;

    // Use the left track's BPM as the sync target
    handleBPMChange("right", leftBPM);
  };

  const handleReset = () => {
    // Stop any playing audio and reset wavesurfers
    Object.values(leftWavesurfers.current || {}).forEach((wavesurfer) => {
      if (wavesurfer) {
        wavesurfer.pause();
        wavesurfer.seekTo(0);
        wavesurfer.empty(); // Clear the waveform
      }
    });
    Object.values(rightWavesurfers.current || {}).forEach((wavesurfer) => {
      if (wavesurfer) {
        wavesurfer.pause();
        wavesurfer.seekTo(0);
        wavesurfer.empty(); // Clear the waveform
      }
    });

    // Reset turntable animations
    const leftTurntable = document.querySelector(".left-deck .turntable");
    const rightTurntable = document.querySelector(".right-deck .turntable");
    if (leftTurntable) leftTurntable.classList.remove("playing");
    if (rightTurntable) rightTurntable.classList.remove("playing");

    // Reset all state to initial values
    setLeftTrack({
      name: "",
      key: "",
      bpm: 120,
      originalBpm: 120,
      audioElements: null,
      effectsEnabled: {
        bass: true,
        drums: true,
        melody: true,
        vocals: true,
      },
    });
    setRightTrack({
      name: "",
      key: "",
      bpm: 120,
      originalBpm: 120,
      audioElements: null,
      effectsEnabled: {
        bass: true,
        drums: true,
        melody: true,
        vocals: true,
      },
    });

    // Clear audio elements
    if (leftTrack.audioElements) {
      Object.values(leftTrack.audioElements).forEach((audio) => {
        if (audio) {
          audio.pause();
          audio.src = "";
          audio.load();
        }
      });
    }
    if (rightTrack.audioElements) {
      Object.values(rightTrack.audioElements).forEach((audio) => {
        if (audio) {
          audio.pause();
          audio.src = "";
          audio.load();
        }
      });
    }

    setPlaying({ left: false, right: false });
    setCueActive({ left: false, right: false });
    setIsCueing({ left: false, right: false });
    setDropdownOpen({ left: false, right: false });
  };

  const handleCue = (deck) => {
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const wavesurfers = deck === "left" ? leftWavesurfers : rightWavesurfers;

    if (!trackState.name || Object.keys(wavesurfers.current).length === 0) return;

    // Always get the current position
    const currentTime = wavesurfers.current.bass.getCurrentTime();

    // If track is not playing, set new cue point at current position
    if (!playing[deck]) {
      setCuePoints((prev) => ({ ...prev, [deck]: currentTime }));
    }

    // Start playback from current position
    Object.values(trackState.audioElements).forEach((audio) => {
      if (audio) {
        audio.currentTime = currentTime;
        audio.play();
      }
    });

    Object.values(wavesurfers.current).forEach((wavesurfer) => {
      wavesurfer.setTime(currentTime);
      wavesurfer.play();
    });

    // Start sync for temporary playback
    if (trackState.syncControl) {
      trackState.syncControl.start();
    }
  };

  const handleCueEnd = (deck) => {
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const wavesurfers = deck === "left" ? leftWavesurfers : rightWavesurfers;

    if (!trackState.name || Object.keys(wavesurfers.current).length === 0) return;

    // Only stop if we're not in regular playback mode
    if (!playing[deck]) {
      const cuePoint = cuePoints[deck] || 0;

      // Immediately stop playback and return to cue point
      Object.values(trackState.audioElements).forEach((audio) => {
        if (audio) {
          audio.pause();
          audio.currentTime = cuePoint;
        }
      });

      Object.values(wavesurfers.current).forEach((wavesurfer) => {
        wavesurfer.pause();
        wavesurfer.setTime(cuePoint);
      });

      // Stop sync when cue preview ends
      if (trackState.syncControl) {
        trackState.syncControl.stop();
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.target.tagName === "INPUT") return;
      if (event.repeat) return; // Prevent key repeat

      const key = event.key.toLowerCase();

      // Play/Pause controls
      if (key === "g") {
        handlePlayPause("left");
      } else if (key === "h") {
        handlePlayPause("right");
      }

      // Cue controls
      if (key === "t") {
        event.preventDefault();
        setIsCueing((prev) => ({ ...prev, left: true }));
        handleCue("left");
      } else if (key === "y") {
        event.preventDefault();
        setIsCueing((prev) => ({ ...prev, right: true }));
        handleCue("right");
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

      // Sync
      if (key === "s") {
        event.preventDefault();
        handleSync();
      }

      // Reset
      if (key === "k") {
        event.preventDefault();
        handleReset();
      }
    };

    const handleKeyUp = (event) => {
      if (event.target.tagName === "INPUT") return;

      const key = event.key.toLowerCase();

      // Play button release
      if (key === "g") {
        setPlayButtonPressed((prev) => ({ ...prev, left: false }));
      } else if (key === "h") {
        setPlayButtonPressed((prev) => ({ ...prev, right: false }));
      }

      // Cue controls
      if (key === "t") {
        event.preventDefault();
        setIsCueing((prev) => ({ ...prev, left: false }));
        handleCueEnd("left");
      } else if (key === "y") {
        event.preventDefault();
        setIsCueing((prev) => ({ ...prev, right: false }));
        handleCueEnd("right");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    handlePlayPause,
    handleEffectToggle,
    handleSync,
    handleReset,
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

      // Create timeline wavesurfer first (will be at the bottom)
      const timelineContainer = document.createElement("div");
      timelineContainer.style.position = "absolute";
      timelineContainer.style.left = "0";
      timelineContainer.style.right = "0";
      timelineContainer.style.top = "0";
      timelineContainer.style.height = "100%";
      timelineContainer.style.pointerEvents = "none";
      timelineContainer.style.zIndex = "0";
      containerRef.current.appendChild(timelineContainer);

      // Create timeline wavesurfer using bass stem
      wavesurfersRef.current.timeline = createWaveSurfer(timelineContainer, {
        waveColor: "rgba(0,0,0,0)",
        progressColor: "rgba(0,0,0,0)",
        cursorColor: "#ffffff",
        height: 70,
        interact: false,
        showTimeline: true,
        hideWaveform: true,
      });

      // Create other stem waveforms on top
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
          showTimeline: false,
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

  useEffect(() => {
    // Fetch user's songs
    if (isLoggedIn) {
      get("/api/songs").then((songs) => {
        const formattedSongs = songs.map((song) => ({
          id: song._id,
          name: song.title,
          path: song.filePath,
          isUserSong: true,
          stems: song.stems,
          bpm: 0, // You might want to extract BPM from the audio file
          key: "Unknown",
        }));
        setTracks([...AVAILABLE_TRACKS, ...formattedSongs]);
      });
    }
  }, [isLoggedIn]);

  useEffect(() => {
    // Load default tracks on mount
    const loadDefaultTracks = async () => {
      // Load left track (Chill Guy Remix)
      const leftTrackInfo = tracks.find((t) => t.path === "chill-guy-remix");
      if (leftTrackInfo) {
        await handleTrackSelect("left", leftTrackInfo, false); // false means don't auto-play
      }

      // Load right track (On & On)
      const rightTrackInfo = tracks.find((t) => t.path === "NCS_On&On");
      if (rightTrackInfo) {
        await handleTrackSelect("right", rightTrackInfo, false); // false means don't auto-play
      }
    };

    loadDefaultTracks();
  }, []); // Empty dependency array means this runs once on mount

  const handleImportSong = (deck) => {
    // Close the other deck's dropdown when opening this one
    const otherDeck = deck === "left" ? "right" : "left";
    setDropdownOpen((prev) => ({
      [deck]: !prev[deck],
      [otherDeck]: false,
    }));
  };

  return (
    <>
      {!isLoggedIn && <LoginOverlay />}
      <div className="dj-page">
        <div
          className="dj-container"
          onClick={(e) => {
            if (!e.target.closest(".import-container")) {
              setDropdownOpen({ left: false, right: false });
            }
          }}
        >
          <NavBar />
          <div className="top-bar">
            <div className="import-containers">
              <div className="import-container import-container-left">
                <div className="import-btn-container">
                  <button
                    className="import-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleImportSong("left");
                    }}
                  >
                    IMPORT SONG ▼
                  </button>
                  {isLoading.left && <div className="track-loading-spinner left" />}
                  {dropdownOpen.left && (
                    <div className="import-dropdown">
                      {tracks.map((track) => (
                        <div
                          key={track.id || track.path}
                          className="import-option"
                          onClick={() => handleTrackSelect("left", track)}
                        >
                          {track.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="track-info">
                  {leftTrack.name ? (
                    <>
                      <div className="track-name">{leftTrack.name}</div>
                      <div className="track-details">
                        BPM: {leftTrack.bpm} | Key: {leftTrack.key}
                      </div>
                    </>
                  ) : (
                    <div className="no-track">No track loaded</div>
                  )}
                </div>
              </div>

              <div className="import-container import-container-right">
                <div className="import-btn-container">
                  <button
                    className="import-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleImportSong("right");
                    }}
                  >
                    IMPORT SONG ▼
                  </button>
                  {isLoading.right && <div className="track-loading-spinner right" />}
                  {dropdownOpen.right && (
                    <div className="import-dropdown">
                      {tracks.map((track) => (
                        <div
                          key={track.id || track.path}
                          className="import-option"
                          onClick={() => handleTrackSelect("right", track)}
                        >
                          {track.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="track-info">
                  {rightTrack.name ? (
                    <>
                      <div className="track-name">{rightTrack.name}</div>
                      <div className="track-details">
                        BPM: {rightTrack.bpm} | Key: {rightTrack.key}
                      </div>
                    </>
                  ) : (
                    <div className="no-track">No track loaded</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="waveforms-section">
            <div className="waveform-container left" ref={leftContainerRef}></div>
            <div className="waveform-container right" ref={rightContainerRef}></div>
          </div>

          <div className="decks-container">
            <div className="deck left-deck">
              <div className="deck-top">
                <div className="bpm-slider-container-left">
                  <input
                    type="range"
                    className="bpm-slider"
                    min="60"
                    max="160"
                    value={leftTrack.bpm}
                    onChange={(e) => handleBPMChange("left", parseInt(e.target.value))}
                    onMouseUp={(e) => e.target.blur()}
                    disabled={!leftTrack.name || isLoading.left}
                  />
                  <div className="bpm-display">{leftTrack.bpm} BPM</div>
                </div>
                <div className="turntable">
                  <img
                    className="turntable-image"
                    src="/assets/chill-guy-head.webp"
                    alt="Chill Guy DJ"
                  />
                </div>
                <div className="volume-slider-container-left">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume.left * 100}
                    className="volume-slider"
                    onChange={(e) => handleVolumeChange("left", e.target.value)}
                    onMouseUp={(e) => e.target.blur()}
                    disabled={!leftTrack.name || isLoading.left}
                  />
                  <div className="volume-display">VOL</div>
                </div>
              </div>

              <div className="deck-row left-deck-row">
                <div className="playback-section">
                  <div className="playback-controls">
                    <button
                      className={`cue-btn cue-btn-left ${isCueing.left ? "active" : ""} ${
                        !leftTrack.name || isLoading.left ? "disabled" : ""
                      }`}
                      onMouseDown={() => handleCue("left")}
                      onMouseUp={() => handleCueEnd("left")}
                      onMouseLeave={() => handleCueEnd("left")}
                    >
                      <span className="cue-symbol">CUE</span>
                      <span className="playback-text">(T)</span>
                    </button>
                    <button
                      className={`play-btn play-btn-left ${playing.left ? "playing" : ""} ${
                        !leftTrack.name || isLoading.left ? "disabled" : ""
                      }`}
                      onClick={() => handlePlayPause("left")}
                      disabled={!leftTrack.name || isLoading.left}
                    >
                      {playing.left ? (
                        <span className="pause-symbol">
                          <span>❚❚</span>
                          <span className="playback-text">(G)</span>
                        </span>
                      ) : (
                        <span className="play-symbol">
                          <span>▶</span>
                          <span className="playback-text">(G)</span>
                        </span>
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
                          data-effect={effect}
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
              <button
                className="sync-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSync();
                }}
                disabled={!leftTrack.name || !rightTrack.name || isLoading.left || isLoading.right}
              >
                <span className="sync-text">SYNC</span>
                <span className="playback-text">(S)</span>
              </button>
              <button
                className="reset-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
              >
                <span className="reset-text">RESET</span>
                <span className="playback-text">(K)</span>
              </button>
            </div>

            <div className="deck right-deck">
              <div className="deck-top">
                <div className="volume-slider-container-right">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume.right * 100}
                    className="volume-slider"
                    onChange={(e) => handleVolumeChange("right", e.target.value)}
                    onMouseUp={(e) => e.target.blur()}
                    disabled={!rightTrack.name || isLoading.right}
                  />
                  <div className="volume-display">VOL</div>
                </div>
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
                    className="bpm-slider"
                    min="60"
                    max="160"
                    value={rightTrack.bpm}
                    onChange={(e) => handleBPMChange("right", parseInt(e.target.value))}
                    onMouseUp={(e) => e.target.blur()}
                    disabled={!rightTrack.name || isLoading.right}
                  />
                  <div className="bpm-display">{rightTrack.bpm} BPM</div>
                </div>
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
                          data-effect={effect}
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
                      className={`cue-btn cue-btn-right ${isCueing.right ? "active" : ""} ${
                        !rightTrack.name || isLoading.right ? "disabled" : ""
                      }`}
                      onMouseDown={() => handleCue("right")}
                      onMouseUp={() => handleCueEnd("right")}
                      onMouseLeave={() => handleCueEnd("right")}
                    >
                      <span className="cue-symbol">CUE</span>
                      <span className="playback-text">(Y)</span>
                    </button>
                    <button
                      className={`play-btn play-btn-right ${playing.right ? "playing" : ""} ${
                        !rightTrack.name || isLoading.right ? "disabled" : ""
                      }`}
                      onClick={() => handlePlayPause("right")}
                      disabled={!rightTrack.name || isLoading.right}
                    >
                      {playing.right ? (
                        <span className="pause-symbol">
                          <span className="playback-text">❚❚</span>
                          <span className="playback-text">(H)</span>
                        </span>
                      ) : (
                        <span className="play-symbol">
                          <span>▶</span>
                          <span className="playback-text">(H)</span>
                        </span>
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
