import React, { useState, useEffect, useRef } from "react";
import { get, post } from "../../utilities";
import useRequireLogin from "../../hooks/useRequireLogin";
import LoginOverlay from "./LoginOverlay";
// import FileUpload from "./FileUpload";
import "./SongLibrary.css";



const AVAILABLE_TRACKS = [
  {
    _id: "1",
    title: "Fall to Light by Laszlo",
    path: "NCS_Fall_to_Light",
    bpm: 87,
    key: "B Major",
    uploadDate: new Date(),
    stemsStatus: "completed"
  },
  {
    _id: "2",
    title: "On & On by Cartoon, Daniel Levi & Jeja",
    path: "NCS_On&On",
    bpm: 86,
    key: "B Major",
    uploadDate: new Date(),
    stemsStatus: "completed"
  },
  {
    _id: "3",
    title: "Chill Guy Remix by 류서진",
    path: "chill-guy-remix",
    bpm: 80,
    key: "Ab Major",
    uploadDate: new Date(),
    stemsStatus: "completed"
  },
  {
    _id: "4",
    title: "Disfigure by Blank",
    path: "Disfigure_Blank",
    bpm: 140,
    key: "B Minor",
    uploadDate: new Date(),
    stemsStatus: "completed"
  },
  {
    _id: "5",
    title: "Let Me Down Slowly (Not So Good Remix) by Alec Benjamin",
    path: "Let_Me_Down_Slowly_Alec_Benjamin",
    bpm: 75,
    key: "C# Minor",
    uploadDate: new Date(),
    stemsStatus: "completed"
  },
  {
    _id: "6",
    title: "Cradles by Sub Urban",
    path: "Sub_Urban",
    bpm: 79,
    key: "Bb Minor",
    uploadDate: new Date(),
    stemsStatus: "completed"
  },
  {
    _id: "7",
    title: "Shine by Spektrum",
    path: "Shine",
    bpm: 128,
    key: "Ab Major",
    uploadDate: new Date(),
    stemsStatus: "completed"
  },
  {
    _id: "8",
    title: "Vertigo by Rob Gasser & Laura Brehm",
    path: "Vertigo",
    bpm: 87,
    key: "G Minor",
    uploadDate: new Date(),
    stemsStatus: "completed"
  },
  {
    _id: "9",
    title: "We Are by Jo Cohen & Whales",
    path: "We_Are",
    bpm: 128,
    key: "Ab Major",
    uploadDate: new Date(),
    stemsStatus: "completed"
  }
];

const SongLibrary = ({ userId, onUploadSuccess }) => {
  const isLoggedIn = useRequireLogin();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [songStatuses, setSongStatuses] = useState({});
  const [editingSongId, setEditingSongId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [songToDelete, setSongToDelete] = useState(null);

  useEffect(() => {
    // Just set loading to false since we're using static data
    setLoading(false);
  }, []);

  const renderProgress = (song) => {
    return (
      <div className="progress-section">
        <div className="progress-container">
          <div 
            className="progress-bar" 
            style={{ 
              width: "100%",
              transition: "width 0.3s ease-in-out"
            }} 
          />
        </div>
        <span className="progress-status">
          ready (<span>100%</span>)
        </span>
      </div>
    );
  };

  const renderSongTitle = (song) => {
    return (
      <div className="song-title-container">
        <span className="song-name">{song.title}</span>
      </div>
    );
  };

  const renderSongKey = (song) => {
    return (
        <span className="song-metadata">
          {song.key}
        </span>
    );
  };

  const renderSongBPM = (song) => {
    return (
        <span className="song-metadata">
          {song.bpm}
        </span>
    );
  };

  const getAudioFileName = (path) => {
    const fileNameMap = {
      "Let_Me_Down_Slowly_Alec_Benjamin": "Alec Benjamin - Let Me Down Slowly (Not So Good Remix)",
      "Disfigure_Blank": "Disfigure - Blank [NCS Release]",
      "NCS_Fall_to_Light": "NCS_Fall_to_Light",
      "NCS_On&On": "NCS_On&On",
      "chill-guy-remix": "chill-guy-remix"
    };
    return fileNameMap[path] || path;
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const AudioPlayer = ({ song }) => {
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);
    const fileName = getAudioFileName(song.path);
    const audioPath = `/assets/uploads/${fileName}.mp3`;

    const handleTimeUpdate = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
      }
    };

    const handlePlayPause = () => {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
      }
    };

    const handleSliderChange = (e) => {
      const time = Number(e.target.value);
      if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
      }
    };

    return (
      <div className="song-actions">
        <div className="custom-audio-player">
          <button 
            className={`play-button ${isPlaying ? 'playing' : ''}`} 
            onClick={handlePlayPause}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>
          <div className="time-control">
            <span className="time current">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              className="timeline-slider"
              onChange={handleSliderChange}
            />
            <span className="time duration">{formatTime(duration)}</span>
          </div>
          <audio
            ref={audioRef}
            src={audioPath}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          />
        </div>
      </div>
    );
  };

  const renderAudioPlayer = (song) => {
    return <AudioPlayer song={song} />;
  };

  if (loading) {
    return <div className="song-library-message">loading songs...</div>;
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
            <h2>Available Songs</h2>
          </div>
          
          <div className="song-list-container">
            <div className="song-list-header">
              <span className="header-title">song title</span>
              <span className="header-date">key</span>
              <span className="header-progress">BPM</span>
              <span className="header-actions">play</span>
            </div>
            <ul className="song-list">
              {AVAILABLE_TRACKS.map((song) => (
                <li key={song._id} className="song-item">
                  {renderSongTitle(song)}
                  <span className="song-date">
                    {renderSongKey(song)}
                  </span>
                  <div className="progress-section">
                    {renderSongBPM(song)}
                  </div>
                  {renderAudioPlayer(song)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default SongLibrary;
