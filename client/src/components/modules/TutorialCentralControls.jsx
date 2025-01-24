import React, { useState } from "react";
import "../pages/DJ.css";
import { Popover, Text } from "@mantine/core";

const TutorialCentralControls = () => {
  const [syncOpened, setSyncOpened] = useState(false);
  const [resetOpened, setResetOpened] = useState(false);

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
    <div className="deck-controls">
      <Popover
        width={350}
        position="top"
        closeOnClickOutside={false}
        withArrow
        opened={syncOpened}
        onClose={() => setSyncOpened(false)}
        styles={popoverStyles}
      >
        <Popover.Target>
          <button
            className="sync-btn"
            onMouseEnter={() => setSyncOpened(true)}
            onMouseLeave={() => setSyncOpened(false)}
          >
            <span className="sync-text">SYNC</span>
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
        onClose={() => setResetOpened(false)}
        styles={popoverStyles}
      >
        <Popover.Target>
          <button
            className="reset-btn"
            onMouseEnter={() => setResetOpened(true)}
            onMouseLeave={() => setResetOpened(false)}
          >
            <span className="reset-text">RESET</span>
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
