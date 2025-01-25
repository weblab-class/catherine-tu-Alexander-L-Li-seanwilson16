import React, { useState } from "react";
import "../pages/DJ.css";
import { Popover, Text } from "@mantine/core";

const TutorialCentralControls = ({ enableHover = true }) => {
  const [syncOpened, setSyncOpened] = useState(false);
  const [resetOpened, setResetOpened] = useState(false);

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
      zIndex: 1000,
    },
    arrow: {
      background: "rgba(0, 0, 0, 0.3)",
      zIndex: 1000,
    },
    root: {
      zIndex: 1000,
    }
  };

  return (
    <div className="deck-controls">
      <Popover
        width={350}
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
          <Text ta="center">Sync the BPM of both decks to match.</Text>
        </Popover.Dropdown>
      </Popover>

      <Popover
        width={100}
        position="bottom"
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
          <Text ta="center">Reset all controls.</Text>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
};

export default TutorialCentralControls;
