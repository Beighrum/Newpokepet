import React from 'react';

// Simple mock component for safe HTML display
export const SafeHTMLDisplay = ({ content, fallback, className = '', ...props }) => {
  return (
    <span className={className} {...props}>
      {content || fallback || 'N/A'}
    </span>
  );
};

export default SafeHTMLDisplay;