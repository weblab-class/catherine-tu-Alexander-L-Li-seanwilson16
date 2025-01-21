import "../pages/DJ.css";
import { Popover, Text } from "@mantine/core";

const TutorialCentralControls = () => {
  return (
    <div className="deck-controls">
      <Popover width={350} position="top" closeOnClickOutside={false} withArrow>
        <Popover.Target>
          <button className="sync-btn">
            <span className="sync-text">SYNC</span>
          </button>
        </Popover.Target>
        <Popover.Dropdown>
          <Text ta="center">
            syncs the bpms of the two tracks to match the track that's playing
          </Text>
        </Popover.Dropdown>
      </Popover>

      <Popover width={100} position="right" closeOnClickOutside={false} withArrow>
        <Popover.Target>
          <button className="reset-btn">
            <span className="reset-text">RESET</span>
          </button>
        </Popover.Target>
        <Popover.Dropdown>
          <Text ta="center">resets whole dj deck</Text>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
};

export default TutorialCentralControls;
