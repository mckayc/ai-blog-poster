
import React from 'react';

interface LoadingOverlayProps {
  message: string;
  details?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message, details }) => {
  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-80 flex flex-col items-center justify-center z-[100] transition-opacity duration-300">
      <svg className="animate-spin h-10 w-10 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <h2 className="text-2xl text-white font-bold">{message}</h2>
      {details && <p className="text-slate-300 mt-2 text-center max-w-md">{details}</p>}
    </div>
  );
};

export default LoadingOverlay;
