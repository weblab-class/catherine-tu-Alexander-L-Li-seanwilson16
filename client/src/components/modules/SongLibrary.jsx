import React, { useState, useEffect } from "react";
import { get, post } from "../../utilities";
import useRequireLogin from "../../hooks/useRequireLogin";
import LoginOverlay from "./LoginOverlay";
import FileUpload from "./FileUpload";
import "./SongLibrary.css";

const SongLibrary = ({ userId, onUploadSuccess }) => {
  const isLoggedIn = useRequireLogin();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [songStatuses, setSongStatuses] = useState({});
  const [editingSongId, setEditingSongId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [songToDelete, setSongToDelete] = useState(null);

  // Add refresh warning and cleanup
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Check if any songs are incomplete
      const hasIncomplete = songs.some(song => {
        const status = songStatuses[song._id];
        return status && status.completedJobs < status.totalJobs;
      });

      if (hasIncomplete) {
        // Show warning message
        const message = "Changes you made may not be saved. Are you sure you want to leave?";
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [songs, songStatuses]);

  // Delete incomplete songs on page load/refresh
  useEffect(() => {
    const cleanupIncomplete = async () => {
      for (const song of songs) {
        const status = songStatuses[song._id];
        if (status && status.completedJobs < status.totalJobs) {
          try {
            await post(`/api/songs/${song._id}/delete`);
            console.log("Deleted incomplete song:", song._id);
          } catch (error) {
            console.error("Error deleting incomplete song:", error);
          }
        }
      }
      // Refresh song list after cleanup
      await fetchSongs();
    };

    cleanupIncomplete();
  }, []); // Run only on mount/refresh

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
      setError("Failed to fetch songs. Please refresh and log in again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, [isLoggedIn]);

  const handleDeleteClick = (song) => {
    setSongToDelete(song);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!songToDelete) return;
    
    try {
      const response = await fetch(`/api/songs/${songToDelete._id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete song");
      setSongs((prevSongs) => prevSongs.filter((song) => song._id !== songToDelete._id));
    } catch (error) {
      console.error("Error deleting song:", error);
    }
    setShowDeleteConfirm(false);
    setSongToDelete(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setSongToDelete(null);
  };

  const handleRename = async (songId) => {
    try {
      const response = await post("/api/songs/rename", { songId: songId, newTitle: newTitle });
      if (response.success) {
        setSongs((prevSongs) =>
          prevSongs.map((song) =>
            song._id === songId ? { ...song, title: newTitle } : song
          )
        );
        setEditingSongId(null);
        setNewTitle("");
      }
    } catch (err) {
      console.error("Error renaming song:", err);
    }
  };

  const handleUploadSuccess = (newSong) => {
    setSongs((prevSongs) => [...prevSongs, newSong]);
    if (onUploadSuccess) {
      onUploadSuccess(newSong);
    }
  };

  const startEditing = (song) => {
    setEditingSongId(song._id);
    setNewTitle(song.title);
  };

  const cancelEditing = () => {
    setEditingSongId(null);
    setNewTitle("");
  };

  // Function to check job status
  const checkJobStatus = async (song) => {
    if (!song.audioshakeJobIds) {
      console.log("No job IDs found for song:", song._id);
      return;
    }

    try {
      console.log("Checking status for song:", song._id);
      const response = await get(`/api/songs/${song._id}/status`);
      console.log("Status response:", response);
      
      if (response.status) {
        setSongStatuses(prev => ({
          ...prev,
          [song._id]: response.status
        }));
      }
    } catch (error) {
      console.error("Error checking job status:", error);
    }
  };

  // Poll for status updates
  useEffect(() => {
    if (!songs.length) return;

    // Initial check for all songs
    songs.forEach(song => {
      checkJobStatus(song);
    });

    const interval = setInterval(() => {
      songs.forEach(song => {
        checkJobStatus(song);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [songs]);

  const renderProgress = (song) => {
    let status = "processing...";
    let progress = 0;

    const songStatus = songStatuses[song._id];
    console.log("Rendering progress for song:", song._id, "Status:", songStatus);

    if (song.stemsStatus === "completed" || (songStatus && songStatus.completedJobs === songStatus.totalJobs)) {
      progress = 100;
      status = "ready";
    } else if (songStatus) {
      const { completedJobs, totalJobs } = songStatus;
      progress = Math.floor((completedJobs / totalJobs) * 100);
      status = `processing stems (${completedJobs}/${totalJobs})`;
    } else if (song.stemsStatus === "pending") {
      status = "starting";
    } else if (song.stemsStatus === "failed") {
      status = "failed";
    }

    return (
      <div className="progress-section">
        <div className="progress-container">
          <div 
            className="progress-bar" 
            style={{ 
              width: `${progress}%`,
              transition: "width 0.3s ease-in-out"
            }} 
          />
        </div>
        <span className="progress-status">
          {status} (<span>{progress}%</span>)
        </span>
      </div>
    );
  };

  const renderSongTitle = (song) => {
    if (editingSongId === song._id) {
      return (
        <div className="song-rename-container">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="song-rename-input"
            autoFocus
            onBlur={(e) => {
              // Check if the click was on a save/cancel button
              const clickedElement = e.relatedTarget;
              if (!clickedElement?.classList.contains('song-rename-save') && 
                  !clickedElement?.classList.contains('song-rename-cancel')) {
                cancelEditing();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleRename(song._id);
              } else if (e.key === "Escape") {
                cancelEditing();
              }
            }}
          />
          <div className="song-rename-buttons">
            <button 
              onClick={() => handleRename(song._id)} 
              className="song-rename-save"
            >
              Save
            </button>
            <button 
              onClick={cancelEditing} 
              className="song-rename-cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="song-title-container">
        <button onClick={() => startEditing(song)} className="song-rename-button">
          ✎
        </button>
        <span className="song-name">{song.title}</span>
      </div>
    );
  };

  if (loading) {
    return <div className="song-library-message">loading your songs...</div>;
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
              <span className="header-title">file title</span>
              <span className="header-date">date uploaded</span>
              <span className="header-progress">stem split progress</span>
              <span className="header-actions">actions</span>
            </div>
            {error ? (
              <div className="error-message">{error}</div>
            ) : (
              <ul className="song-list">
                {songs.length === 0 ? (
                  <li className="song-library-message">
                    no songs in your library yet
                  </li>
                ) : (
                  songs.map((song) => (
                    <li key={song._id} className="song-item">
                      {renderSongTitle(song)}
                      <span className="song-date">
                        {new Date(song.uploadDate).toLocaleDateString()}
                      </span>
                      <div className="progress-section">
                        {renderProgress(song)}
                      </div>
                      <div className="song-actions">
                        <div className="delete-container">
                          <button 
                            className="u-link delete" 
                            onClick={() => handleDeleteClick(song)}
                          >
                            delete
                          </button>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
      {showDeleteConfirm && (
        <div className="upload-modal">
          <div className="upload-modal-content">
            <div className="delete-confirm-container">
              <h3>delete song</h3>
              <p>are you sure you want to delete "{songToDelete?.title}"?</p>
              <p>this action cannot be undone.</p>
              <div className="delete-confirm-buttons">
                <button className="cancel-button" onClick={handleCancelDelete}>
                  cancel
                </button>
                <button className="confirm-button" onClick={handleConfirmDelete}>
                  delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SongLibrary;
