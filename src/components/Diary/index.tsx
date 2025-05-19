import { Outlet } from "react-router-dom";
import "./Diary.css";

const Diary = () => {
  return (
    <div className="diary-container">
      <Outlet />
    </div>
  );
};

export default Diary;