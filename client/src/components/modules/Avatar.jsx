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
  const [isPreviewMode, setIsPreviewMode] = useState(false);

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
      setIsPreviewMode(false);

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

  // Close preview when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isPreviewMode && !event.target.closest('.avatar-preview-content')) {
        setIsPreviewMode(false);
      }
    };

    if (isPreviewMode) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPreviewMode]);

  // Find the current avatar option
  const currentOption =
    avatarOptions.find((option) => option.url === selectedAvatar) || avatarOptions[0];

  return (
    <>
      <div className="avatar-container">
        <div className="avatar-content">
          <div 
            className="avatar-wrapper"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onClick={() => setIsPreviewMode(true)}
          >
            <img src={selectedAvatar} alt="Current Avatar" className="avatar-image" />
            {isHovering && !isPreviewMode && (
              <div className="avatar-overlay">
                <span>change avatar</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {isPreviewMode && (
        <div className="avatar-preview-overlay">
          <div className="avatar-preview-content">
            <h2>Choose Your Avatar</h2>
            <div className="avatar-preview-grid">
              {avatarOptions.map((option) => (
                <div
                  key={option.id}
                  className={`avatar-preview-option ${option.id === currentOption.id ? 'selected' : ''}`}
                  onClick={() => handleAvatarChange(option.id)}
                >
                  <div className="preview-image-wrapper">
                    <img src={option.url} alt={option.label} />
                    {option.id === currentOption.id && (
                      <div className="current-overlay">
                        <span>current</span>
                      </div>
                    )}
                  </div>
                  <span>{option.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Avatar;
