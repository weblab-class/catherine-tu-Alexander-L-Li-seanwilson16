import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { get } from "../../utilities";

const Profile = () => {
  let { userId } = useParams();
  console.log("Extracted userId from params:", userId);
  const [user, setUser] = useState();

  // useEffect(() => {
  //   // document.title = "Profile Page";
  //   get(`/api/user`, { userid: userId }).then((userObj) => setUser(userObj));
  // }, []);

  useEffect(() => {
    document.title = "Profile Page";

    if (userId) {
      get(`/api/user`, { userid: userId })
        .then((userObj) => {
          setUser(userObj);
          console.log("set user!!", userObj);
        })
        .catch((err) => console.error("Error fetching user:", err));
    }
  }, [userId]); // Add userId as a dependency

  if (!user) {
    return <div> Loading!</div>;
  }
  return (
    <div>
      <h1>Profile Page</h1>
      {/* Content for DJ page */}
    </div>
  );
};

export default Profile;
