import "../pages/DJ.css";
import React, { useState, useEffect } from "react";
import NavBar from "../modules/NavBar";
import TutorialImportAndWaveforms from "../modules/TutorialImportAndWaveforms";
import TutorialLeftControls from "../modules/TutorialLeftControls";
import TutorialRightControls from "../modules/TutorialRightControls";
import TutorialCentralControls from "../modules/TutorialCentralControls";
import TutorialModal from "../modules/TutorialModal";

const Tutorial = () => {
  const [isModalVisible, setIsModalVisible] = useState(true);
  
  // Left deck states
  const [leftPopovers, setLeftPopovers] = useState({
    cue: false,
    play: false,
    bpm: false,
    turntable: false,
    volume: false,
    effects: false
  });

  // Right deck states
  const [rightPopovers, setRightPopovers] = useState({
    cue: false,
    play: false,
    bpm: false,
    turntable: false,
    volume: false,
    effects: false
  });

  // Central controls states
  const [centralPopovers, setCentralPopovers] = useState({
    sync: false,
    reset: false,
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.target.tagName === "INPUT") return;
      if (event.repeat) return; // Prevent key repeat

      const key = event.key.toLowerCase();

      // Left deck controls
      if (key === "t") {
        event.preventDefault();
        setLeftPopovers(prev => ({ ...prev, cue: true }));
      } else if (key === "g") {
        event.preventDefault();
        setLeftPopovers(prev => ({ ...prev, play: true }));
      }

      // Right deck controls
      if (key === "y") {
        event.preventDefault();
        setRightPopovers(prev => ({ ...prev, cue: true }));
      } else if (key === "h") {
        event.preventDefault();
        setRightPopovers(prev => ({ ...prev, play: true }));
      }

      // Central controls
      if (key === "s") {
        event.preventDefault();
        setCentralPopovers(prev => ({ ...prev, sync: true }));
      } else if (key === "k") {
        event.preventDefault();
        setCentralPopovers(prev => ({ ...prev, reset: true }));
      }

      // Left deck effects
      if (key === "q") {
        event.preventDefault();
        setLeftPopovers(prev => ({ ...prev, effects: true }));
      } else if (key === "w") {
        event.preventDefault();
        setLeftPopovers(prev => ({ ...prev, effects: true }));
      } else if (key === "e") {
        event.preventDefault();
        setLeftPopovers(prev => ({ ...prev, effects: true }));
      } else if (key === "r") {
        event.preventDefault();
        setLeftPopovers(prev => ({ ...prev, effects: true }));
      }

      // Right deck effects
      if (key === "u") {
        event.preventDefault();
        setRightPopovers(prev => ({ ...prev, effects: true }));
      } else if (key === "i") {
        event.preventDefault();
        setRightPopovers(prev => ({ ...prev, effects: true }));
      } else if (key === "o" || key === "p") {
        event.preventDefault();
        setRightPopovers(prev => ({ ...prev, effects: true }));
      }
    };

    const handleKeyUp = (event) => {
      if (event.target.tagName === "INPUT") return;

      const key = event.key.toLowerCase();

      // Left deck controls
      if (key === "t") {
        event.preventDefault();
        setLeftPopovers(prev => ({ ...prev, cue: false }));
      } else if (key === "g") {
        event.preventDefault();
        setLeftPopovers(prev => ({ ...prev, play: false }));
      }

      // Right deck controls
      if (key === "y") {
        event.preventDefault();
        setRightPopovers(prev => ({ ...prev, cue: false }));
      } else if (key === "h") {
        event.preventDefault();
        setRightPopovers(prev => ({ ...prev, play: false }));
      }

      // Central controls
      if (key === "s") {
        event.preventDefault();
        setCentralPopovers(prev => ({ ...prev, sync: false }));
      } else if (key === "k") {
        event.preventDefault();
        setCentralPopovers(prev => ({ ...prev, reset: false }));
      }

      // Left deck effects
      if (["q", "w", "e", "r"].includes(key)) {
        event.preventDefault();
        setLeftPopovers(prev => ({ ...prev, effects: false }));
      }

      // Right deck effects
      if (["u", "i", "o", "p"].includes(key)) {
        event.preventDefault();
        setRightPopovers(prev => ({ ...prev, effects: false }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <>
      <div className="dj-page">
        <TutorialModal isVisible={isModalVisible} setIsVisible={setIsModalVisible} />

        <NavBar />
        
        <TutorialImportAndWaveforms enableHover={!isModalVisible} />

        <div className="decks-container">
          <TutorialLeftControls 
            enableHover={!isModalVisible} 
            cueOpened={leftPopovers.cue}
            playOpened={leftPopovers.play}
            bpmOpened={leftPopovers.bpm}
            turntableOpened={leftPopovers.turntable}
            volumeOpened={leftPopovers.volume}
            effectsOpened={leftPopovers.effects}
            setCueOpened={(value) => setLeftPopovers(prev => ({ ...prev, cue: value }))}
            setPlayOpened={(value) => setLeftPopovers(prev => ({ ...prev, play: value }))}
            setBpmOpened={(value) => setLeftPopovers(prev => ({ ...prev, bpm: value }))}
            setTurntableOpened={(value) => setLeftPopovers(prev => ({ ...prev, turntable: value }))}
            setVolumeOpened={(value) => setLeftPopovers(prev => ({ ...prev, volume: value }))}
            setEffectsOpened={(value) => setLeftPopovers(prev => ({ ...prev, effects: value }))}
          />

          <TutorialCentralControls 
            enableHover={!isModalVisible} 
            syncOpened={centralPopovers.sync}
            resetOpened={centralPopovers.reset}
            setSyncOpened={(value) => setCentralPopovers(prev => ({ ...prev, sync: value }))}
            setResetOpened={(value) => setCentralPopovers(prev => ({ ...prev, reset: value }))}
          />

          <TutorialRightControls 
            enableHover={!isModalVisible} 
            cueOpened={rightPopovers.cue}
            playOpened={rightPopovers.play}
            bpmOpened={rightPopovers.bpm}
            turntableOpened={rightPopovers.turntable}
            volumeOpened={rightPopovers.volume}
            effectsOpened={rightPopovers.effects}
            setCueOpened={(value) => setRightPopovers(prev => ({ ...prev, cue: value }))}
            setPlayOpened={(value) => setRightPopovers(prev => ({ ...prev, play: value }))}
            setBpmOpened={(value) => setRightPopovers(prev => ({ ...prev, bpm: value }))}
            setTurntableOpened={(value) => setRightPopovers(prev => ({ ...prev, turntable: value }))}
            setVolumeOpened={(value) => setRightPopovers(prev => ({ ...prev, volume: value }))}
            setEffectsOpened={(value) => setRightPopovers(prev => ({ ...prev, effects: value }))}
          />
        </div>
      </div>
    </>
  );
};

export default Tutorial;
