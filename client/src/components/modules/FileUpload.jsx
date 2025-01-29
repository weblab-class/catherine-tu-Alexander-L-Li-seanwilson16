import React, { useState, useRef, useEffect } from "react";
import { FileInput } from "@mantine/core";
import musicPlusIcon from "../../../public/assets/music-plus.svg";

import "./FileUpload.css";

const FileUpload = ({ onUploadSuccess }) => {
  const [uploadedFiles, setUploadedFiles] = useState({
    audio: null,
  });
  const [fileError, setFileError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowUploadModal(false);
      }
    };

    if (showUploadModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUploadModal]);

  const acceptedTypes = ["audio/mpeg", "audio/wav", "audio/mp3"];

  const handleFileUpload = async (file, type) => {
    if (!file) {
      setUploadedFiles((prev) => ({ ...prev, [type]: null }));
      return;
    }

    if (!acceptedTypes.includes(file.type)) {
      setFileError(`Please upload an MP3 or WAV file for ${type}`);
      setUploadedFiles((prev) => ({ ...prev, [type]: null }));
      return;
    }

    setFileError("");
    setUploadedFiles((prev) => ({ ...prev, [type]: file }));
  };

  const handleSubmit = async () => {
    if (!uploadedFiles.audio) {
      setFileError("Please upload a main audio file");
      return;
    }

    setIsUploading(true);

    try {
      // First upload the file
      console.log("Starting file upload...");
      const formData = new FormData();
      formData.append("audio", uploadedFiles.audio);
      formData.append("title", uploadedFiles.audio.name);

      const response = await fetch("/api/song", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Server error:", errorData);
        throw new Error(`Failed to upload song: ${errorData}`);
      }

      const result = await response.json();
      console.log("Upload successful:", result);

      // Clear the upload state
      setUploadedFiles({
        audio: null,
      });
      setFileError("");
      setProcessingStatus("");

      // Notify parent component of successful upload
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      setFileError("Error uploading files");
    } finally {
      setIsUploading(false);
      setProcessingStatus("");
    }
  };

  return (
    <div className="file-upload-container">
      <button 
        className="upload-button"
        onClick={() => setShowUploadModal(true)}
      >
        <img src={musicPlusIcon} alt="upload" width="18" />
        <span>upload song</span>
      </button>

      {showUploadModal && (
        <div className="upload-modal">
          <div className="upload-modal-content" ref={modalRef}>
            <h3>Upload Your Song</h3>
            <FileInput
              className="file-input"
              description="acceptable types: .mp3, .wav, etc."
              placeholder="choose a song file"
              rightSection={<img src={musicPlusIcon} alt="music plus" width="18" />}
              accept={acceptedTypes.join(",")}
              onChange={(file) => handleFileUpload(file, "audio")}
              error={fileError}
              disabled={isUploading}
              value={uploadedFiles.audio}
            />

            <div className="modal-buttons">
              <button
                className="cancel-button"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadedFiles({ audio: null });
                  setFileError("");
                }}
              >
                cancel
              </button>
              <button
                className="submit-button"
                onClick={() => {
                  handleSubmit();
                  setShowUploadModal(false);
                }}
                disabled={isUploading || !uploadedFiles.audio}
              >
                {isUploading ? "Uploading..." : "upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
