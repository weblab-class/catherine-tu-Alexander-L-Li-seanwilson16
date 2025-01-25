import React from "react";
import "../pages/DJ.css";
import { Popover, Text } from "@mantine/core";

const TutorialCentralControls = ({ enableHover = true, syncOpened, resetOpened, setSyncOpened, setResetOpened }) => {
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
    <div className="deck-controls">
        <Popover
          width={215}
          position="top"
          closeOnClickOutside={false}
          withArrow
          opened={syncOpened}
          onClose={() => handleMouseLeave(setSyncOpened)}
          styles={popoverStyles}
        >
          <Popover.Target>
            <button
              className="sync-btn"
              onMouseEnter={() => handleMouseEnter(setSyncOpened)}
              onMouseLeave={() => handleMouseLeave(setSyncOpened)}
            >
              <span className="sync-text">SYNC</span>
              <span className="playback-text">(S)</span>
            </button>
          </Popover.Target>
          <Popover.Dropdown>
            <Text ta="center">Sync the BPM of both tracks.</Text>
          </Popover.Dropdown>
        </Popover>

        <Popover
          width={215}
          position="top"
          closeOnClickOutside={false}
          withArrow
          opened={resetOpened}
          onClose={() => handleMouseLeave(setResetOpened)}
          styles={popoverStyles}
        >
          <Popover.Target>
            <button
              className="reset-btn"
              onMouseEnter={() => handleMouseEnter(setResetOpened)}
              onMouseLeave={() => handleMouseLeave(setResetOpened)}
            >
              <span className="reset-text">RESET</span>
              <span className="playback-text">(K)</span>
            </button>
          </Popover.Target>
          <Popover.Dropdown>
            <Text ta="center">Reset both tracks to their original state.</Text>
          </Popover.Dropdown>
        </Popover>
    </div>
  );
};

export default TutorialCentralControls;
