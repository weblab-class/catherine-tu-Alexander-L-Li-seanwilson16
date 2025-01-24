import React, { useRef, useState } from "react";
import "./Tutorial.css";
import { Popover, Text } from "@mantine/core";

const TutorialImportAndWaveforms = () => {
  const leftContainerRef = useRef(null);
  const rightContainerRef = useRef(null);
  const [importLeftOpened, setImportLeftOpened] = useState(false);
  const [importRightOpened, setImportRightOpened] = useState(false);
  const [waveformsOpened, setWaveformsOpened] = useState(false);

  return (
    <div>
      <div className="top-bar">
        <div className="deck-controls">
          <div className="import-container">
            <Popover
              width={175}
              position="bottom"
              closeOnClickOutside={false}
              withArrow
              opened={importLeftOpened}
              onClose={() => setImportLeftOpened(false)}
            >
              <Popover.Target>
                <button
                  className="import-btn"
                  onMouseEnter={() => setImportLeftOpened(true)}
                  onMouseLeave={() => setImportLeftOpened(false)}
                >
                  IMPORT SONG ▼
                </button>
              </Popover.Target>
              <Popover.Dropdown>
                <Text ta="center">Click here to import a song into the left deck.</Text>
              </Popover.Dropdown>
            </Popover>
          </div>
          <div className="track-info">
            <div className="no-track">NO TRACK LOADED</div>
          </div>
        </div>

        <div className="deck-controls">
          <div className="import-container">
            <Popover
              width={175}
              position="bottom"
              closeOnClickOutside={false}
              withArrow
              opened={importRightOpened}
              onClose={() => setImportRightOpened(false)}
            >
              <Popover.Target>
                <button
                  className="import-btn"
                  onMouseEnter={() => setImportRightOpened(true)}
                  onMouseLeave={() => setImportRightOpened(false)}
                >
                  IMPORT SONG ▼
                </button>
              </Popover.Target>
              <Popover.Dropdown>
                <Text ta="center">Click here to import a song into the right deck.</Text>
              </Popover.Dropdown>
            </Popover>
          </div>
          <div className="track-info">
            <div className="no-track">NO TRACK LOADED</div>
          </div>
        </div>
      </div>

      <div className="deck-row">
        <Popover
          width={250}
          position="bottom"
          closeOnClickOutside={false}
          withArrow
          opened={waveformsOpened}
          onClose={() => setWaveformsOpened(false)}
        >
          <Popover.Target>
            <div
              className="waveforms-section"
              onMouseEnter={() => setWaveformsOpened(true)}
              onMouseLeave={() => setWaveformsOpened(false)}
            >
              <div className="waveform-container left" ref={leftContainerRef}></div>
              <div className="waveform-container right" ref={rightContainerRef}></div>
            </div>
          </Popover.Target>
          <Popover.Dropdown>
            <Text ta="center">This is where the waveforms of your songs will appear.</Text>
          </Popover.Dropdown>
        </Popover>
      </div>
    </div>
  );
};

export default TutorialImportAndWaveforms;
