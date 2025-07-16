import React, { useState } from "react";
import { updateUsername } from "../../services/hybridAuth";
import "./UsernameConflictModal.css";

interface UsernameConflictModalProps {
  isOpen: boolean;
  currentUsername: string;
  onClose: () => void;
  onSuccess: () => void;
  errorMessage?: string;
}

const UsernameConflictModal: React.FC<UsernameConflictModalProps> = ({
  isOpen,
  currentUsername,
  onClose,
  onSuccess,
  errorMessage,
}) => {
  const [newUsername, setNewUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUsername.trim()) {
      setError("Please enter a username");
      return;
    }

    if (newUsername === currentUsername) {
      setError("Please choose a different username");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await updateUsername(newUsername.trim());

      if (result.success) {
        console.log("Username updated successfully");
        onSuccess();
        onClose();
      } else {
        setError(result.error || "Failed to update username");
      }
    } catch (error: any) {
      console.error("Username update failed:", error);
      setError(error.message || "Failed to update username");
    }

    setLoading(false);
  };

  const handleCancel = () => {
    setNewUsername("");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="username-conflict-overlay">
      <div className="username-conflict-modal">
        <div className="modal-header">
          <h2>Username Taken</h2>
          <button
            className="close-btn"
            onClick={handleCancel}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="conflict-message">
            <p className="main-message">
              Boss, "<strong>{currentUsername}</strong>" is already taken
            </p>
            <p className="sub-message">
              You might have created this account when your were offline, this
              username has already been in use; please change to a new username,
              your data will not be affected.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="username-form">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="New username"
              disabled={loading}
              required
              className="username-input"
              autoFocus
            />

            {error && <div className="error-message">{error}</div>}

            <div className="button-group">
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="cancel-btn"
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={loading || !newUsername.trim()}
                className="update-btn"
              >
                {loading ? "Syncing..." : "Sync Up"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UsernameConflictModal;
