import React, { useRef, useState } from "react";
import "../pages/DJ.css";
import { Popover, Text } from "@mantine/core";

const TutorialImportAndWaveforms = ({ enableHover = true }) => {
  const leftContainerRef = useRef(null);
  const rightContainerRef = useRef(null);
  const [importLeftOpened, setImportLeftOpened] = useState(false);
  const [importRightOpened, setImportRightOpened] = useState(false);
  const [waveformsOpened, setWaveformsOpened] = useState(false);

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

  return (
    <div>
      <div className="top-bar">
        <div className="import-containers">
          <div className="import-container import-container-left">
            <Popover
              width={175}
              position="bottom"
              closeOnClickOutside={false}
              withArrow
              opened={importLeftOpened}
              onClose={() => handleMouseLeave(setImportLeftOpened)}
              styles={{
                dropdown: {
                  background: "rgba(0, 0, 0, 0.7)",
                  fontFamily: "var(--josefin)",
                  color: "white",
                },
                arrow: {
                  background: "rgba(0, 0, 0, 0.7)",
                },
              }}
            >
              <Popover.Target>
                <button
                  className="import-btn"
                  onMouseEnter={() => handleMouseEnter(setImportLeftOpened)}
                  onMouseLeave={() => handleMouseLeave(setImportLeftOpened)}
                >
                  IMPORT SONG ▼
                </button>
              </Popover.Target>
              <Popover.Dropdown>
                <Text>
                  Click this button to import songs into your left deck. Choose from a variety of
                  songs to mix!
                </Text>
              </Popover.Dropdown>
            </Popover>
            <div className="track-info">
              <div className="no-track-left">NO TRACK LOADED</div>
            </div>
          </div>

          <div className="import-container import-container-right">
            <Popover
              width={175}
              position="bottom"
              closeOnClickOutside={false}
              withArrow
              opened={importRightOpened}
              onClose={() => handleMouseLeave(setImportRightOpened)}
              styles={{
                dropdown: {
                  background: "rgba(0, 0, 0, 0.7)",
                  fontFamily: "var(--josefin)",
                  color: "white",
                },
                arrow: {
                  background: "rgba(0, 0, 0, 0.7)",
                },
              }}
            >
              <Popover.Target>
                <button
                  className="import-btn"
                  onMouseEnter={() => handleMouseEnter(setImportRightOpened)}
                  onMouseLeave={() => handleMouseLeave(setImportRightOpened)}
                >
                  IMPORT SONG ▼
                </button>
              </Popover.Target>
              <Popover.Dropdown>
                <Text>
                  Click this button to import songs into your right deck. Choose from a variety of
                  songs to mix!
                </Text>
              </Popover.Dropdown>
            </Popover>
            <div className="track-info">
              <div className="no-track-right">NO TRACK LOADED</div>
            </div>
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
              background: "rgba(0, 0, 0, 0.7)",
              fontFamily: "var(--josefin)",
              color: "white",
            },
            arrow: {
              background: "rgba(0, 0, 0, 0.7)",
            },
          }}
        >
          <Popover.Target>
            <div
              className="waveforms-section"
              onMouseEnter={() => handleMouseEnter(setWaveformsOpened)}
              onMouseLeave={() => handleMouseLeave(setWaveformsOpened)}
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
