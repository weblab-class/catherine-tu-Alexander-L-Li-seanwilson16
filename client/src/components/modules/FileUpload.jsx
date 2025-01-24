import React, { useState } from "react";
import { FileInput } from "@mantine/core";
import musicPlusIcon from "../../../public/assets/music-plus.svg";

import "./FileUpload.css";

const FileUpload = () => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileError, setFileError] = useState("");

  const handleFileUpload = (file) => {
    if (!file) {
      setFileError("");
      setUploadedFile(null);
      return;
    }

    if (!acceptedTypes.includes(file.type)) {
      setFileError("Please upload the correct file type");
      setUploadedFile(null);
      return;
    }

    setFileError("");
    setUploadedFile(file);
    console.log("File details:", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // Create a FileReader to read the file contents if needed
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log("File loaded successfully");
    };
    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      setFileError("Error reading file");
    };

    // Start reading the file
    reader.readAsArrayBuffer(file);
  };

  return (
    <FileInput
      className="file-input"
      rightSection={<img src={musicPlusIcon} alt="music plus" width="18" />}
      rightSectionPointerEvents="none"
      clearable
      accept="audio/mp4,audio/mpeg,audio/wav,video/mp4"
      label="upload your own audio file to mix"
      description="accepted: audio/mpeg, audio/wav, video/mp4"
      placeholder="input here"
      error={fileError}
      styles={{
        root: { textAlign: "left" },
        input: { textAlign: "left" },
      }}
      onChange={handleFileUpload}
      value={uploadedFile}
    />
  );
};

export default FileUpload;
