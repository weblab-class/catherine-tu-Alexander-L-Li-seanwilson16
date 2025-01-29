import React, { useState, useEffect, useRef, useCallback } from "react";
import WaveSurfer from "wavesurfer.js/dist/wavesurfer.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js";
import NavBar from "../modules/NavBar";
import Loading from "../modules/Loading";
import "./DJ.css";
import { get } from "../../utilities";
import useRequireLogin from "../../hooks/useRequireLogin";
import LoginOverlay from "../modules/LoginOverlay";
import path from "path-browserify";

const AVAILABLE_TRACKS = [
  {
    isUserSong: false,
    id: 1,
    name: "Fall to Light by Laszlo",
    path: "NCS_Fall_to_Light",
    bpm: 87,
    key: "B Major",
  },
  {
    isUserSong: false,
    id: 2,
    name: "On & On by Cartoon, Daniel Levi & Jeja",
    path: "NCS_On&On",
    bpm: 86,
    key: "B Major",
  },
  {
    isUserSong: false,
    id: 3,
    name: "Chill Guy Remix by 류서진",
    path: "chill-guy-remix",
    bpm: 80,
    key: "Ab Major",
  },
  {
    isUserSong: false,
    id: 4,
    name: "Disfigure by Blank",
    path: "Disfigure_Blank",
    bpm: 140,
    key: "B Minor",
  },
  {
    isUserSong: false,
    id: 5,
    name: "Let Me Down Slowly (Not So Good Remix) by Alec Benjamin",
    path: "Let_Me_Down_Slowly_Alec_Benjamin",
    bpm: 75,
    key: "C# Minor",
  },
  {
    isUserSong: false,
    id: 6,
    name: "Cradles by Sub Urban",
    path: "Sub_Urban",
    bpm: 79,
    key: "Bb Minor",
  },
  {
    isUserSong: false,
    id: 7,
    name: "Shine by Spektrum",
    path: "Shine",
    bpm: 128,
    key: "Ab Major",
  },
  { isUserSong: false, id: 8, name: "Vertigo by Rob Gasser & Laura Brehm", path: "Vertigo", bpm: 87, key: "G Minor" },
  {
    isUserSong: false,
    id: 9,
    name: "We Are by Jo Cohen & Whales",
    path: "We_Are",
    bpm: 128,
    key: "Ab Major",
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

  const wavesurfer = WaveSurfer.create({
    container,
    waveColor: options.waveColor || "rgba(255, 255, 255, 0.5)",
    progressColor: options.progressColor || "#fff",
    cursorColor: options.cursorColor || "#ffffff",
    height: 70,
    responsive: true,
    normalize: true,
    minPxPerSec: 200,
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
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [tracks, setTracks] = useState(AVAILABLE_TRACKS);
  const [isLoading, setIsLoading] = useState({
    left: false,
    right: false,
  });

  // Fetch user songs function
  const fetchUserSongs = useCallback(async () => {
    if (!isLoggedIn) {
      // console.log("User not logged in, skipping user songs fetch");
      return;
    }

    try {
      const response = await get("/api/songs");
      // console.log("Fetched songs from server:", response);

      const userSongs = await Promise.all(
        response.map(async (song) => {
          const baseSong = {
            isUserSong: true,
            id: song._id,
            name: song.title,
            path: song._id,
          };

          // console.log("Processing song:", {
          //   title: song.title,
          //   isUserSong: true,
          //   bpm: song.bpm,
          //   key: song.key,
          // });

          if (true) {
            try {
              // console.log(`Starting analysis for song: ${song.title}`);
              const audioUrl = `http://localhost:3000/stems/${song._id}/other_stem.wav`;
              // console.log("Fetching audio from:", audioUrl);

              const response = await fetch(audioUrl);
              if (!response.ok) {
                throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
              }

              const arrayBuffer = await response.arrayBuffer();
              // console.log("Audio file fetched, size:", arrayBuffer.byteLength);

              const audioContext = new AudioContext();
              const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
              // console.log("Audio decoded, duration:", audioBuffer.duration);

              const audioData = audioBuffer.getChannelData(0);
              const sampleRate = audioBuffer.sampleRate;

              // Analyze only first 30 seconds for efficiency
              const maxSamples = Math.min(audioData.length, 30 * sampleRate);
              const samples = audioData.slice(0, maxSamples);

              // Calculate energy values in 1024-sample windows
              const windowSize = 1024;
              const energies = [];
              for (let i = 0; i < samples.length - windowSize; i += windowSize) {
                let energy = 0;
                for (let j = 0; j < windowSize; j++) {
                  energy += Math.abs(samples[i + j]);
                }
                energies.push(energy);
              }

              // Normalize energies
              const maxEnergy = Math.max(...energies);
              const normalizedEnergies = energies.map((e) => e / maxEnergy);

              // Find peaks (beats)
              const peaks = [];
              const minPeakDistance = 12; // Minimum distance between peaks (about 200ms)
              let lastPeakIndex = -minPeakDistance;

              for (let i = 2; i < normalizedEnergies.length - 2; i++) {
                if (
                  normalizedEnergies[i] > 0.5 && // Threshold
                  normalizedEnergies[i] > normalizedEnergies[i - 1] &&
                  normalizedEnergies[i] > normalizedEnergies[i - 2] &&
                  normalizedEnergies[i] > normalizedEnergies[i + 1] &&
                  normalizedEnergies[i] > normalizedEnergies[i + 2] &&
                  i - lastPeakIndex >= minPeakDistance
                ) {
                  peaks.push(i);
                  lastPeakIndex = i;
                }
              }

              // Calculate BPM
              if (peaks.length >= 2) {
                const intervals = [];
                for (let i = 1; i < peaks.length; i++) {
                  intervals.push(peaks[i] - peaks[i - 1]);
                }

                // Convert intervals to BPM values
                const bpmValues = intervals.map(
                  (interval) => (60 * sampleRate) / (interval * windowSize)
                );

                // Get median BPM (more robust than mean)
                const sortedBpms = bpmValues.sort((a, b) => a - b);
                const medianBpm = Math.round(sortedBpms[Math.floor(sortedBpms.length / 2)]);

                // Ensure BPM is in reasonable range (60-180)
                const bpm =
                  medianBpm < 60 ? medianBpm * 2 : medianBpm > 180 ? medianBpm / 2 : medianBpm;

                // console.log(`Analysis results for ${song.title}:`, { bpm });
                return { ...baseSong, bpm, key: "C Major" };
              }

              // console.log(`Could not detect BPM for ${song.title}, using default`);
              return { ...baseSong, bpm: 120, key: "C Major" };
            } catch (error) {
              console.error(`Error analyzing song ${song.title}:`, error);
              return { ...baseSong, bpm: 120, key: "C Major" };
            }
          }
          return { ...baseSong, bpm: song.bpm || 120, key: song.key || "" };
        })
      );
      // console.log("Final processed user songs:", userSongs);
      setTracks((prevTracks) => [...userSongs, ...AVAILABLE_TRACKS]);
    } catch (err) {
      console.error("Error fetching user songs:", err);
    }
  }, [isLoggedIn]);

  // Fetch user songs when component mounts or login state changes
  useEffect(() => {
    // Reset tracks to default tracks when logged out
    if (!isLoggedIn) {
      setTracks(AVAILABLE_TRACKS);
    }
    // Fetch user songs when logged in
    fetchUserSongs();
  }, [isLoggedIn, fetchUserSongs]);

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

  const [syncEnabled, setSyncEnabled] = useState(false);

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

      // Only adjust if drift is more than 10ms
      if (Math.abs(currentTime - referenceTime) > 0.01) {
        wavesurfer.setTime(referenceTime);
      }
    });
  }, []);

  useEffect(() => {
    let syncInterval;

    if (playing.left || playing.right) {
      // Check sync every 100ms for more precise synchronization
      syncInterval = setInterval(() => {
        if (playing.left) syncWavesurfers("left");
        if (playing.right) syncWavesurfers("right");
      }, 100);
    }

    return () => {
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [playing, syncWavesurfers]);

  const handlePlayPause = (deck) => {
    // console.log("Play/Pause clicked for deck:", deck);
    const trackState = deck === "left" ? leftTrack : rightTrack;
    const wavesurfers = deck === "left" ? leftWavesurfers : rightWavesurfers;

    if (!trackState.name || Object.keys(wavesurfers.current).length === 0) return;

    setPlaying((prev) => {
      const newPlaying = { ...prev, [deck]: !prev[deck] };

      // Get all audio elements for this deck
      const audioElements = trackState.audioElements;
      // console.log("Audio elements:", audioElements);

      if (newPlaying[deck]) {
        // Get current position from the first available wavesurfer
        const currentTime = Object.values(wavesurfers.current)[0]?.getCurrentTime() || 0;

        // Play all enabled stems and sync them to the same position
        Object.entries(audioElements).forEach(([stem, audio]) => {
          if (trackState.effectsEnabled[stem]) {
            // console.log(`Playing ${stem}`);
            audio.currentTime = currentTime;
            audio.play().catch((err) => console.error(`Error playing ${stem}:`, err));
          }
        });

        // Start all wavesurfers at the same position
        Object.values(wavesurfers.current).forEach((wavesurfer) => {
          if (wavesurfer) {
            // console.log("Starting wavesurfer");
            wavesurfer.setTime(currentTime);
            wavesurfer.play();
          }
        });

        const turntable =
          deck === "left"
            ? document.querySelector(".left-deck .turntable")
            : document.querySelector(".right-deck .turntable");
        if (turntable) turntable.classList.add("playing");
      } else {
        // Get current position before pausing
        const currentTime = Object.values(wavesurfers.current)[0]?.getCurrentTime() || 0;

        // Pause all stems and sync their positions
        Object.entries(audioElements).forEach(([stem, audio]) => {
          // console.log(`Pausing ${stem}`);
          audio.pause();
          audio.currentTime = currentTime;
        });

        // Pause all wavesurfers and sync their positions
        Object.values(wavesurfers.current).forEach((wavesurfer) => {
          if (wavesurfer) {
            // console.log("Pausing wavesurfer");
            wavesurfer.pause();
            wavesurfer.setTime(currentTime);
          }
        });

        const turntable =
          deck === "left"
            ? document.querySelector(".left-deck .turntable")
            : document.querySelector(".right-deck .turntable");
        if (turntable) turntable.classList.remove("playing");
      }

      return newPlaying;
    });
  };

  const handleBPMChange = (deck, direction) => {
    const track = deck === "left" ? leftTrack : rightTrack;
    const setTrack = deck === "left" ? setLeftTrack : setRightTrack;
    const wavesurfers = deck === "left" ? leftWavesurfers : rightWavesurfers;

    if (!track.name) return;

    const currentBPM = track.bpm || track.originalBpm;
    const MIN_BPM = 60;
    const MAX_BPM = 140;

    // Calculate new BPM with constraints
    let targetBPM = direction === "up" ? currentBPM + 1 : currentBPM - 1;
    targetBPM = Math.min(Math.max(targetBPM, MIN_BPM), MAX_BPM);

    // If we're already at the limit, don't proceed
    if (targetBPM === currentBPM) return;

    // Calculate target rate based on original BPM
    const targetRate = targetBPM / track.originalBpm;

    // Get current rate
    const currentRate = Object.values(track.audioElements || {})[0]?.playbackRate || 1;

    // Animation duration in ms
    const duration = 150;
    const startTime = performance.now();

    // Update the track state immediately for UI feedback
    setTrack((prev) => ({
      ...prev,
      bpm: targetBPM,
    }));

    // Function to animate the rate change
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Use easeInOutQuad for smooth acceleration and deceleration
      const easeProgress =
        progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      // Calculate the current rate
      const rate = currentRate + (targetRate - currentRate) * easeProgress;

      // Update audio elements
      Object.values(track.audioElements || {}).forEach((audio) => {
        if (audio) {
          audio.preservesPitch = true;
          audio.playbackRate = rate;
        }
      });

      // Update wavesurfers
      Object.values(wavesurfers.current || {}).forEach((wavesurfer) => {
        if (wavesurfer) {
          const mediaElement = wavesurfer.getMediaElement();
          if (mediaElement) {
            mediaElement.preservesPitch = true;
            mediaElement.playbackRate = rate;
          }
          wavesurfer.setPlaybackRate(rate);
        }
      });

      // Continue animation if not finished
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    // Start the animation
    requestAnimationFrame(animate);

    // If sync is enabled, update the other deck
    if (syncEnabled) {
      const otherDeck = deck === "left" ? "right" : "left";
      handleBPMChange(otherDeck, direction);
    }
  };

  const handleVolumeChange = (deck, direction) => {
    const track = deck === "left" ? leftTrack : rightTrack;
    const currentVol = volume[deck];
    const newVol = Math.min(
      Math.max(direction === "up" ? currentVol + 0.1 : currentVol - 0.1, 0),
      1
    );

    // If we're already at the limit, don't proceed
    if (newVol === currentVol) return;

    setVolume((prev) => ({
      ...prev,
      [deck]: newVol,
    }));

    // Update audio elements volume
    Object.values(track.audioElements || {}).forEach((audio) => {
      if (audio) {
        audio.volume = newVol;
      }
    });
  };

  const handleSync = () => {
    // Don't sync if either track is not loaded
    if (!leftTrack.name || !rightTrack.name) return;

    setSyncEnabled((prevSync) => {
      const newSyncEnabled = !prevSync;

      if (newSyncEnabled) {
        const leftBPM = leftTrack.bpm;
        const rightBPM = rightTrack.bpm;
        const targetBPM = Math.max(leftBPM, rightBPM);

        // Update both decks to the exact same BPM
        const leftRate = targetBPM / leftTrack.originalBpm;
        const rightRate = targetBPM / rightTrack.originalBpm;

        // Update left deck
        setLeftTrack((prev) => {
          // Update audio elements
          Object.values(prev.audioElements || {}).forEach((audio) => {
            if (audio) {
              audio.preservesPitch = true;
              audio.playbackRate = leftRate;
            }
          });
          // Update wavesurfers
          Object.values(leftWavesurfers.current || {}).forEach((wavesurfer) => {
            if (wavesurfer) {
              const mediaElement = wavesurfer.getMediaElement();
              if (mediaElement) {
                mediaElement.preservesPitch = true;
                mediaElement.playbackRate = leftRate;
              }
              wavesurfer.setPlaybackRate(targetBPM / 100);
            }
          });
          return {
            ...prev,
            bpm: targetBPM,
          };
        });

        // Update right deck
        setRightTrack((prev) => {
          // Update audio elements
          Object.values(prev.audioElements || {}).forEach((audio) => {
            if (audio) {
              audio.preservesPitch = true;
              audio.playbackRate = rightRate;
            }
          });
          // Update wavesurfers
          Object.values(rightWavesurfers.current || {}).forEach((wavesurfer) => {
            if (wavesurfer) {
              const mediaElement = wavesurfer.getMediaElement();
              if (mediaElement) {
                mediaElement.preservesPitch = true;
                mediaElement.playbackRate = rightRate;
              }
              wavesurfer.setPlaybackRate(targetBPM / 100);
            }
          });
          return {
            ...prev,
            bpm: targetBPM,
          };
        });
      }

      return newSyncEnabled;
    });
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

  const handleReset = () => {
    // Stop any playing audio and reset wavesurfers
    Object.values(leftWavesurfers.current || {}).forEach((wavesurfer) => {
      if (wavesurfer) {
        wavesurfer.pause();
        wavesurfer.seekTo(0);
        wavesurfer.empty();
      }
    });
    Object.values(rightWavesurfers.current || {}).forEach((wavesurfer) => {
      if (wavesurfer) {
        wavesurfer.pause();
        wavesurfer.seekTo(0);
        wavesurfer.empty();
      }
    });

    // Reset turntable animations
    const leftTurntable = document.querySelector(".left-deck .turntable");
    const rightTurntable = document.querySelector(".right-deck .turntable");
    if (leftTurntable) leftTurntable.classList.remove("playing");
    if (rightTurntable) rightTurntable.classList.remove("playing");

    // Stop and clean up all audio elements
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

    // Reset all state to initial values
    setLeftTrack({
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
    setRightTrack({
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

    // Reset all other state
    setPlaying({ left: false, right: false });
    setCueActive({ left: false, right: false });
    setIsCueing({ left: false, right: false });
    setDropdownOpen({ left: false, right: false });
    setSyncEnabled(false);
    setVolume({ left: 1, right: 1 });
    setCuePoints({ left: 0, right: 0 });
    setTimeInfo({
      left: { current: 0, total: 0 },
      right: { current: 0, total: 0 },
    });
    setIsLoading({ left: false, right: false });
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
          audio.pause();
        });
      }
      if (rightTrack.audioElements) {
        Object.values(rightTrack.audioElements).forEach((audio) => {
          audio.pause();
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

  const handleTrackSelect = async (track, deck) => {
    // console.log(`Loading track for ${deck} deck:`, track);

    try {
      // Set loading state to true at the start
      setIsLoading((prev) => ({ ...prev, [deck]: true }));

      const wavesurfers = deck === "left" ? leftWavesurfers : rightWavesurfers;
      const trackState = deck === "left" ? leftTrack : rightTrack;
      const audioElements = {};

      // Find the track in AVAILABLE_TRACKS if it exists
      const defaultTrack = AVAILABLE_TRACKS.find((t) => t.path === track.path);
      const trackBpm = defaultTrack ? defaultTrack.bpm : track.bpm || 120;
      const trackKey = defaultTrack ? defaultTrack.key : track.key || "C";

      // Close the import list
      setDropdownOpen((prev) => ({ ...prev, [deck]: false }));

      // Stop any currently playing audio
      if (trackState.audioElements) {
        Object.values(trackState.audioElements).forEach((audio) => {
          if (audio) {
            audio.pause();
            audio.currentTime = 0;
          }
        });
      }

      // Stop and reset wavesurfers
      Object.values(wavesurfers.current || {}).forEach((wavesurfer) => {
        if (wavesurfer) {
          wavesurfer.pause();
          wavesurfer.seekTo(0);
        }
      });

      const mapStemName = (stem) => {
        return stem === "melody" ? "other" : stem;
      };

      const getAudioPath = (stem) => {
        const stemFileName = mapStemName(stem);
        const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
        if (track.isUserSong === true) {
          return `${serverUrl}/stems/${track.id}/${stemFileName}_stem.wav`;
        }
        return `/assets/processed/${track.path}/${stemFileName}.wav`;
      };

      // Use trackBpm directly for initial load
      const newRate = 1.0; // Start at original speed

      // Load audio elements first
      for (const stem of STEM_TYPES) {
        // console.log(`Loading ${stem} stem from:`, getAudioPath(stem));
        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        audio.src = getAudioPath(stem);
        audio.preload = "auto";
        audio.volume = volume[deck];
        audio.preservesPitch = true;
        audio.playbackRate = newRate;
        audio.muted = trackState.effectsEnabled ? !trackState.effectsEnabled[stem] : false;

        try {
          await new Promise((resolve, reject) => {
            const loadHandler = () => {
              // console.log(`${stem} audio loaded successfully`);
              audio.removeEventListener("canplaythrough", loadHandler);
              resolve();
            };
            const errorHandler = (error) => {
              console.error(`Error loading ${stem} audio:`, error);
              audio.removeEventListener("error", errorHandler);
              reject(error);
            };
            audio.addEventListener("canplaythrough", loadHandler);
            audio.addEventListener("error", errorHandler);
          });

          audioElements[stem] = audio;
          // console.log(`Successfully loaded ${stem} stem`);
        } catch (error) {
          console.error(`Error loading ${stem} stem:`, error);
        }
      }

      // Only proceed if we have at least one stem loaded
      if (Object.keys(audioElements).length === 0) {
        console.error("No stems were loaded successfully");
        throw new Error("Failed to load any stems");
      }

      // Then load waveforms
      if (Object.keys(wavesurfers.current).length > 0) {
        await Promise.all(
          [...STEM_TYPES, "timeline"].map(async (stem) => {
            try {
              const wavesurfer = wavesurfers.current[stem];
              if (!wavesurfer) {
                console.error(`No wavesurfer found for ${stem}`);
                return;
              }

              const stemToUse = stem === "timeline" ? "bass" : stem;
              const audioPath = getAudioPath(stemToUse);

              await new Promise((resolve, reject) => {
                wavesurfer.setOptions({
                  backend: "MediaElement",
                  mediaControls: false,
                  autoplay: false,
                  normalize: true,
                  xhr: {
                    credentials: "include",
                    mode: "cors",
                  },
                });

                wavesurfer.load(audioPath);
                wavesurfer.once("ready", () => {
                  wavesurfer.setVolume(0);
                  wavesurfer.setPlaybackRate(newRate);
                  const mediaElement = wavesurfer.getMediaElement();
                  if (mediaElement) {
                    mediaElement.preservesPitch = true;
                    mediaElement.volume = 0;
                    mediaElement.muted = true;
                    mediaElement.playbackRate = newRate;
                    mediaElement.crossOrigin = "anonymous";
                  }
                  resolve();
                });
                wavesurfer.once("error", reject);
              });
              // console.log(`Successfully loaded ${stem} waveform`);
            } catch (error) {
              console.error(`Error loading waveform for ${stem}:`, error);
              throw error;
            }
          })
        );
      }

      // Update track state with the correct BPM and key
      const setTrackState = deck === "left" ? setLeftTrack : setRightTrack;
      setTrackState((prev) => ({
        ...prev,
        name: track.name,
        path: track.path,
        key: trackKey,
        bpm: trackBpm,
        originalBpm: trackBpm,
        audioElements,
        effectsEnabled: STEM_TYPES.reduce((acc, stem) => ({ ...acc, [stem]: true }), {}),
      }));
    } catch (error) {
      console.error("Error loading track:", error);
      const setTrackState = deck === "left" ? setLeftTrack : setRightTrack;
      setTrackState((prev) => ({
        ...prev,
        name: "",
        path: "",
        key: "",
        bpm: null,
        originalBpm: null,
        audioElements: {},
        effectsEnabled: {},
      }));
      throw error;
    } finally {
      // Always set loading state to false when done, whether successful or not
      setIsLoading((prev) => ({ ...prev, [deck]: false }));
    }
  };

  useEffect(() => {
    // Load default tracks on mount
    const loadDefaultTracks = async () => {
      // Load left track (Chill Guy Remix)
      const leftTrackInfo = tracks.find((t) => t.path === "chill-guy-remix");
      if (leftTrackInfo) {
        await handleTrackSelect(leftTrackInfo, "left");
      }

      // Load right track (On & On)
      const rightTrackInfo = tracks.find((t) => t.path === "NCS_On&On");
      if (rightTrackInfo) {
        await handleTrackSelect(rightTrackInfo, "right");
      }
    };

    loadDefaultTracks();
  }, []); // Empty dependency array means this runs once on mount

  const handleTrackSelectWrapper = (deck, track) => {
    handleTrackSelect(track, deck);
    setDropdownOpen((prev) => ({ ...prev, [deck]: false }));
  };

  const handleImportSong = (deck) => {
    // Close the other deck's dropdown when opening this one
    const otherDeck = deck === "left" ? "right" : "left";
    setDropdownOpen((prev) => ({
      [deck]: !prev[deck],
      [otherDeck]: false,
    }));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoadingScreen(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const renderImportDropdown = (deck) => {
    return (
      <div className="import-dropdown">
        {tracks.map((track) => (
          <button key={track.id} onClick={() => handleTrackSelect(track, deck)}>
            <div className="song-info">
              <span className="song-name">{track.name}</span>
              <span className="song-details">
                BPM: {track.bpm} | Key: {track.key}
              </span>
            </div>
          </button>
        ))}
      </div>
    );
  };

  const renderTrackInfo = (deck) => {
    const track = deck === "left" ? leftTrack : rightTrack;
    return (
      <div className="track-info">
        <div className="track-title">
          {track.name ? (
            <>
              {track.name}
              <span className="track-details">
                {" "}
                • BPM: {track.bpm} • Key: {track.key}
              </span>
            </>
          ) : (
            "No track loaded"
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {showLoadingScreen && <Loading />}
      <div className={`dj-container ${showLoadingScreen ? "hidden" : ""}`}>
        {!isLoggedIn && <LoginOverlay />}
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
                  {dropdownOpen.left && renderImportDropdown("left")}
                </div>
                {renderTrackInfo("left")}
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
                  {dropdownOpen.right && renderImportDropdown("right")}
                </div>
                {renderTrackInfo("right")}
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
                  <div className="control-group">
                    <div className="control-label">BPM</div>
                    <div className="control-buttons">
                      <button
                        className="control-button"
                        onClick={() => handleBPMChange("left", "up")}
                        style={{
                          opacity: (leftTrack.bpm || leftTrack.originalBpm) >= 140 ? 0.4 : 1,
                        }}
                      >
                        ▲
                      </button>
                      <div className="control-value">
                        {Math.round(leftTrack.bpm || leftTrack.originalBpm || 0)}
                      </div>
                      <button
                        className="control-button"
                        onClick={() => handleBPMChange("left", "down")}
                        style={{
                          opacity: (leftTrack.bpm || leftTrack.originalBpm) <= 60 ? 0.4 : 1,
                        }}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>
                <div className="turntable">
                  <img
                    className="turntable-image"
                    src="/assets/chill-guy-head.webp"
                    alt="Chill Guy DJ"
                  />
                </div>
                <div className="volume-slider-container-left">
                  <div className="control-group">
                    <div className="control-label">VOL</div>
                    <div className="control-buttons">
                      <button
                        className="control-button"
                        onClick={() => handleVolumeChange("left", "up")}
                        style={{ opacity: volume.left >= 1 ? 0.4 : 1 }}
                      >
                        ▲
                      </button>
                      <div className="control-value">{Math.round(volume.left * 100)}%</div>
                      <button
                        className="control-button"
                        onClick={() => handleVolumeChange("left", "down")}
                        style={{ opacity: volume.left <= 0 ? 0.4 : 1 }}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
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
                className={`sync-btn ${syncEnabled ? "active" : ""}`}
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
                  <div className="control-group">
                    <div className="control-label">VOL</div>
                    <div className="control-buttons">
                      <button
                        className="control-button"
                        onClick={() => handleVolumeChange("right", "up")}
                        style={{ opacity: volume.right >= 1 ? 0.4 : 1 }}
                      >
                        ▲
                      </button>
                      <div className="control-value">{Math.round(volume.right * 100)}%</div>
                      <button
                        className="control-button"
                        onClick={() => handleVolumeChange("right", "down")}
                        style={{ opacity: volume.right <= 0 ? 0.4 : 1 }}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>
                <div className="turntable">
                  <img
                    className="turntable-image"
                    src="/assets/chill-guy-head.webp"
                    alt="Chill Guy DJ"
                  />
                </div>
                <div className="bpm-slider-container-right">
                  <div className="control-group">
                    <div className="control-label">BPM</div>
                    <div className="control-buttons">
                      <button
                        className="control-button"
                        onClick={() => handleBPMChange("right", "up")}
                        style={{
                          opacity: (rightTrack.bpm || rightTrack.originalBpm) >= 140 ? 0.4 : 1,
                        }}
                      >
                        ▲
                      </button>
                      <div className="control-value">
                        {Math.round(rightTrack.bpm || rightTrack.originalBpm || 0)}
                      </div>
                      <button
                        className="control-button"
                        onClick={() => handleBPMChange("right", "down")}
                        style={{
                          opacity: (rightTrack.bpm || rightTrack.originalBpm) <= 60 ? 0.4 : 1,
                        }}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
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
                          <span>❚❚</span>
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
