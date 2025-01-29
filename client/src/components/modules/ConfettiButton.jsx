import React from "react";
import confetti from "canvas-confetti";

const ConfettiButton = () => {
  const createLetterConfetti = () => {
    const colors = ["#FF69B4", "#9370DB", "#4169E1", "#20B2AA", "#FFD700"];

    // Define points for each letter with more detail
    const letters = {
      W: [
        // Left diagonal down
        [0.2, 0.35],
        [0.21, 0.37],
        [0.22, 0.39],
        [0.23, 0.41],
        [0.24, 0.43],
        // First up diagonal
        [0.25, 0.41],
        [0.26, 0.39],
        [0.27, 0.37],
        [0.28, 0.35],
        // Second down diagonal
        [0.29, 0.37],
        [0.3, 0.39],
        [0.31, 0.41],
        [0.32, 0.43],
        // Right up diagonal
        [0.33, 0.41],
        [0.34, 0.39],
        [0.35, 0.37],
        [0.36, 0.35],
      ],
      E: [
        // Vertical line
        [0.38, 0.35],
        [0.38, 0.37],
        [0.38, 0.39],
        [0.38, 0.41],
        [0.38, 0.43],
        // Top horizontal
        [0.39, 0.35],
        [0.4, 0.35],
        [0.41, 0.35],
        // Middle horizontal
        [0.39, 0.39],
        [0.4, 0.39],
        [0.41, 0.39],
        // Bottom horizontal
        [0.39, 0.43],
        [0.4, 0.43],
        [0.41, 0.43],
      ],
      B: [
        // Vertical line
        [0.44, 0.35],
        [0.44, 0.37],
        [0.44, 0.39],
        [0.44, 0.41],
        [0.44, 0.43],
        // Top curve
        [0.45, 0.35],
        [0.46, 0.35],
        [0.47, 0.36],
        [0.47, 0.37],
        [0.46, 0.38],
        [0.45, 0.39],
        // Bottom curve
        [0.45, 0.39],
        [0.46, 0.39],
        [0.47, 0.4],
        [0.47, 0.42],
        [0.46, 0.43],
        [0.45, 0.43],
      ],
      L: [
        // Vertical line
        [0.5, 0.35],
        [0.5, 0.37],
        [0.5, 0.39],
        [0.5, 0.41],
        [0.5, 0.43],
        // Bottom horizontal
        [0.51, 0.43],
        [0.52, 0.43],
        [0.53, 0.43],
      ],
      A: [
        // Left diagonal
        [0.56, 0.43],
        [0.57, 0.41],
        [0.58, 0.39],
        [0.59, 0.37],
        [0.6, 0.35],
        // Right diagonal
        [0.61, 0.37],
        [0.62, 0.39],
        [0.63, 0.41],
        [0.64, 0.43],
        // Middle line
        [0.58, 0.39],
        [0.59, 0.39],
        [0.6, 0.39],
        [0.61, 0.39],
        [0.62, 0.39],
      ],
      B2: [
        // Vertical line
        [0.67, 0.35],
        [0.67, 0.37],
        [0.67, 0.39],
        [0.67, 0.41],
        [0.67, 0.43],
        // Top curve
        [0.68, 0.35],
        [0.69, 0.35],
        [0.7, 0.36],
        [0.7, 0.37],
        [0.69, 0.38],
        [0.68, 0.39],
        // Bottom curve
        [0.68, 0.39],
        [0.69, 0.39],
        [0.7, 0.4],
        [0.7, 0.42],
        [0.69, 0.43],
        [0.68, 0.43],
      ],
    };

    // Launch confetti for each letter sequentially
    Object.entries(letters).forEach(([letter, points], letterIndex) => {
      points.forEach((point, pointIndex) => {
        setTimeout(() => {
          // Launch a small cluster for each point
          for (let i = 0; i < 2; i++) {
            confetti({
              particleCount: 2,
              spread: 10, // Reduced spread for tighter formation
              origin: {
                x: point[0] + (Math.random() - 0.5) * 0.005, // Smaller random offset
                y: point[1] + (Math.random() - 0.5) * 0.005,
              },
              colors: [colors[Math.floor(Math.random() * colors.length)]],
              ticks: 300,
              scalar: 0.8, // Smaller particles
              gravity: 0,
              drift: 0,
              decay: 0.94,
              startVelocity: 1,
            });
          }
        }, letterIndex * 400 + pointIndex * 20); // Faster sequence within each letter
      });
    });

    // After letters are formed, make them explode
    setTimeout(() => {
      Object.values(letters)
        .flat()
        .forEach((point, index) => {
          setTimeout(() => {
            confetti({
              particleCount: 4,
              spread: 360,
              origin: { x: point[0], y: point[1] },
              colors: colors,
              ticks: 200,
              scalar: 1,
              gravity: 0.8,
              drift: 0.2,
              decay: 0.94,
              startVelocity: 30,
            });
          }, index * 10);
        });
    }, Object.keys(letters).length * 500);
  };

  return (
    <button
      onClick={createLetterConfetti}
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        padding: "8px 16px",
        backgroundColor: "#fafafa",
        color: "black",
        border: "none",
        borderRadius: "20px",
        cursor: "pointer",
        fontFamily: "var(--josefin)",
        fontSize: "16px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        transition: "transform 0.2s ease",
      }}
      onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
      onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
    >
      confetti 🎵
    </button>
  );
};

export default ConfettiButton;
