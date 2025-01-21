import React, { useState, useEffect } from "react";
import "./TutorialModal.css";

const TutorialModal = () => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="tutorial-modal-overlay">
      <div className="tutorial-modal">
        <button className="tutorial-modal-close" onClick={handleClose}>
          ×
        </button>
        <div className="tutorial-modal-content">
          <h2>welcome to the dj tutorial!</h2>
          <p>click on different elements of the deck (DJ board) to find out what they do!</p>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
