import React from "react";
import confetti from "canvas-confetti";

const ConfettiButton = () => {
  const handleConfetti = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 20;
    canvas.height = 20;

    // Draw a simple music note shape
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(10, 5, 4, 3, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(13, 5);
    ctx.lineTo(13, 15);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'white';
    ctx.stroke();

    // Convert to image
    const noteImage = new Image();
    noteImage.src = canvas.toDataURL();

    // Wait for image to load
    noteImage.onload = () => {
      const myShape = confetti.shapeFromPath({
        path: 'M10 2C9.5 2 9 2.5 9 3V9C8.5 9 7.7 9.3 7 10C5.9 11.1 5.7 12.7 6.5 13.5C7.3 14.3 8.9 14.1 10 13C10.8 12.2 11.1 11.1 11 10V5L14 6V4L10 2Z',
      });

      // Launch multiple bursts
      for (let i = 0; i < 1; i++) {
        setTimeout(() => {
          confetti({
            particleCount: 30,
            spread: 70,
            origin: { y: 0.4, x: 0.5 + (Math.random() - 0.5) * 0.4 },
            colors: ['#FF69B4', '#9370DB', '#4169E1', '#20B2AA', '#FFD700'],
            shapes: [myShape],
            ticks: 200,
            scalar: 2,
            gravity: 1,
            drift: 0,
            decay: 0.94,
            startVelocity: 30,
          });
        }, i * 200);

        // Add some slower-falling pieces
      setTimeout(() => {
        confetti({
          particleCount: 20,
          spread: 100,
          origin: { y: 0.35, x: 0.5 },
          colors: ['#FF69B4', '#9370DB', '#4169E1', '#20B2AA', '#FFD700'],
          shapes: [myShape],
          ticks: 300,
          gravity: 0.5,
          scalar: 3,
          drift: 0.2,
          decay: 0.97,
          startVelocity: 15,
        });
      }, 500);
      }

      
    };
  };

  return (
    <button
      onClick={handleConfetti}
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
      onMouseEnter={(e) => e.target.style.transform = "scale(1.05)"}
      onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
    >
      confetti 🎵
    </button>
  );
};

export default ConfettiButton;
