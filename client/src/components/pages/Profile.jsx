import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { get } from "../../utilities";
import useRequireLogin from "../../hooks/useRequireLogin";
import LoginOverlay from "../modules/LoginOverlay";
import ThemeButtons from "../modules/ThemeButtons";
import TimeOfDay from "../modules/TimeOfDay";
import Avatar from "../modules/Avatar";
import NavBar from "../modules/NavBar";
import SongLibrary from "../modules/SongLibrary";

import "./Profile.css";

const Profile = () => {
  let { userId } = useParams();
  const isLoggedIn = useRequireLogin();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshLibrary, setRefreshLibrary] = useState(0);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }

    if (userId) {
      // Fetch user data including theme
      get("/api/user", { userid: userId })
        .then((userObj) => {
          setUser(userObj);
          setLoading(false);
        })
        .catch((err) => {
          console.log("Failed to fetch user", err);
          setLoading(false);
        });
    }
  }, [userId, isLoggedIn]);

  const handleUploadSuccess = (song) => {
    console.log("Upload completed successfully in Profile:", song);
    console.log("Stems created:", song.stems);
    // Trigger a refresh of the song library
    setRefreshLibrary((prev) => prev + 1);
  };

  const handleSongSelect = (song) => {
    // You can implement song selection logic here
    console.log("Selected song:", song);
  };

  if (loading) {
    return <div></div>;
  }

  if (!isLoggedIn) {
    return <LoginOverlay />;
  }

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
          <div className="song-library-wrapper">
            <SongLibrary key={refreshLibrary} onSongSelect={handleSongSelect} onUploadSuccess={handleUploadSuccess} />
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
