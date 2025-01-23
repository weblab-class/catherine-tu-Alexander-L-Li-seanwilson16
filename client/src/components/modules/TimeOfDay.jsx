import "./TimeOfDay.css";

/**
 * @property {string} name of the user
 */

const TimeOfDay = ({ name }) => {
  const hour = new Date().getHours();
  let greeting;

  if (hour < 12) {
    greeting = "good morning";
  } else if (hour < 18) {
    greeting = "good afternoon";
  } else {
    greeting = "good evening";
  }

  return (
    <div className="profile-title">
      <div className="greeting">{greeting},</div>
      <div className="user-name">{name.toLowerCase()}!</div>
    </div>
  );
};

export default TimeOfDay;
