import React, { useState } from "react";
import { FileInput } from "@mantine/core";
import musicPlusIcon from "../../../public/assets/music-plus.svg";

import "./FileUpload.css";

const FileUpload = ({ onUploadSuccess }) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");

  const acceptedTypes = ["audio/mpeg", "audio/wav", "video/mp4", "audio/mp3"];

  const createStemJob = async (stemType) => {
    try {
      const response = await fetch(`/api/audioshake/${stemType}`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(`Failed to create ${stemType} job`);
      return await response.json();
    } catch (error) {
      console.error(`Error creating ${stemType} job:`, error);
      throw error;
    }
  };

  const waitForJobCompletion = async (jobId) => {
    try {
      const response = await fetch(`/api/audioshake/job/${jobId}`);
      if (!response.ok) throw new Error("Failed to get job status");
      const data = await response.json();
      return data.job.status === "completed";
    } catch (error) {
      console.error("Error checking job status:", error);
      return false;
    }
  };

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
      // First upload the file
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("title", file.name);

      const response = await fetch("/api/song", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload song");
      }

      const result = await response.json();
      console.log("Upload successful:", result);

      // Now create stem jobs
      setProcessingStatus("Creating stem jobs...");
      const stemTypes = ["drums", "vocals", "bass", "other"];
      const jobs = await Promise.all(
        stemTypes.map(async (stemType) => {
          const jobResult = await createStemJob(stemType);
          return { type: stemType, jobId: jobResult.job.id };
        })
      );

      // Wait for all jobs to complete
      setProcessingStatus("Processing stems...");
      for (const job of jobs) {
        let isComplete = false;
        while (!isComplete) {
          isComplete = await waitForJobCompletion(job.jobId);
          if (!isComplete) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before checking again
          }
        }
      }

      setProcessingStatus("Getting stem download links...");
      const stemDownloads = await Promise.all(
        jobs.map(async (job) => {
          const response = await fetch(`/api/audioshake/stems/${job.jobId}`);
          if (!response.ok) throw new Error(`Failed to get stems for ${job.type}`);
          const data = await response.json();
          return {
            type: job.type,
            stemId: data.stems[0].id
          };
        })
      );

      // Add stem information to the result
      result.stems = stemDownloads;

      // Clear the upload state
      setUploadedFile(null);
      setFileError("");
      setProcessingStatus("");

      // Notify parent component of successful upload
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setFileError("error uploading file");
    } finally {
      setIsUploading(false);
      setProcessingStatus("");
    }
  };

  return (
    <div className="file-upload-container">
      <FileInput
        className="file-input"
        label="upload your own song"
        description="acceptable types: .mp4, .mp3, .wav, .mpeg"
        placeholder="upload song here"
        rightSection={<img src={musicPlusIcon} alt="music plus" width="18" />}
        accept={acceptedTypes.join(",")}
        onChange={handleFileUpload}
        error={fileError}
        disabled={isUploading}
        value={uploadedFile}
      />
      {isUploading && <div className="upload-status">uploading...</div>}
      {processingStatus && <div className="processing-status">{processingStatus}</div>}
    </div>
  );
};

export default FileUpload;
