import "./DJ.css";
import NavBar from "../modules/NavBar";
import TutorialImportAndWaveforms from "../modules/TutorialImportAndWaveforms";
import TutorialLeftControls from "../modules/TutorialLeftControls";
import TutorialRightControls from "../modules/TutorialRightControls";
import TutorialCentralControls from "../modules/TutorialCentralControls";
import TutorialModal from "../modules/TutorialModal";

const Tutorial = () => {
  return (
    <>
      <NavBar />
      <div className="dj-page">
        <TutorialModal />
        <TutorialImportAndWaveforms />

        <div className="decks-container">
          <TutorialLeftControls />

          <TutorialCentralControls />

          <TutorialRightControls />
        </div>
      </div>
    </>
  );
};

export default Tutorial;
