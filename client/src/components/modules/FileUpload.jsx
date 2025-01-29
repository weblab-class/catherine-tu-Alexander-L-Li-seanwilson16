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
  const [processingStatus, setProcessingStatus] = useState("");

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

      // Append stems if they exist
      Object.entries(uploadedFiles).forEach(([type, file]) => {
        if (type !== "audio" && file) {
          formData.append(type, file);
        }
      });

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
            await new Promise((resolve) => setTimeout(resolve, 5000));
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
            stemId: data.stems[0].id,
          };
        })
      );

      // Add stem information to the result
      result.stems = stemDownloads;
      console.log("Final result with stems:", result);

      // Clear the upload state
      setUploadedFiles({
        audio: null,
        stem_bass: null,
        stem_drums: null,
        stem_melody: null,
        stem_vocals: null,
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
      <FileInput
        className="file-input"
        label="upload your song"
        description="acceptable types: .mp3, .wav"
        placeholder="upload main song file"
        rightSection={<img src={musicPlusIcon} alt="music plus" width="18" />}
        accept={acceptedTypes.join(",")}
        onChange={(file) => handleFileUpload(file, "audio")}
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
