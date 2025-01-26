import { useContext } from "react";
import { UserContext } from "../components/context/Context";

const useRequireLogin = () => {
  const { userId } = useContext(UserContext);
  return userId !== undefined && userId !== null;
};

export default useRequireLogin;
