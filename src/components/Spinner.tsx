import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-extfire-red border-t-transparent rounded-full"></div>
    </div>
  );
};

export default Spinner; 