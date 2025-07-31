import React, { useEffect, useRef } from 'react';

interface LoadingOverlayProps {
  message: string;
  details?: string | null;
  logs?: string[];
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message, details, logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-80 flex flex-col items-center justify-center z-[100] transition-opacity duration-300 p-4">
      <svg className="animate-spin h-10 w-10 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <h2 className="text-2xl text-white font-bold">{message}</h2>
      
      {logs && logs.length > 0 ? (
        <div className="mt-4 w-full max-w-2xl bg-black/50 rounded-lg shadow-inner font-mono text-sm p-4 h-64 overflow-y-auto border border-slate-700">
            <div ref={logContainerRef}>
                {logs.map((log, index) => {
                    let color = "text-white";
                    if(log.startsWith('[ERROR]')) color = 'text-red-400';
                    if(log.startsWith('[SUCCESS]')) color = 'text-green-400';

                    return (
                        <p key={index} className={`whitespace-pre-wrap ${color} flex`}>
                            <span className="text-cyan-400 mr-2 flex-shrink-0">{'>'}</span>
                            <span className="flex-grow">{log}</span>
                        </p>
                    )
                })}
                <div className="w-2 h-4 bg-cyan-400 animate-pulse mt-1"></div> {/* Blinking cursor */}
            </div>
        </div>
      ) : details ? (
        <p className="text-slate-300 mt-2 text-center max-w-md">{details}</p>
      ) : null}
      
      {logs && details && (
          <p className="text-red-400 mt-4 text-center max-w-2xl">{details}</p>
      )}

    </div>
  );
};

export default LoadingOverlay;
