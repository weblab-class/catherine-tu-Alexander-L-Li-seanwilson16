import React from "react";
import "./HelpText.css";

const walkthroughSteps = [
  {
    id: "import-left",
    text: "Click here to import a song for your left track. The songs are already downloaded and ready to go!",
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
    text: "This is your left track's waveform display. It displays the waveforms for each of the stems in your left track.",
    selector: ".waveforms-section > div:first-child",
    spotlightSize: 300
  },
  {
    id: "waveform-right",
    text: "This is your right track's waveform display. It displays the waveforms for each of the stems in your right track.",
    selector: ".waveforms-section > div:last-child",
    spotlightSize: 300
  },
  {
    id: "bpm-left",
    text: "Use these controls to adjust the BPM (speed) of your left track.",
    selector: ".deck.left-deck .bpm-slider-container-left .control-group",
    spotlightSize: 80
  },
  {
    id: "turntable-left",
    text: "This is a visual indicator of your left track's playback, with a chill twist!",
    selector: ".deck.left-deck .turntable",
    spotlightSize: 200
  },
  {
    id: "volume-left",
    text: "Use these controls to adjust the volume of your left track.",
    selector: ".deck.left-deck .volume-slider-container-left .control-group",
    spotlightSize: 80
  },
  {
    id: "volume-right",
    text: "Use these controls to adjust the volume of your right track.",
    selector: ".deck.right-deck .volume-slider-container-right .control-group",
    spotlightSize: 80
  },
  {
    id: "turntable-right",
    text: "This is a visual indicator of your right track's playback, with a chill twist!",
    selector: ".deck.right-deck .turntable",
    spotlightSize: 200
  },
  {
    id: "bpm-right",
    text: "Use these controls to adjust the BPM (speed) of your right track.",
    selector: ".deck.right-deck .bpm-slider-container-right .control-group",
    spotlightSize: 80
  },
  {
    id: "cue-left",
    text: "Hold 'T' or this button when the track is paused to make the left track play for as long as you hold cue.",
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
    spotlightSize: 240
  },
  {
    id: "effects-right",
    text: "Press 'U', 'I', 'O', or 'P' to toggle bass/drums/melody/vocals for your right track.",
    selector: ".deck.right-deck .effect-buttons",
    spotlightSize: 240
  },
  {
    id: "cue-right",
    text: "Hold 'Y' or this button when the track is paused to make the right track play for as long as you hold cue.",
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
    text: "Press 'K' or click this button to completely clear and reset the deck.",
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
