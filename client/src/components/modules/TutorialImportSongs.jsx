import React, { useRef } from "react";
import "../pages/DJ.css";
import { Popover, Text } from "@mantine/core";

const TutorialImportAndWaveforms = () => {
  const leftContainerRef = useRef(null);
  const rightContainerRef = useRef(null);

  return (
    <div>
      <div className="top-bar">
        <div className="deck-controls">
          <div className="import-container">
            <Popover width={175} position="bottom" closeOnClickOutside={false} withArrow>
              <Popover.Target>
                <button className="import-btn">IMPORT SONG ▼</button>
              </Popover.Target>
              <Popover.Dropdown>
                <Text ta="center">choose a song to mix on the left deck</Text>
              </Popover.Dropdown>
            </Popover>
          </div>
          <div className="track-info">
            <div className="no-track">NO TRACK LOADED</div>
          </div>
        </div>

        <div className="deck-controls">
          <div className="import-container">
            <Popover width={175} position="bottom" closeOnClickOutside={false} withArrow>
              <Popover.Target>
                <button className="import-btn">IMPORT SONG ▼</button>
              </Popover.Target>
              <Popover.Dropdown>
                <Text ta="center">choose a song to mix on the right deck</Text>
              </Popover.Dropdown>
            </Popover>
          </div>
          <div className="track-info">
            <div className="no-track">NO TRACK LOADED</div>
          </div>
        </div>
      </div>

      <Popover width={250} position="bottom" closeOnClickOutside={false} withArrow>
        <Popover.Target>
          <div className="waveforms-section">
            <div ref={leftContainerRef}></div>
            <div ref={rightContainerRef}></div>
          </div>
        </Popover.Target>
        <Popover.Dropdown>
          <Text ta="center">
            waveform box showing the two songs and their stem amplitudes over the song duration
          </Text>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
};

export default TutorialImportAndWaveforms;
