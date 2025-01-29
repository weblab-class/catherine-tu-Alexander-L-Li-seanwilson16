import React from "react";
import "./HelpText.css";

const walkthroughSteps = [
  {
    id: "import-left",
    text: "Click here to import a song for your left track. You can choose any audio file from your computer.",
    selector: ".import-container-left .import-btn",
    spotlightSize: 150
  },
  {
    id: "import-right",
    text: "Click here to import a song for your right track. Mix and match different songs to create unique combinations!",
    selector: ".import-container-right .import-btn",
    spotlightSize: 150
  },
  {
    id: "waveform-left",
    text: "This is your left track's waveform display. Click anywhere on it to jump to that position in the track.",
    selector: ".waveforms-section > div:first-child",
    spotlightSize: 300
  },
  {
    id: "waveform-right",
    text: "This is your right track's waveform display. Like the left track, you can click anywhere to jump to that position.",
    selector: ".waveforms-section > div:last-child",
    spotlightSize: 300
  },
  {
    id: "bpm-left",
    text: "Adjust the BPM (speed) of your left track. This will affect how fast the track plays.",
    selector: ".deck.left-deck .bpm-slider-container-left",
    spotlightSize: 150
  },
  {
    id: "turntable-left",
    text: "Click and drag to scratch your left track, just like a real turntable!",
    selector: ".deck.left-deck .turntable",
    spotlightSize: 200
  },
  {
    id: "volume-left",
    text: "Adjust the volume of your left track. Slide up to increase, down to decrease.",
    selector: ".deck.left-deck .volume-slider",
    spotlightSize: 150
  },
  {
    id: "volume-right",
    text: "Adjust the volume of your right track. Slide up to increase, down to decrease.",
    selector: ".deck.right-deck .volume-slider",
    spotlightSize: 150
  },
  {
    id: "turntable-right",
    text: "Click and drag to scratch your right track, just like a real turntable!",
    selector: ".deck.right-deck .turntable",
    spotlightSize: 200
  },
  {
    id: "bpm-right",
    text: "Adjust the BPM (speed) of your right track independently from the left track.",
    selector: ".deck.right-deck .bpm-slider-container-right",
    spotlightSize: 150
  },
  {
    id: "cue-left",
    text: "Press 'T' or click this button to set a cue point for your left track. When playing, the track will jump back to this point.",
    selector: ".deck.left-deck .cue-btn",
    spotlightSize: 80
  },
  {
    id: "play-left",
    text: "Press 'G' or click this button to play/pause your left track.",
    selector: ".deck.left-deck .play-btn",
    spotlightSize: 80
  },
  {
    id: "effects-left",
    text: "Press 'Q', 'W', 'E', or 'R' to toggle bass/drums/melody/vocals for your left track.",
    selector: ".deck.left-deck .effect-buttons",
    spotlightSize: 200
  },
  {
    id: "effects-right",
    text: "Press 'U', 'I', 'O', or 'P' to toggle bass/drums/melody/vocals for your right track.",
    selector: ".deck.right-deck .effect-buttons",
    spotlightSize: 200
  },
  {
    id: "cue-right",
    text: "Press 'Y' or click this button to set a cue point for your right track. When playing, the track will jump back to this point.",
    selector: ".deck.right-deck .cue-btn",
    spotlightSize: 80
  },
  {
    id: "play-right",
    text: "Press 'H' or click this button to play/pause your right track.",
    selector: ".deck.right-deck .play-btn",
    spotlightSize: 80
  },
  {
    id: "sync",
    text: "Press 'S' or click this button to sync the BPM of both tracks, making them play at the same speed.",
    selector: ".deck-controls .sync-btn",
    spotlightSize: 80
  },
  {
    id: "reset",
    text: "Press 'K' or click this button to reset both tracks to their original state.",
    selector: ".deck-controls .reset-btn",
    spotlightSize: 80
  }
];

const HelpText = ({ isWalkthrough, currentStep = 0, onNext, onPrev, onToggleWalkthrough }) => {
  return (
    <div className={`help-text-container ${isWalkthrough ? 'walkthrough-mode' : ''}`}>
      {isWalkthrough ? (
        <>
          <div className="help-text-controls">
            <button
              className="help-text-button"
              onClick={onPrev}
              disabled={currentStep === 0}
            >
              ←
            </button>
            <p className="help-text">
              {walkthroughSteps[currentStep].text}
            </p>
            <button
              className="help-text-button"
              onClick={onNext}
              disabled={currentStep === walkthroughSteps.length - 1}
            >
              →
            </button>
          </div>
          <button 
            className="help-text-walkthrough" 
            onClick={onToggleWalkthrough} 
            style={{ color: "#dc3545" }}  
          >
            Exit Walkthrough
          </button>
        </>
      ) : (
        <>
          <p className="help-text">
            <strong>Hover</strong> your mouse over different elements of the deck (DJ board) OR <strong>press</strong> the corresponding keybinds on your keyboard to find out what they do!
          </p>
          <button 
            className="help-text-walkthrough" 
            onClick={onToggleWalkthrough} 
            style={{ color: "#007bff" }}  
          >
            Start Walkthrough
          </button>
        </>
      )}
    </div>
  );
};

export { HelpText as default, walkthroughSteps };
