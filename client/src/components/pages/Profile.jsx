import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { get } from "../../utilities";
import ThemeButtons from "../modules/ThemeButtons";
import TimeOfDay from "../modules/TimeOfDay";
import Avatar from "../modules/Avatar";
import NavBar from "../modules/NavBar";
import FileUpload from "../modules/FileUpload";

import "./Profile.css";

const Profile = () => {
  let { userId } = useParams();
  const [user, setUser] = useState();

  const acceptedTypes = ["audio/mp4", "audio/mpeg", "audio/wav", "video/mp4"];

  useEffect(() => {
    if (userId) {
      // Fetch user data including theme
      get("/api/user", { userid: userId }).then((userObj) => {
        setUser(userObj);
      });
    }
  }, [userId]); // changing user id is the dependency

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
        <FileUpload />
        <div className="button-text-inline">
          <h2 className="theme-title">Choose a Theme:</h2>
          <ThemeButtons />
        </div>
      </div>
    </>
  );
};

export default Profile;
