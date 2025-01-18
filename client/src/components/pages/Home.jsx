import "../../utilities.css";
import "./Home.css";
import PlayPauseHome from "../modules/PlayPauseHome";
import HomeButtons from "../modules/HomeButtons";
import lofi from "../../public/assets/lofi-background-purple-blue.jpg";

const Home = () => {
  return (
    <>
      <PlayPauseHome />
      <div className="body" />
      <div className="homepage-container">
        <h1 className="homepage-title">
          chilldeck
          {/* <img src={lofi} /> */}
          <p className="homepage-subtitle">made by chill people for chill people</p>
        </h1>
        <HomeButtons />
      </div>
    </>
  );
};

export default Home;
