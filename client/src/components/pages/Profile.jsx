import React, { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import { get } from "../../utilities";
import ThemeButtons from "../modules/ThemeButtons";
import TimeOfDay from "../modules/TimeOfDay";
import Avatar from "../modules/Avatar";
import NavBar from "../modules/NavBar";

import { FileInput } from "@mantine/core";
import musicPlusIcon from "../../../public/assets/music-plus.svg";

import "./Profile.css";

const Profile = () => {
  let { userId } = useParams();
  const [user, setUser] = useState();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileError, setFileError] = useState("");

  const acceptedTypes = ["audio/mp4", "audio/mpeg", "audio/wav", "video/mp4"];

  useEffect(() => {
    if (userId) {
      // Fetch user data including theme
      get("/api/user", { userid: userId }).then((userObj) => {
        setUser(userObj);
      });
    }
  }, [userId]); // changing user id is the dependency

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

  if (!user) {
    return <div></div>;
  }

  return (
    <>
      <div className="profile-container">
        <NavBar />
        <Avatar
          userId={user._id}
          currentAvatar={user.avatar}
          onAvatarChange={(newAvatar) => {
            setUser({ ...user, avatar: newAvatar });
          }}
        />
        <TimeOfDay name={user.name} />
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
        <div className="button-text-inline">
          <h2 className="theme-title">Choose a Theme:</h2>
          <ThemeButtons />
        </div>
      </div>
    </>
  );
};

export default Profile;
