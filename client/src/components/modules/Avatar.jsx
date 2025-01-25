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
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (currentAvatar) {
      const avatarOption = avatarOptions.find((option) => option.url === currentAvatar);
      if (avatarOption) {
        setSelectedAvatar(currentAvatar);
      }
    }
  }, [currentAvatar]);

  const handleAvatarChange = (newAvatarId) => {
    const selectedOption = avatarOptions.find((option) => option.id === newAvatarId);
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
        <div 
          className="avatar-wrapper"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <img src={selectedAvatar} alt="Current Avatar" className="avatar-image" />
          {isHovering && (
            <div className="avatar-dropdown">
              <div className="avatar-options-list">
                <span className="title-avatar">change avatar:</span>
                {avatarOptions.map((option) => (
                  <div
                    key={option.id}
                    className={`avatar-option ${option.id === currentOption.id ? 'selected' : ''}`}
                    onClick={() => handleAvatarChange(option.id)}
                  >
                    <span>{option.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Avatar;
