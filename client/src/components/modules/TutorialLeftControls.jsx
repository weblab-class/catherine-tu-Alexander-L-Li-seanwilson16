import React, { useState } from "react";
import "../pages/DJ.css";
import { Popover, Text } from "@mantine/core";

const TutorialLeftControls = ({ enableHover = true, cueOpened, playOpened, setCueOpened, setPlayOpened, bpmOpened, setBpmOpened, turntableOpened, setTurntableOpened, volumeOpened, setVolumeOpened, effectsOpened, setEffectsOpened }) => {
  const STEM_TYPES = ["bass", "drums", "melody", "vocals"];

  const handleMouseEnter = (setter) => {
    if (enableHover) {
      setter(true);
    }
  };

  const handleMouseLeave = (setter) => {
    if (enableHover) {
      setter(false);
    }
  };

  const popoverStyles = {
    dropdown: {
      background: "rgba(0, 0, 0, 0.7)",
      fontFamily: "var(--josefin)",
      color: "white",
    },
    arrow: {
      background: "rgba(0, 0, 0, 0.7)",
    },
  };

  return (
    <div className="deck left-deck">
      <div className="deck-top">
        <Popover
          width={215}
          position="top"
          closeOnClickOutside={false}
          withArrow
          opened={bpmOpened}
          onClose={() => handleMouseLeave(setBpmOpened)}
          styles={popoverStyles}
        >
          <Popover.Target>
            <div
              className="bpm-slider-container-left"
              onMouseEnter={() => handleMouseEnter(setBpmOpened)}
              onMouseLeave={() => handleMouseLeave(setBpmOpened)}
            >
              <div className="control-group">
                <div className="control-label">BPM</div>
                <div className="control-buttons">
                  <button className="control-button" disabled>▲</button>
                  <div className="control-value">120</div>
                  <button className="control-button" disabled>▼</button>
                </div>
              </div>
            </div>
          </Popover.Target>
          <Popover.Dropdown>
            <Text ta="center">Adjust the BPM (speed) of the track.</Text>
          </Popover.Dropdown>
        </Popover>

        <Popover
          width={215}
          position="top"
          closeOnClickOutside={false}
          withArrow
          opened={turntableOpened}
          onClose={() => handleMouseLeave(setTurntableOpened)}
          styles={popoverStyles}
        >
          <Popover.Target>
            <div
              className="turntable"
              onMouseEnter={() => handleMouseEnter(setTurntableOpened)}
              onMouseLeave={() => handleMouseLeave(setTurntableOpened)}
            >
              <img
                className="turntable-image"
                src="/assets/chill-guy-head.webp"
                alt="Chill Guy DJ"
              />
            </div>
          </Popover.Target>
          <Popover.Dropdown>
            <Text ta="center">Visual indicator for track playback.</Text>
          </Popover.Dropdown>
        </Popover>

        <Popover
          width={215}
          position="top"
          closeOnClickOutside={false}
          withArrow
          opened={volumeOpened}
          onClose={() => handleMouseLeave(setVolumeOpened)}
          styles={popoverStyles}
        >
          <Popover.Target>
            <div
              className="volume-slider-container-left"
              onMouseEnter={() => handleMouseEnter(setVolumeOpened)}
              onMouseLeave={() => handleMouseLeave(setVolumeOpened)}
            >
              <div className="control-group">
                <div className="control-label">VOL</div>
                <div className="control-buttons">
                  <button className="control-button" disabled>▲</button>
                  <div className="control-value">100%</div>
                  <button className="control-button" disabled>▼</button>
                </div>
              </div>
            </div>
          </Popover.Target>
          <Popover.Dropdown>
            <Text ta="center">Adjust the volume of the track.</Text>
          </Popover.Dropdown>
        </Popover>
      </div>

      <div className="deck-row">
        <div className="playback-section">
          <div className="playback-controls">
            <Popover
              width={215}
              position="top"
              closeOnClickOutside={false}
              withArrow
              opened={cueOpened}
              onClose={() => handleMouseLeave(setCueOpened)}
              styles={popoverStyles}
            >
              <Popover.Target>
                <button
                  className="cue-btn cue-btn-left tutorial-btn"
                  onMouseEnter={() => handleMouseEnter(setCueOpened)}
                  onMouseLeave={() => handleMouseLeave(setCueOpened)}
                >
                  <span className="cue-symbol">CUE</span>
                  <span className="playback-text">(T)</span>
                </button>
              </Popover.Target>
              <Popover.Dropdown>
                <Text ta="center">Click and hold to preview from the cue point.</Text>
              </Popover.Dropdown>
            </Popover>

            <Popover
              width={215}
              position="top"
              closeOnClickOutside={false}
              withArrow
              opened={playOpened}
              onClose={() => handleMouseLeave(setPlayOpened)}
              styles={popoverStyles}
            >
              <Popover.Target>
                <button
                  className="play-btn play-btn-left tutorial-btn"
                  onMouseEnter={() => handleMouseEnter(setPlayOpened)}
                  onMouseLeave={() => handleMouseLeave(setPlayOpened)}
                >
                  <div className="play-symbol">
                    <span>▶</span>
                    <span className="playback-text">(G)</span>
                  </div>
                </button>
              </Popover.Target>
              <Popover.Dropdown>
                <Text ta="center">Click to play/pause.</Text>
              </Popover.Dropdown>
            </Popover>
          </div>
        </div>

        <Popover
          width={215}
          position="top"
          closeOnClickOutside={false}
          withArrow
          opened={effectsOpened}
          onClose={() => handleMouseLeave(setEffectsOpened)}
          styles={popoverStyles}
        >
          <Popover.Target>
            <div
              className="effect-buttons"
              onMouseEnter={() => handleMouseEnter(setEffectsOpened)}
              onMouseLeave={() => handleMouseLeave(setEffectsOpened)}
            >
              {STEM_TYPES.map((effect, index) => {
                const hotkey = {
                  bass: "Q",
                  drums: "W", 
                  melody: "E",
                  vocals: "R",
                }[effect];

                return (
                  <div key={effect} className="effect-button-container">
                    <div className="hotkey-indicator hotkey">
                      <span className="hotkey-text">{hotkey}</span>
                    </div>
                    <button className={`effect-btn ${effect}-btn`} disabled />
                    <span className="effect-label">{effect}</span>
                  </div>
                );
              })}
            </div>
          </Popover.Target>
          <Popover.Dropdown>
            <Text ta="center">Toggle individual track elements.</Text>
          </Popover.Dropdown>
        </Popover>
      </div>
    </div>
  );
};

export default TutorialLeftControls;
