import "./DJ.css";
import NavBar from "../modules/NavBar";
import TutorialImportSongs from "../modules/TutorialImportSongs";
import TutorialLeftControls from "../modules/TutorialLeftControls";
import TutorialRightControls from "../modules/TutorialRightControls";
import TutorialCentralControls from "../modules/TutorialCentralControls";
import TutorialModal from "../modules/TutorialModal";

const Tutorial = () => {
  return (
    <>
      <div className="dj-page">
        <NavBar />
        <TutorialModal />
        <TutorialImportSongs />

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
