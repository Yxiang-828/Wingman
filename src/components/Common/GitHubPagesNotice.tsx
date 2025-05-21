import React, { useState, useEffect } from 'react';
import { MOCK_MODE } from '../../api/mockData';

const GitHubPagesNotice: React.FC = () => {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    // Only show when in mock mode
    if (MOCK_MODE) {
      setShow(true);
    }
  }, []);
  
  if (!show) return null;
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      left: '1rem',
      right: '1rem',
      backgroundColor: 'rgba(100, 108, 255, 0.9)',
      color: 'white',
      padding: '1rem',
      borderRadius: '8px',
      zIndex: 1000,
      textAlign: 'center',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
    }}>
      <p style={{ margin: 0, fontWeight: 'bold' }}>
        You're viewing the static demo version. Some features are simulated.
      </p>
      <button
        onClick={() => setShow(false)}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'transparent',
          border: 'none',
          color: 'white',
          fontSize: '1.2rem',
          cursor: 'pointer'
        }}
      >
        ×
      </button>
    </div>
  );
};

export default GitHubPagesNotice;