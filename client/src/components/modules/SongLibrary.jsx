import React, { useState, useEffect } from "react";
import { get, post } from "../../utilities";
import useRequireLogin from "../../hooks/useRequireLogin";
import LoginOverlay from "./LoginOverlay";
import FileUpload from "./FileUpload";
import "./SongLibrary.css";

const SongLibrary = ({ onUploadSuccess }) => {
  const isLoggedIn = useRequireLogin();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSongs = async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }

    try {
      const response = await get("/api/songs");
      setSongs(response || []);
    } catch (err) {
      console.log("Error fetching songs:", err);
      setError("Failed to fetch songs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, [isLoggedIn]);

  const handleDelete = async (songId) => {
    if (!isLoggedIn) return;

    try {
      const response = await fetch(`/api/song/${songId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete song: ${response.statusText}`);
      }
      
      setSongs((prevSongs) => prevSongs.filter((song) => song._id !== songId));
    } catch (err) {
      console.log("Error deleting song:", err);
      setError("Failed to delete song");
    }
  };

  const handleUploadSuccess = (newSong) => {
    setSongs((prevSongs) => [...prevSongs, newSong]);
    if (onUploadSuccess) {
      onUploadSuccess(newSong);
    }
  };

  if (loading) {
    return <div className="song-library-message">Loading your songs...</div>;
  }

  if (error) {
    return <div className="song-library-message error">{error}</div>;
  }

  return (
    <>
      {!isLoggedIn && <LoginOverlay />}
      <div className="song-library">
        <div className="song-library-container">
          <div className="song-library-header">
            <h2>Your Song Library</h2>
            <FileUpload onUploadSuccess={handleUploadSuccess} />
          </div>
          
          <div className="song-list-container">
            <div className="song-list-header">
              <span className="header-title">Title</span>
              <span className="header-date">Date Uploaded</span>
              <span className="header-actions">Actions</span>
            </div>
            {error ? (
              <div className="error-message">{error}</div>
            ) : (
              <ul className="song-list">
                {songs.length === 0 ? (
                  <li className="song-library-message">
                    No songs in your library yet
                  </li>
                ) : (
                  songs.map((song) => (
                    <li key={song._id} className="song-item">
                      <span className="song-name">{song.title}</span>
                      <span className="song-date">{new Date(song.uploadDate).toLocaleDateString()}</span>
                      <div className="song-actions">
                        <button className="u-link delete" onClick={() => handleDelete(song._id)}>
                          Delete
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SongLibrary;
