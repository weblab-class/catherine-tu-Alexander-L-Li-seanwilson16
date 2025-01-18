import React, { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import { get, post } from "../../utilities";
import { ThemeContext } from "../context/Context";
import "./Profile.css";
// import { FileButton, Button, Group, Text } from "@mantine/core";

// theme options
const themeOptions = [
  { name: "lofi", url: "/src/assets/lofi-background-purple-blue.jpg" },
  { name: "nature", url: "/src/assets/nature-background.jpg" },
  { name: "ocean", url: "/src/assets/ocean-background.jpg" },
];

const Profile = () => {
  let { userId } = useParams();
  const { theme, setTheme } = useContext(ThemeContext);
  const [user, setUser] = useState();
  // const [file, setFile] = useState([]);

  // user changing the theme
  const updateTheme = (newTheme) => {
    // update theme in MongoDB and fetch it back for consistency
    post("/api/theme", { userid: userId, theme: newTheme })
      .then(() => {
        setTheme(newTheme.url);
      })
      .catch((err) => {
        console.error("Failed to update theme:", err);
      });
  };

  useEffect(() => {
    document.title = "Profile Page";

    if (userId) {
      // Fetch user data including theme
      get(`/api/user`, { userid: userId }).then((userObj) => {
        setUser(userObj);
        // setTheme(userObj.theme.url);
        // document.body.style.backgroundImage = `url(${userObj.theme.url})`;
      });
    }
  }, [userId, setTheme]); // changing user id is the dependency

  // check if theme changes
  // for changing theme
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
      <h1 class="profile-title">{user.name}'s' profile page</h1>
      <div class="button-text-inline">
        <h2 class="theme-title">Choose a Theme:</h2>
        <div className="button-container-profile">
          {themeOptions.map((option) => (
            <button className="button-style" key={option.name} onClick={() => updateTheme(option)}>
              {option.name}
            </button>
          ))}
          {/* <button
          className="button-style"
          onClick={() => updateTheme({ name: "custom", url: "uploaded-url-here" })}
        >
          upload your own
        </button> */}
          {/* mantineee */}
          {/* <Group justify="center">
          <FileButton onChange={setFile} accept="image/png,image/jpeg">
            {(props) => <Button {...props}>Upload image</Button>}
          </FileButton>
        </Group> */}

          {/* {file && (
          <Text size="sm" ta="center" mt="sm">
            Picked file: {file.name}
          </Text>
        )} */}
        </div>
      </div>
    </div>
  );
};

export default Profile;
