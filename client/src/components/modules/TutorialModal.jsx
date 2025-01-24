import React from "react";
import "./TutorialModal.css";

const TutorialModal = ({ isVisible, setIsVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="tutorial-modal-overlay">
      <div className="tutorial-modal">
        <button className="tutorial-modal-close" onClick={() => setIsVisible(false)}>
          ×
        </button>
        <div className="tutorial-modal-content">
          <h2>welcome to the dj tutorial!</h2>
          <p>
            hover your mouse over different elements of the deck (DJ board) to find out what they
            do!
          </p>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
