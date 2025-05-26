import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
  container?: HTMLElement | undefined; // Allow explicit undefined
}

/**
 * Portal component for rendering content outside the current React tree hierarchy
 * Useful for modals, tooltips, and popovers that shouldn't be constrained by parent styling
 */
const Portal: React.FC<PortalProps> = ({ children, container }) => {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Use specified container, or default to document.body
    const targetNode = container || document.body;
    setMountNode(targetNode);
    
    return () => {
      setMountNode(null);
    };
  }, [container]);

  return mountNode ? createPortal(children, mountNode) : null;
};

export default Portal;