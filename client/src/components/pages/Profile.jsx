import React, { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import { get } from "../../utilities";
import ProfileButtons from "../modules/ProfileButtons";

import "./Profile.css";

const Profile = () => {
  let { userId } = useParams();
  const [user, setUser] = useState();

  useEffect(() => {
    if (userId) {
      // Fetch user data including theme
      get(`/api/user`, { userid: userId }).then((userObj) => {
        setUser(userObj);
      });
    }
  }, [userId]); // changing user id is the dependency

  if (!user) {
    return <div> Loading!</div>;
  }

  return (
    <div>
      <h1 className="profile-title">{user.name}'s' profile page</h1>
      <div className="button-text-inline">
        <h2 className="theme-title">Choose a Theme:</h2>
        <ProfileButtons />
      </div>
    </div>
  );
};

export default Profile;
