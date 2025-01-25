import React, { useState } from "react";
import { FileInput } from "@mantine/core";
import musicPlusIcon from "../../../public/assets/music-plus.svg";

import "./FileUpload.css";

const FileUpload = ({ onUploadSuccess }) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const acceptedTypes = ["audio/mpeg", "audio/wav", "video/mp4", "audio/mp3"];

  const handleFileUpload = async (file) => {
    if (!file) {
      setFileError("");
      setUploadedFile(null);
      return;
    }

    if (!acceptedTypes.includes(file.type)) {
      setFileError("please upload an MP3 or WAV file");
      setUploadedFile(null);
      return;
    }

    setFileError("");
    setUploadedFile(file);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("title", file.name); // You can add a title input field later

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
      setUploadedFile(null);
      setFileError("");

      // Notify parent component of successful upload
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
    } catch (error) {
      console.error("rror uploading file:", error);
      setFileError("error uploading file");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="file-upload-container">
      <FileInput
        className="file-input"
        label="upload your own song"
        description="acceptable types: .mp4, .wav, .mpeg"
        placeholder="upload song here"
        rightSection={<img src={musicPlusIcon} alt="music plus" width="18" />}
        accept={acceptedTypes.join(",")}
        onChange={handleFileUpload}
        error={fileError}
        disabled={isUploading}
        value={uploadedFile}
      />
      {isUploading && <div className="upload-status">uploading...</div>}
    </div>
  );
};

export default FileUpload;
