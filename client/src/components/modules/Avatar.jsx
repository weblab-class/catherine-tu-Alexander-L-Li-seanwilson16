import React, { useState, useEffect, useContext } from "react";
import { post } from "../../utilities";

import original from "/assets/profile/chill-guy-original.jpeg";

import "./Avatar.css";

const Avatar = () => {
  const [selectedAvatar, setSelectedAvatar] = useState(original);

  // avatar options
  const avatarOptions = [{ id: "chill guy original", url: original }];

  const updateProfilePicture = (newAvatar) => {
    post("/api/avatar", { profile: newAvatar })
      .then((updatedUser) => {
        setSelectedAvatar(updatedUser.avatar);
      })
      .catch((err) => {
        console.error("Failed to update profile picture:", err);
      });
  };

  console.log("Selected Avatar URL:", selectedAvatar);

  return (
    <div className="profile-container">
      <h2>Your Avatar</h2>
      <img src={selectedAvatar} alt="Current Avatar" className="selected-avatar" />
      {/* <h3>Choose Your Avatar:</h3>
      <div className="avatar-selection">
        {avatarOptions.map((option) => (
          <img
            key={option.id}
            src={option.url}
            alt={`Avatar ${option.id}`}
            className={`avatar-option ${selectedAvatar === option.url ? "active-avatar" : ""}`}
            onClick={() => updateProfilePicture(option.url)}
          />
        ))} */}
      {/* </div> */}
    </div>
  );
};

export default Avatar;
