import React, { ReactNode, useRef, useEffect, useState } from 'react';
import './MedievalModal.css';

interface MedievalModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
  closeOnMouseLeave?: boolean; // Add this prop
}

const MedievalModal: React.FC<MedievalModalProps> = ({ 
  title, 
  children, 
  onClose,
  actions,
  closeOnMouseLeave = false // Default to false for backward compatibility
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mouseInside, setMouseInside] = useState(false);
  
  // Handle mouse enter/leave events
  const handleMouseEnter = () => setMouseInside(true);
  const handleMouseLeave = () => {
    if (closeOnMouseLeave) {
      // Small delay to prevent accidental closures
      setTimeout(() => {
        if (!mouseInside) {
          onClose();
        }
      }, 300);
      setMouseInside(false);
    }
  };
  
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);
  
  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  
  return (
    <div className="medieval-overlay">
      <div 
        ref={modalRef} 
        className="medieval-scroll"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Only show close button if not using closeOnMouseLeave */}
        {!closeOnMouseLeave && (
          <button className="medieval-close" onClick={onClose}>×</button>
        )}
        
        <div className="medieval-title">{title}</div>
        
        <div className="medieval-content">
          {children}
        </div>
        
        {actions && (
          <div className="medieval-actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default MedievalModal;