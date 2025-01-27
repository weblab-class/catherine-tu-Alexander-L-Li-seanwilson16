import React, { createContext, useState, useEffect } from "react";
import { get } from "../utilities";

export const UserContext = createContext({
  userId: null,
  setUserId: () => {},
  user: null,
  setUser: () => {},
});

export const UserProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Try to get user info if userId exists
    if (userId) {
      get("/api/user", { userId }).then((userObj) => {
        setUser(userObj);
      });
    }
  }, [userId]);

  const value = {
    userId,
    setUserId,
    user,
    setUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
