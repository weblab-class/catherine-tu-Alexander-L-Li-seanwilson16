import React, { useState } from "react";
import { FileInput } from "@mantine/core";
import musicPlusIcon from "../../../public/assets/music-plus.svg";

import "./FileUpload.css";

const FileUpload = ({ onUploadSuccess }) => {
  const [uploadedFiles, setUploadedFiles] = useState({
    audio: null,
    stem_bass: null,
    stem_drums: null,
    stem_melody: null,
    stem_vocals: null,
  });
  const [fileError, setFileError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const acceptedTypes = ["audio/mpeg", "audio/wav", "audio/mp3"];

  const handleFileUpload = async (file, type) => {
    if (!file) {
      setUploadedFiles(prev => ({ ...prev, [type]: null }));
      return;
    }

    if (!acceptedTypes.includes(file.type)) {
      setFileError(`Please upload an MP3 or WAV file for ${type}`);
      setUploadedFiles(prev => ({ ...prev, [type]: null }));
      return;
    }

    setFileError("");
    setUploadedFiles(prev => ({ ...prev, [type]: file }));
  };

  const handleSubmit = async () => {
    if (!uploadedFiles.audio) {
      setFileError("Please upload a main audio file");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("audio", uploadedFiles.audio);
      formData.append("title", uploadedFiles.audio.name);

      // Append stems if they exist
      Object.entries(uploadedFiles).forEach(([type, file]) => {
        if (type !== 'audio' && file) {
          formData.append(type, file);
        }
      });

      const response = await fetch("/api/song", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload song");
      }

      const result = await response.json();
      console.log("Upload successful:", result);

      // Clear the upload state
      setUploadedFiles({
        audio: null,
        stem_bass: null,
        stem_drums: null,
        stem_melody: null,
        stem_vocals: null,
      });
      setFileError("");

      // Notify parent component of successful upload
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      setFileError("Error uploading files");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="file-upload-container">
      <FileInput
        className="file-input"
        label="upload your song"
        description="acceptable types: .mp3, .wav"
        placeholder="upload main song file"
        rightSection={<img src={musicPlusIcon} alt="music plus" width="18" />}
        accept={acceptedTypes.join(",")}
        onChange={(file) => handleFileUpload(file, 'audio')}
        error={fileError}
        disabled={isUploading}
        value={uploadedFiles.audio}
      />

      <button 
        className="submit-button" 
        onClick={handleSubmit}
        disabled={isUploading || !uploadedFiles.audio}
      >
        {isUploading ? "uploading..." : "upload"}
      </button>
    </div>
  );
};

export default FileUpload;
