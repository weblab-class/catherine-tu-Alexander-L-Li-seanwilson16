import React, { useState } from "react";
import "./Tutorial.css";
import { Popover, Text } from "@mantine/core";

const TutorialCentralControls = () => {
  const [syncOpened, setSyncOpened] = useState(false);
  const [resetOpened, setResetOpened] = useState(false);

  return (
    <div className="deck-controls">
      <Popover width={350} position="top" closeOnClickOutside={false} withArrow opened={syncOpened} onClose={() => setSyncOpened(false)}>
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
          <Text ta="center">
            Sync the BPM of both decks to match.
          </Text>
        </Popover.Dropdown>
      </Popover>

      <Popover width={100} position="right" closeOnClickOutside={false} withArrow opened={resetOpened} onClose={() => setResetOpened(false)}>
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
          <Text ta="center">
            Reset all controls.
          </Text>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
};

export default TutorialCentralControls;
