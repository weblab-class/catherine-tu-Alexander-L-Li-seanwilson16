import React, { useRef, useState } from "react";
import "../pages/DJ.css";
import { Popover, Text } from "@mantine/core";

const TutorialImportAndWaveforms = () => {
  const leftContainerRef = useRef(null);
  const rightContainerRef = useRef(null);
  const [importLeftOpened, setImportLeftOpened] = useState(false);
  const [importRightOpened, setImportRightOpened] = useState(false);
  const [waveformsOpened, setWaveformsOpened] = useState(false);

  const handleMouseLeave = (setState) => {
    setState(false);
  };

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
              onClose={() => handleMouseLeave(setImportLeftOpened)}
              styles={{
                dropdown: {
                  background: "rgba(0, 0, 0, 0.3)",
                  fontFamily: "var(--josefin)",
                  color: "white",
                },
                arrow: {
                  background: "rgba(0, 0, 0, 0.3)",
                },
              }}
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
              onClose={() => handleMouseLeave(setImportRightOpened)}
              styles={{
                dropdown: {
                  background: "rgba(0, 0, 0, 0.3)",
                  fontFamily: "var(--josefin)",
                  color: "white",
                },
                arrow: {
                  background: "rgba(0, 0, 0, 0.3)",
                },
              }}
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

      <div style={{ position: "relative", zIndex: 1000 }}>
        <Popover
          width={250}
          position="bottom"
          closeOnClickOutside={false}
          withArrow
          opened={waveformsOpened}
          onClose={() => handleMouseLeave(setWaveformsOpened)}
          styles={{
            target: {
              width: "100%",
              height: "200px",
              display: "block",
            },
            dropdown: {
              background: "rgba(0, 0, 0, 0.3)",
              fontFamily: "var(--josefin)",
              color: "white",
            },
            arrow: {
              background: "rgba(0, 0, 0, 0.3)",
            },
          }}
        >
          <Popover.Target>
            <div
              className="waveforms-section"
              onMouseEnter={() => setWaveformsOpened(true)}
              onMouseLeave={() => setWaveformsOpened(false)}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              <div ref={leftContainerRef} style={{ flex: 1 }}></div>
              <div ref={rightContainerRef} style={{ flex: 1 }}></div>
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
