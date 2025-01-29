import React, { useState } from "react";
import "./MusicNoteGenerator.css";

const MusicNoteGenerator = () => {
  const [notes, setNotes] = useState([]);

  const generateNote = () => {
    const newNote = {
      id: Date.now(),
      left: Math.random() * 100, // Random horizontal position
      top: 20 + Math.random() * 20, // Random starting height near the top
      duration: 2000 + Math.random() * 1000, // Random duration between 2-3s
    };

    setNotes((prevNotes) => [...prevNotes, newNote]);

    // Remove the note after animation completes
    setTimeout(() => {
      setNotes((prevNotes) => prevNotes.filter((note) => note.id !== newNote.id));
    }, newNote.duration);
  };

  return (
    <div className="note-generator">
      <button className="note-box" onClick={generateNote}>
        ♪
      </button>
      {notes.map((note) => (
        <div
          key={note.id}
          className="floating-note"
          style={{
            left: `${note.left}%`,
            top: `${note.top}px`, // Add top style
            animationDuration: `${note.duration}ms`,
          }}
        >
          {["♪", "♫", "♬", "♩"][Math.floor(Math.random() * 4)]}
        </div>
      ))}
    </div>
  );
};

export default MusicNoteGenerator;
