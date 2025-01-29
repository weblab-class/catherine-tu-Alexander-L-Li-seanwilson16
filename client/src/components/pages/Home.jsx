import "../../utilities.css";
import "./Home.css";
import PlayPauseHome from "../modules/PlayPauseHome";
import HomeButtons from "../modules/HomeButtons";
import NavBar from "../modules/NavBar";
import MusicNoteGenerator from "../modules/MusicNoteGenerator";

const Home = () => {
  return (
    <>
      <PlayPauseHome />
      <div className="body" />
      <div className="homepage-container">
        <h1 className="homepage-title">
          chilldeck
          <p className="homepage-subtitle">made by chill people for chill people</p>
        </h1>
        <div className="Home-container">
          <HomeButtons />
          <MusicNoteGenerator />
        </div>
      </div>
    </>
  );
};

export default Home;
