import React, { useRef, useEffect } from "react";
import type { ReactNode } from "react";
import "./Modal.css";

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
  size?: "small" | "medium" | "large";
}

/**
 * Modal Component - Your Wingman's Command Overlay System
 * Provides full-screen modal dialogs with keyboard and click-outside handling
 * Features smooth animations and consistent theming across your interface
 */
const Modal: React.FC<ModalProps> = ({
  title,
  children,
  onClose,
  actions,
  size = "medium",
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  /**
   * Keyboard event handling for modal interactions
   * Your Wingman responds to escape commands instantly
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  /**
   * Click-outside detection for intuitive modal dismissal
   * Allows closing modals by clicking the backdrop area
   */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div className="modal-overlay">
      <div ref={modalRef} className={`modal-content modal-${size}`}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
};

export default Modal;
