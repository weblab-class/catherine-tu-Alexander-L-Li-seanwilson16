import React, { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import { get } from "../../utilities";
import { ThemeContext } from "../context/Context";
import ProfileButtons from "../modules/ProfileButtons";
import TimeOfDay from "../modules/TimeOfDay";
import Avatar from "../modules/Avatar";

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
    <>
      <div className="profile-container">
        <Avatar 
          userId={user._id} 
          currentAvatar={user.avatar} 
          onAvatarChange={(newAvatar) => {
            setUser({ ...user, avatar: newAvatar });
          }} 
        />
        <TimeOfDay name={user.name} />
        <div className="button-text-inline">
          <h2 className="theme-title">Choose a Theme:</h2>
          <ProfileButtons />
        </div>
      </div>
    </>
  );
};

export default Profile;
