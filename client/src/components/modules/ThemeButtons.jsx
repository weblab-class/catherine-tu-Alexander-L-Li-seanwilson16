import React, { useState, useEffect, useContext } from "react";
import { ThemeContext } from "../context/Context";
import { post } from "../../utilities";

import { FileButton, Button, Group, Text } from "@mantine/core";
// import { Select } from "@mantine/core";

import lofibackground from "/assets/lofi-bg.png";
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
  const [activeTheme, setActiveTheme] = useState("");

  // Initialize active theme on component mount
  useEffect(() => {
    const currentTheme = themeOptions.find(option => option.url === theme);
    if (currentTheme) {
      setActiveTheme(currentTheme.name);
    }
  }, [theme]);

  // user changing the theme
  const updateTheme = (newTheme) => {
    // update theme in MongoDB and fetch it back for consistency
    post("/api/theme", { theme: newTheme.url })
      .then(() => {
        setTheme(newTheme.url);
        setActiveTheme(newTheme.name);
        // Store active theme in localStorage
        localStorage.setItem('activeTheme', newTheme.name);
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

    // Restore active theme from localStorage
    const savedTheme = localStorage.getItem('activeTheme');
    if (savedTheme) {
      setActiveTheme(savedTheme);
    }
  }, [theme]);

  return (
    <div className="button-container-profile">
      {themeOptions.map((option) => (
        <button 
          className={`button-style ${activeTheme === option.name ? 'active' : ''}`}
          key={option.name} 
          onClick={() => updateTheme(option)}
        >
          {option.name}
        </button>
      ))}
    </div>
  );
};

export default ThemeButtons;
