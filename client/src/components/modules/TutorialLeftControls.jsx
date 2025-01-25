import React, { useState } from "react";
import "../pages/DJ.css";
import { Popover, Text } from "@mantine/core";

const TutorialLeftControls = ({ enableHover = true }) => {
  const [turntableOpened, setTurntableOpened] = useState(false);
  const [bpmOpened, setBpmOpened] = useState(false);
  const [volumeOpened, setVolumeOpened] = useState(false);
  const [cueOpened, setCueOpened] = useState(false);
  const [playOpened, setPlayOpened] = useState(false);
  const [effectsOpened, setEffectsOpened] = useState(false);

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
      background: "rgba(0, 0, 0, 0.3)",
      fontFamily: "var(--josefin)",
      color: "white",
    },
    arrow: {
      background: "rgba(0, 0, 0, 0.3)",
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
              <input type="range" className="bpm-slider bpm-slider-left" min="60" max="180" />

              <div className="bpm-display bpm-display-left"> BPM</div>
            </div>
          </Popover.Target>
          <Popover.Dropdown>
            <Text ta="center">
              allows for users to change the beats per minute (bpm) of the left imported song
              (range: 60-180 bpm)
            </Text>
          </Popover.Dropdown>
        </Popover>
        <Popover
          width={300}
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
            <Text ta="center"> turntable that syncs with left track's bpm</Text>
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
              <input type="range" className="volume-slider volume-slider-left" min="0" max="100" />

              <div className="volume-display volume-display-left"> VOL</div>
            </div>
          </Popover.Target>
          <Popover.Dropdown>
            <Text ta="center">allows for users to change the volume of the left imported song</Text>
          </Popover.Dropdown>
        </Popover>
      </div>

      <div className="deck-row left-deck-row">
        <div className="playback-section">
          <div className="playback-controls">
            <Popover
              width={350}
              position="top"
              closeOnClickOutside={false}
              withArrow
              opened={cueOpened}
              onClose={() => handleMouseLeave(setCueOpened)}
              styles={popoverStyles}
            >
              <Popover.Target>
                <button
                  className="cue-btn cue-btn-left"
                  onMouseEnter={() => handleMouseEnter(setCueOpened)}
                  onMouseLeave={() => handleMouseLeave(setCueOpened)}
                >
                  <span className="cue-symbol">CUE</span>
                  <span className="playback-text">(T)</span>
                </button>
              </Popover.Target>
              <Popover.Dropdown>
                <Text ta="center">
                  allows users to come back to a certain part of the left track. press the button to
                  set a cue point, then when pressed again, the left track will jump back to marked
                  location.
                </Text>
              </Popover.Dropdown>
            </Popover>

            <Popover
              width={200}
              position="bottom"
              closeOnClickOutside={false}
              withArrow
              opened={playOpened}
              onClose={() => handleMouseLeave(setPlayOpened)}
              styles={popoverStyles}
            >
              <Popover.Target>
                <button
                  className="play-btn play-btn-left"
                  onMouseEnter={() => handleMouseEnter(setPlayOpened)}
                  onMouseLeave={() => handleMouseLeave(setPlayOpened)}
                >
                  <div className="play-symbol">
                    <span>▶</span>
                    <span className="playback-text">(Y)</span>
                  </div>
                </button>
              </Popover.Target>
              <Popover.Dropdown>
                <Text ta="center">play / pause toggle for the left track!</Text>
              </Popover.Dropdown>
            </Popover>
          </div>
        </div>

        <Popover
          width={175}
          position="right"
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
                  left: { bass: "Q", drums: "W", melody: "E", vocals: "R" },
                  right: { bass: "U", drums: "I", melody: "O", vocals: "P" },
                };
                return (
                  <div key={effect} className="effect-button-container">
                    <div className="hotkey-indicator hotkey">
                      <span className="hotkey-text">{hotkey.left[effect]}</span>
                    </div>
                    <button className="effect-btn" />
                    <span className="effect-label">{effect}</span>
                  </div>
                );
              })}
            </div>
          </Popover.Target>
          <Popover.Dropdown>
            <Text ta="center">
              controls the 4 stems of the left track. pressing on the button or the hotkey toggles
              the mute / unmute
            </Text>
          </Popover.Dropdown>
        </Popover>
      </div>
    </div>
  );
};

export default TutorialLeftControls;
