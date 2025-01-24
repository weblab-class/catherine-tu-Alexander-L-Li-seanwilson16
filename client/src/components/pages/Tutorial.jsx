import "../pages/DJ.css";
import React, { useState } from "react";
import NavBar from "../modules/NavBar";
import TutorialImportAndWaveforms from "../modules/TutorialImportAndWaveforms";
import TutorialLeftControls from "../modules/TutorialLeftControls";
import TutorialRightControls from "../modules/TutorialRightControls";
import TutorialCentralControls from "../modules/TutorialCentralControls";
import TutorialModal from "../modules/TutorialModal";

const Tutorial = () => {
  const [isModalVisible, setIsModalVisible] = useState(true);

  return (
    <>
      <div className="dj-page">
        <NavBar />
        <TutorialModal isVisible={isModalVisible} setIsVisible={setIsModalVisible} />
        <TutorialImportAndWaveforms enableHover={!isModalVisible} />

        <div className="decks-container">
          <TutorialLeftControls enableHover={!isModalVisible} />

          <TutorialCentralControls enableHover={!isModalVisible} />

          <TutorialRightControls enableHover={!isModalVisible} />
        </div>
      </div>
    </>
  );
};

export default Tutorial;
