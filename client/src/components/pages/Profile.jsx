import React, { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import { get, post } from "../../utilities";
import { ThemeContext } from "../context/Context";
import { FileButton, Button, Group, Text } from "@mantine/core";
// import { Select } from "@mantine/core";
import "./Profile.css";

// theme options
const themeOptions = [
  { name: "lofi", url: "/src/public/assets/lofi-background-purple-blue.jpg" },
  { name: "nature", url: "/src/public/assets/nature-background.jpg" },
  { name: "ocean", url: "/src/public/assets/ocean-background.jpg" },
];

const Profile = () => {
  let { userId } = useParams();
  const { theme, setTheme } = useContext(ThemeContext);
  const [user, setUser] = useState();
  // const [file, setFile] = useState([]);

  // user changing the theme
  const updateTheme = (newTheme) => {
    // update theme in MongoDB and fetch it back for consistency
    post("/api/theme", { userid: userId, theme: newTheme.url })
      .then(() => {
        setTheme(newTheme.url);
      })
      .catch((err) => {
        console.error("Failed to update theme:", err);
      });
  };

  // useEffect(() => {
  //   console.log("in here");
  //   if (file) {
  //     // reate a URL from the uploaded file
  //     const imageUrl = URL.createObjectURL(file); // generate a URL for the uploaded image
  //     post("/api/theme", { userid: userId, theme: imageUrl })
  //       .then(() => {
  //         setTheme(imageUrl); // set the background to the uploaded image URL
  //       })
  //       .catch((err) => {
  //         console.error("Failed to update theme:", err);
  //       });
  //   }
  // }, [file, userId, setTheme]);

  useEffect(() => {
    document.title = "Profile Page";

    if (userId) {
      // Fetch user data including theme
      get(`/api/user`, { userid: userId }).then((userObj) => {
        setUser(userObj);
      });
    }
  }, [userId, setTheme]); // changing user id is the dependency

  // check if theme changes
  useEffect(() => {
    document.body.style.backgroundImage = `url(${theme})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundRepeat = "no-repeat";
  }, [theme]);

  if (!user) {
    return <div> Loading!</div>;
  }

  return (
    <div>
      <h1 className="profile-title">{user.name}'s' profile page</h1>
      <div className="button-text-inline">
        <h2 className="theme-title">Choose a Theme:</h2>
        <div className="button-container-profile">
          {themeOptions.map((option) => (
            <button className="button-style" key={option.name} onClick={() => updateTheme(option)}>
              {option.name}
            </button>
          ))}
          {/* <div className="button-style">
            <Group justify="center">
              <FileButton onChange={setFile} accept="image/png,image/jpeg,image/jpg">
                {(props) => <Button {...props}>upload image</Button>}
              </FileButton>
            </Group>

            {file && (
              <Text size="sm" ta="center" mt="sm">
                {file.name}
              </Text>
            )}
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default Profile;
