import "../../utilities.css";
import "./Home.css";
import PlayPauseHome from "../modules/PlayPauseHome";
import HomeButtons from "../modules/HomeButtons";
import NavBar from "../modules/NavBar";

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
        <HomeButtons />
      </div>
    </>
  );
};

export default Home;
