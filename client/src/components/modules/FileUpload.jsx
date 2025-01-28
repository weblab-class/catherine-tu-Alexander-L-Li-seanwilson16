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
      console.log(`Creating ${stemType} stem job...`);
      const response = await fetch(`/api/audioshake/${stemType}`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(`Failed to create ${stemType} job`);
      const result = await response.json();
      console.log(`Successfully created ${stemType} job:`, result);
      return result;
    } catch (error) {
      console.error(`Error creating ${stemType} job:`, error);
      throw error;
    }
  };

  const waitForJobCompletion = async (jobId) => {
    try {
      console.log(`Checking status for job ${jobId}...`);
      const response = await fetch(`/api/audioshake/job/${jobId}`);
      if (!response.ok) throw new Error("Failed to get job status");
      const data = await response.json();
      console.log(`Job ${jobId} status:`, data.job.status);
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
      console.log("Starting file upload...");
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("title", file.name);

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

      // Now create stem jobs
      setProcessingStatus("Creating stem jobs...");
      console.log("Starting stem creation process...");
      const stemTypes = ["drums", "vocals", "bass", "other"];
      const jobs = await Promise.all(
        stemTypes.map(async (stemType) => {
          const jobResult = await createStemJob(stemType);
          return { type: stemType, jobId: jobResult.job.id };
        })
      );
      console.log("All stem jobs created:", jobs);

      // Wait for all jobs to complete
      setProcessingStatus("Processing stems...");
      console.log("Waiting for stems to process...");
      for (const job of jobs) {
        let isComplete = false;
        while (!isComplete) {
          isComplete = await waitForJobCompletion(job.jobId);
          if (!isComplete) {
            console.log(`Job ${job.jobId} not complete, waiting 5 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
        console.log(`Job ${job.jobId} completed successfully!`);
      }

      setProcessingStatus("Getting stem download links...");
      console.log("Retrieving stem download information...");
      const stemDownloads = await Promise.all(
        jobs.map(async (job) => {
          const response = await fetch(`/api/audioshake/stems/${job.jobId}`);
          if (!response.ok) throw new Error(`Failed to get stems for ${job.type}`);
          const data = await response.json();
          console.log(`Got stem data for ${job.type}:`, data);
          return {
            type: job.type,
            stemId: data.stems[0].id
          };
        })
      );

      // Add stem information to the result
      result.stems = stemDownloads;
      console.log("Final result with stems:", result);

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
