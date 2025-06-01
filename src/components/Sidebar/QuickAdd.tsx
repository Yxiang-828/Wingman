// Quick action button for rapid diary entry creation
import { useNavigate } from "react-router-dom";

const QuickAdd: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="mt-4 px-4">
      <button
        className="action-btn w-full flex items-center justify-center gap-2"
        onClick={() => navigate("/diary/write")}
      >
        <span className="icon-rotate">✨</span>
        New Entry
      </button>
    </div>
  );
};

export default QuickAdd;
