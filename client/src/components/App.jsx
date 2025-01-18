import React, { useState, useEffect, createContext } from "react";
import { Outlet } from "react-router-dom";

import jwt_decode from "jwt-decode";

import "../utilities.css";

import { socket } from "../client-socket";

import { get, post, flask_get, flask_post } from "../utilities";
import { MantineProvider } from "@mantine/core";
import { UserContext, ThemeContext } from "./context/Context";

import lofibackground from "/assets/lofi-background-purple-blue.jpg";

function App() {
  const [userId, setUserId] = useState(undefined);
  const [theme, setTheme] = useState("");

  useEffect(() => {
    get("/api/whoami").then((user) => {
      if (user._id) {
        // they are registed in the database, and currently logged in.
        setUserId(user._id);
      }
    });

    // for our python api
    // flask_get("/api/flaskwhoami").then((user) => {
    //   if (user._id) {
    //     // they are registed in the database, and currently logged in.
    //     setUserId(user._id);
    //   }
    // });
  }, []);

  useEffect(() => {
    if (userId) {
      get("/api/user", { userid: userId }).then((user) => {
        console.log("user get", user);
        console.log("theme has been set!");
        setTheme(user.theme);
      });
    } else {
      setTheme(lofibackground);
    }
  }, [userId]);
  const handleLogin = (credentialResponse) => {
    const userToken = credentialResponse.credential;
    const decodedCredential = jwt_decode(userToken);
    console.log(`Logged in as ${decodedCredential.name}`);
    post("/api/login", { token: userToken }).then((user) => {
      setUserId(user._id);
      post("/api/initsocket", { socketid: socket.id });
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
    console.log("theme dependency");
    document.body.style.backgroundImage = `url(${theme})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundRepeat = "no-repeat";
    console.log("theme", theme);
  }, [theme]);

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
