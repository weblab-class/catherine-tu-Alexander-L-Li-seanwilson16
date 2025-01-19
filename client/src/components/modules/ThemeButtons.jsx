import React, { useState, useEffect, useContext } from "react";
import { ThemeContext } from "../context/Context";
import { post } from "../../utilities";

import { FileButton, Button, Group, Text } from "@mantine/core";
// import { Select } from "@mantine/core";

import lofibackground from "/assets/lofi-background-purple-blue.jpg";
import naturebackground from "/assets/nature-background.jpeg";
import oceanbackground from "/assets/ocean-background.jpg";

import "./ThemeButtons.css";

// theme options
const themeOptions = [
  { name: "lofi", url: lofibackground },
  { name: "nature", url: naturebackground },
  { name: "ocean", url: oceanbackground },
];

const ThemeButtons = () => {
  const { theme, setTheme } = useContext(ThemeContext);

  // const [file, setFile] = useState([]);

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

  // user changing the theme
  const updateTheme = (newTheme) => {
    // update theme in MongoDB and fetch it back for consistency
    post("/api/theme", { theme: newTheme.url })
      .then(() => {
        setTheme(newTheme.url);
      })
      .catch((err) => {
        console.error("Failed to update theme:", err);
      });
  };

  // check if theme changes
  useEffect(() => {
    document.body.style.backgroundImage = `url(${theme})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundRepeat = "no-repeat";
  }, [theme]);

  return (
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
  );
};

export default ThemeButtons;
