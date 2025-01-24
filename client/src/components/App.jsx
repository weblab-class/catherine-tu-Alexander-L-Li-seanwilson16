import React, { useState, useEffect, createContext } from "react";
import { Outlet } from "react-router-dom";

import jwt_decode from "jwt-decode";

import "../utilities.css";

import { socket } from "../client-socket";

import { get, post } from "../utilities";
import { MantineProvider } from "@mantine/core";
import { UserContext, ThemeContext } from "./context/Context";

import lofibackground from "/assets/lofi-bg.png";
import Loading from "./modules/Loading";

function App() {
  const [userId, setUserId] = useState(undefined);
  const [theme, setTheme] = useState(null); // Start with no theme
  const [isLoading, setIsLoading] = useState(true);

  // Add lofi class to body when app loads
  useEffect(() => {
    document.body.classList.add("lofi");
    return () => document.body.classList.remove("lofi");
  }, []);

  useEffect(() => {
    get("/api/whoami").then((user) => {
      if (user._id) {
        // they are registed in the database, and currently logged in.
        setUserId(user._id);
        // Fetch theme immediately after confirming user
        get("/api/user", { userid: user._id }).then((userData) => {
          if (userData.theme) {
            // Preload the theme before setting it
            const img = new Image();
            img.onload = () => setTheme(userData.theme);
            img.onerror = () => setTheme(lofibackground);
            img.src = userData.theme;
          } else {
            setTheme(lofibackground);
          }
        });
      } else {
        setTheme(lofibackground);
      }
    });
  }, []);

  const handleLogin = (credentialResponse) => {
    setIsLoading(true);
    const userToken = credentialResponse.credential;
    const decodedCredential = jwt_decode(userToken);
    post("/api/login", { token: userToken }).then((user) => {
      console.log("login response:", user);
      setUserId(user._id);
      post("/api/initsocket", { socketid: socket.id });
      // Fetch and set theme after successful login
      get("/api/user", { userid: user._id }).then((userData) => {
        if (userData.theme) {
          // Preload the theme before setting it
          const img = new Image();
          img.onload = () => setTheme(userData.theme);
          img.onerror = () => setTheme(lofibackground);
          img.src = userData.theme;
        } else {
          setTheme(lofibackground);
        }
      });
    });
  };

  const handleLogout = () => {
    setUserId(undefined);
    post("/api/logout");
  };

  const authContextValue = {
    userId,
    handleLogin,
    handleLogout,
  };

  useEffect(() => {
    if (!theme) return;
    document.body.style.backgroundImage = `url(${theme})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundRepeat = "no-repeat";
    setIsLoading(false);
  }, [theme]);

  return (
    <MantineProvider>
      <UserContext.Provider value={authContextValue}>
        <ThemeContext.Provider value={{ theme, setTheme }}>
          {isLoading ? (
            <Loading />
          ) : (
            <Outlet context={{ userId: userId }} />
          )}
        </ThemeContext.Provider>
      </UserContext.Provider>
    </MantineProvider>
  );
}

export default App;
