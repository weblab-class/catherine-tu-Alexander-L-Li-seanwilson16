import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { get } from "../../utilities";
import ThemeButtons from "../modules/ThemeButtons";
import TimeOfDay from "../modules/TimeOfDay";
import Avatar from "../modules/Avatar";
import NavBar from "../modules/NavBar";
import FileUpload from "../modules/FileUpload";
import SongLibrary from "../modules/SongLibrary";

import "./Profile.css";

const Profile = () => {
  let { userId } = useParams();
  const [user, setUser] = useState();
  const [refreshLibrary, setRefreshLibrary] = useState(0);

  useEffect(() => {
    if (userId) {
      // Fetch user data including theme
      get("/api/user", { userid: userId }).then((userObj) => {
        setUser(userObj);
      });
    }
  }, [userId]); // changing user id is the dependency

  const handleUploadSuccess = (song) => {
    // Trigger a refresh of the song library
    setRefreshLibrary((prev) => prev + 1);
  };

  const handleSongSelect = (song) => {
    // You can implement song selection logic here
    console.log("Selected song:", song);
  };

  if (!user) {
    return <div></div>;
  }

  return (
    <>
      <div className="profile-container">
        <NavBar />
        <Avatar
          userId={user._id}
          currentAvatar={user.avatar}
          onAvatarChange={(newAvatar) => {
            setUser({ ...user, avatar: newAvatar });
          }}
        />
        <TimeOfDay name={user.name} />
        <div className="upload-library-container">
          <FileUpload onUploadSuccess={handleUploadSuccess} />
          <div className="song-library-wrapper">
            <SongLibrary key={refreshLibrary} onSongSelect={handleSongSelect} />
          </div>
        </div>
        <div className="button-text-inline">
          <h2 className="theme-title">choose a theme:</h2>
          <ThemeButtons />
        </div>
      </div>
    </>
  );
};

export default Profile;
