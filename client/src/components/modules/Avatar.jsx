import React, { useState, useEffect } from "react";
import { post } from "../../utilities";
import "./Avatar.css";

// Import all avatar options
import original from "/assets/profile/chill-guy-original.jpg";
import paradise from "/assets/profile/chill-guy-paradise.jpg";
import holiday from "/assets/profile/chill-guy-holidays.jpg";
import taylor from "/assets/profile/chill-guy-taylor-swift.jpg";
import dj from "/assets/profile/chill-guy-dj.png";

const avatarOptions = [
  { id: "chill guy original", url: original, label: "original" },
  { id: "chill guy paradise", url: paradise, label: "paradise" },
  { id: "chill guy taylor swift", url: taylor, label: "taylor swift" },
  { id: "chill guy holiday", url: holiday, label: "holiday" },
  { id: "chill guy dj", url: dj, label: "dj" },
];

const Avatar = ({ currentAvatar, onAvatarChange }) => {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar || original);

  useEffect(() => {
    if (currentAvatar) {
      const avatarOption = avatarOptions.find((option) => option.url === currentAvatar);
      if (avatarOption) {
        setSelectedAvatar(currentAvatar);
      }
    }
  }, [currentAvatar]);

  const handleAvatarChange = (event) => {
    const selectedOption = avatarOptions.find((option) => option.id === event.target.value);
    if (selectedOption) {
      const newAvatar = selectedOption.url;
      setSelectedAvatar(newAvatar);

      // Send update to server
      post("/api/avatar", { avatar: newAvatar })
        .then((updatedUser) => {
          if (onAvatarChange) {
            onAvatarChange(newAvatar);
          }
        })
        .catch((err) => {
          console.error("Failed to update profile picture:", err);
        });
    }
  };

  // Find the current avatar option
  const currentOption =
    avatarOptions.find((option) => option.url === selectedAvatar) || avatarOptions[0];

  return (
    <div className="avatar-container">
      <div className="avatar-content">
        <img src={selectedAvatar} alt="Current Avatar" className="avatar-image" />
        <div className="avatar-selector">
          <span className="avatar-label">my avatar:</span>
          <select
            value={currentOption.id}
            onChange={handleAvatarChange}
            className="avatar-dropdown"
          >
            {avatarOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default Avatar;
