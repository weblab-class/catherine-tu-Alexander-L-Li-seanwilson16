import React, { useState } from "react";
import "../pages/DJ.css";
import { Popover, Text } from "@mantine/core";

const TutorialRightControls = () => {
  const [turntableOpened, setTurntableOpened] = useState(false);
  const [bpmOpened, setBpmOpened] = useState(false);
  const [volumeOpened, setVolumeOpened] = useState(false);
  const [effectsOpened, setEffectsOpened] = useState(false);
  const [cueOpened, setCueOpened] = useState(false);
  const [playOpened, setPlayOpened] = useState(false);

  const STEM_TYPES = ["bass", "drums", "melody", "vocals"];

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
    <div className="deck right-deck">
      <div className="deck-top">
        <Popover
          width={215}
          position="top"
          closeOnClickOutside={false}
          withArrow
          opened={volumeOpened}
          onClose={() => setVolumeOpened(false)}
          styles={popoverStyles}
        >
          <Popover.Target>
            <div
              className="volume-slider-container-right"
              onMouseEnter={() => setVolumeOpened(true)}
              onMouseLeave={() => setVolumeOpened(false)}
            >
              <input type="range" className="volume-slider volume-slider-right" min="0" max="100" />
              <div className="volume-display volume-display-right"> VOL</div>
            </div>
          </Popover.Target>
          <Popover.Dropdown>
            <Text ta="center">
              allows for users to change the volume of the right imported song
            </Text>
          </Popover.Dropdown>
        </Popover>
        <Popover
          width={300}
          position="top"
          closeOnClickOutside={false}
          withArrow
          opened={turntableOpened}
          onClose={() => setTurntableOpened(false)}
          styles={popoverStyles}
        >
          <Popover.Target>
            <div
              className="turntable"
              onMouseEnter={() => setTurntableOpened(true)}
              onMouseLeave={() => setTurntableOpened(false)}
            >
              <img
                className="turntable-image"
                src="/assets/chill-guy-head.webp"
                alt="Chill Guy DJ"
              />
            </div>
          </Popover.Target>
          <Popover.Dropdown>
            <Text ta="center">turntable that syncs with right track's bpm</Text>
          </Popover.Dropdown>
        </Popover>

        <Popover
          width={215}
          position="top"
          closeOnClickOutside={false}
          withArrow
          opened={bpmOpened}
          onClose={() => setBpmOpened(false)}
          styles={popoverStyles}
        >
          <Popover.Target>
            <div
              className="bpm-slider-container-right"
              onMouseEnter={() => setBpmOpened(true)}
              onMouseLeave={() => setBpmOpened(false)}
            >
              <input type="range" className="bpm-slider bpm-slider-right" min="60" max="180" />
              <div className="bpm-display bpm-display-right"> BPM</div>
            </div>
          </Popover.Target>
          <Popover.Dropdown>
            <Text ta="center">
              allows for users to change the beats per minute (bpm) of the right imported song
              (range: 60-180 bpm)
            </Text>
          </Popover.Dropdown>
        </Popover>
      </div>

      <div className="deck-row right-deck-row">
        <Popover
          width={175}
          position="left"
          closeOnClickOutside={false}
          withArrow
          opened={effectsOpened}
          onClose={() => setEffectsOpened(false)}
          styles={popoverStyles}
        >
          <Popover.Target>
            <div
              className="effect-buttons"
              onMouseEnter={() => setEffectsOpened(true)}
              onMouseLeave={() => setEffectsOpened(false)}
            >
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
                      className="effect-btn"
                      //   onClick={() => handleEffectToggle("right", effect)}
                    />
                    <span className="effect-label">{effect}</span>
                  </div>
                );
              })}
            </div>
          </Popover.Target>
          <Popover.Dropdown>
            <Text ta="center">
              controls the 4 stems of the right track. pressing on the button or the hotkey toggles
              the mute / unmute
            </Text>
          </Popover.Dropdown>
        </Popover>

        <div className="playback-section">
          <div className="playback-controls">
            <Popover
              width={350}
              position="top"
              closeOnClickOutside={false}
              withArrow
              opened={cueOpened}
              onClose={() => setCueOpened(false)}
              styles={popoverStyles}
            >
              <Popover.Target>
                <button
                  className="cue-btn cue-btn-right"
                  onMouseEnter={() => setCueOpened(true)}
                  onMouseLeave={() => setCueOpened(false)}
                >
                  <span className="cue-symbol">CUE</span>
                </button>
              </Popover.Target>
              <Popover.Dropdown>
                <Text ta="center">
                  allows users to come back to a certain part of the right track. press the button
                  to set a cue point, then when pressed again, the left track will jump back to
                  marked location.
                </Text>
              </Popover.Dropdown>
            </Popover>
            <Popover
              width={200}
              position="bottom"
              closeOnClickOutside={false}
              withArrow
              opened={playOpened}
              onClose={() => setPlayOpened(false)}
              styles={popoverStyles}
            >
              <Popover.Target>
                <button
                  className="play-btn play-btn-right"
                  onMouseEnter={() => setPlayOpened(true)}
                  onMouseLeave={() => setPlayOpened(false)}
                >
                  <span className="play-symbol">▶</span>
                </button>
              </Popover.Target>
              <Popover.Dropdown>
                <Text ta="center">play / pause toggle for the right track!</Text>
              </Popover.Dropdown>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialRightControls;
