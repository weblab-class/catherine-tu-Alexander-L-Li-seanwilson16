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
    <h1 className="profile-title">
      {greeting}, {name.toLowerCase()}!
    </h1>
  );
};

export default TimeOfDay;
