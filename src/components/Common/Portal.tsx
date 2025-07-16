import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

interface PortalProps {
  children: React.ReactNode;
  container?: HTMLElement;
}

/**
 * Portal component for rendering content outside the current React tree hierarchy
 * Useful for modals, tooltips, and popovers that shouldn't be constrained by parent styling
 */
const Portal: React.FC<PortalProps> = ({ children, container }) => {
  // Calculate container once
  const portalContainer = useMemo(() => {
    return container || document.body;
  }, [container]);

  // Disable scroll only when needed
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Prevent wheel events on the modal overlay specifically
    const preventScroll = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Add event listener to prevent scrolling
    document.addEventListener("wheel", preventScroll, { passive: false });

    return () => {
      document.body.style.overflow = originalStyle;
      document.removeEventListener("wheel", preventScroll);
    };
  }, []);

  return createPortal(children, portalContainer);
};

export default Portal;
