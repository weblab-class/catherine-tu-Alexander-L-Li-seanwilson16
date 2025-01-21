import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";

import jwt_decode from "jwt-decode";

import "../utilities.css";

import { socket } from "../client-socket";

import { get, post, sleep } from "../utilities";
import { MantineProvider } from "@mantine/core";
import { UserContext, ThemeContext } from "./context/Context";

import lofibackground from "/assets/lofi-bg.png";
import Loading from "./modules/Loading";

function App() {
  const [userId, setUserId] = useState(undefined);
  const [theme, setTheme] = useState(lofibackground);
  const [isLoading, setIsLoading] = useState(true);

  // Add lofi class to body when app loads
  useEffect(() => {
    document.body.classList.add("lofi");
    return () => document.body.classList.remove("lofi");
  }, []);

  useEffect(() => {
    get("/api/whoami").then(async (user) => {
      if (user._id) {
        // they are registed in the database, and currently logged in.
        setUserId(user._id);
      }
      await sleep(500); // 0.5 second delay
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (userId) {
      get("/api/user", { userid: userId }).then((user) => {
        // console.log("user get", user);
        // console.log("theme has been set!");
        setTheme(user.theme);
      });
    } else {
      setTheme(lofibackground);
    }
  }, [userId]);

  const handleLogin = (credentialResponse) => {
    setIsLoading(true);
    const userToken = credentialResponse.credential;
    const decodedCredential = jwt_decode(userToken);
    console.log(`Logged in as ${decodedCredential.name}`);
    post("/api/login", { token: userToken }).then(async (user) => {
      setUserId(user._id);
      post("/api/initsocket", { socketid: socket.id });
      await sleep(1000); // 1 second delay upon logging in
      setIsLoading(false);
    });
  };

  const handleLogout = () => {
    setIsLoading(true);
    post("/api/logout").then(async () => {
      setUserId(undefined);
      await sleep(1000); // 1 second delay
      setIsLoading(false);
    });
  };

  const authContextValue = {
    userId,
    handleLogin,
    handleLogout,
  };

  useEffect(() => {
    console.log("theme dependency");
    // setTheme(theme);
    document.body.style.backgroundImage = `url(${theme})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundRepeat = "no-repeat";
    console.log("theme", theme);
  }, [theme]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <MantineProvider>
      <UserContext.Provider value={authContextValue}>
        <ThemeContext.Provider value={{ theme, setTheme }}>
          <Outlet context={{ userId: userId }} />
        </ThemeContext.Provider>
      </UserContext.Provider>
    </MantineProvider>
  );
}

export default App;
