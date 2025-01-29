import React, { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { UserContext } from "../context/Context";
import "./NavBar.css";

const NavBar = (props) => {
  const { userId, handleLogout } = useContext(UserContext);
  const navigate = useNavigate();

  const handleProfileClick = (e) => {
    if (!userId) {
      e.preventDefault();
      navigate("/");
    }
  };

  const handleNavClick = () => {
    // Use DJ cleanup function if available
    if (window.cleanupDJAudio) {
      window.cleanupDJAudio();
    }

    // Stop all audio elements
    const audioElements = document.getElementsByTagName("audio");
    Array.from(audioElements).forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });

    // Find and stop any WaveSurfer instances
    const wavesurferElements = document.querySelectorAll(".wavesurfer-region");
    wavesurferElements.forEach((element) => {
      if (element.wavesurfer) {
        element.wavesurfer.pause();
      }
    });
  };

  const handleLogoutClick = () => {
    handleNavClick();
    handleLogout();
    navigate("/");
  };

  return (
    <div className="navbar-notch-container">
      <div className="navbar-content">
        <NavLink
          to="/dj"
          className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
          onClick={handleNavClick}
        >
          DJ
        </NavLink>
        <NavLink
          to="/tutorial"
          className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
          onClick={handleNavClick}
        >
          Help
        </NavLink>
        {userId && (
          <NavLink
            to={`/profile/${userId}`}
            className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
            onClick={handleNavClick}
          >
            Profile
          </NavLink>
        )}
        <button
          className="nav-link"
          onClick={handleLogoutClick}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default NavBar;
