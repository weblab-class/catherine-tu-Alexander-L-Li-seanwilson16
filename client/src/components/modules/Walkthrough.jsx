import React, { useState, useEffect } from "react";
import "./Walkthrough.css";

const walkthroughSteps = [
  {
    id: "waveform-left",
    text: "This is the left deck's waveform display. You can click anywhere on it to jump to that position in the track.",
    selector: ".left-waveform",
    spotlightSize: 300
  },
  {
    id: "waveform-right",
    text: "This is the right deck's waveform display. Like the left deck, you can click anywhere to jump to that position.",
    selector: ".right-waveform",
    spotlightSize: 300
  },
  {
    id: "cue-left",
    text: "Press 'T' or click this button to set a cue point. When playing, the track will jump back to this point.",
    selector: ".left-controls .cue-button",
    spotlightSize: 80
  },
  {
    id: "play-left",
    text: "Press 'G' or click this button to play/pause the left deck.",
    selector: ".left-controls .play-button",
    spotlightSize: 80
  },
  {
    id: "effects-left",
    text: "Press 'Q', 'W', 'E', or 'R' to apply different effects to the left deck.",
    selector: ".left-controls .effects-container",
    spotlightSize: 200
  },
  {
    id: "sync",
    text: "Press 'S' or click this button to sync the BPM of both decks.",
    selector: ".central-controls .sync-button",
    spotlightSize: 80
  },
  {
    id: "reset",
    text: "Press 'K' or click this button to reset both decks.",
    selector: ".central-controls .reset-button",
    spotlightSize: 80
  },
  {
    id: "cue-right",
    text: "Press 'Y' or click this button to set a cue point for the right deck.",
    selector: ".right-controls .cue-button",
    spotlightSize: 80
  },
  {
    id: "play-right",
    text: "Press 'H' or click this button to play/pause the right deck.",
    selector: ".right-controls .play-button",
    spotlightSize: 80
  },
  {
    id: "effects-right",
    text: "Press 'U', 'I', 'O', or 'P' to apply different effects to the right deck.",
    selector: ".right-controls .effects-container",
    spotlightSize: 200
  }
];

const Walkthrough = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightPosition, setSpotlightPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    updateSpotlightPosition();
  }, [currentStep]);

  const updateSpotlightPosition = () => {
    const element = document.querySelector(walkthroughSteps[currentStep].selector);
    if (element) {
      const rect = element.getBoundingClientRect();
      setSpotlightPosition({
        top: rect.top + rect.height / 2,
        left: rect.left + rect.width / 2,
        width: walkthroughSteps[currentStep].spotlightSize,
        height: walkthroughSteps[currentStep].spotlightSize,
      });
    }
  };

  const handleNext = () => {
    if (currentStep < walkthroughSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <>
      <div className="walkthrough-overlay">
        <div
          style={{
            position: "absolute",
            top: spotlightPosition.top - spotlightPosition.width / 2,
            left: spotlightPosition.left - spotlightPosition.height / 2,
            width: spotlightPosition.width,
            height: spotlightPosition.height,
            backgroundColor: "white",
            mixBlendMode: "screen",
            pointerEvents: "none",
            zIndex: 10001,
            borderRadius: "4px",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: spotlightPosition.top - spotlightPosition.width / 2 - 2,
            left: spotlightPosition.left - spotlightPosition.height / 2 - 2,
            width: spotlightPosition.width + 4,
            height: spotlightPosition.height + 4,
            border: "2px solid rgba(255, 255, 255, 0.8)",
            pointerEvents: "none",
            zIndex: 10001,
            borderRadius: "6px",
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
          }}
        />
      </div>
      <div className="walkthrough-navigation">
        <div className="walkthrough-controls">
          <button
            className="walkthrough-button"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            ←
          </button>
          <div className="walkthrough-text">
            {walkthroughSteps[currentStep].text}
          </div>
          <button
            className="walkthrough-button"
            onClick={handleNext}
            disabled={currentStep === walkthroughSteps.length - 1}
          >
            →
          </button>
        </div>
        <button className="walkthrough-exit" onClick={onClose}>
          Close Walkthrough
        </button>
      </div>
    </>
  );
};

export default Walkthrough;
