
import React, { createContext, useContext, useState, ReactNode } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { AppSettings, Toast } from '../types';

interface AppContextType {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  toasts: Toast[];
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useLocalStorage<AppSettings>('app-settings', {
    apiKey: '',
    generalInstructions: 'You are an expert blog writer specializing in creating engaging and SEO-friendly comparison articles for Amazon products. Your tone should be helpful, informative, and persuasive. Format your output in clean HTML that can be directly pasted into a WordPress or Blogger editor. Include an introduction, a detailed comparison of each product, a pros/cons section for each, and a final recommendation. Use the provided affiliate links on the product titles in `<h2>` tags.',
  });

  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
    }, 5000);
  };

  return (
    <AppContext.Provider value={{ settings, setSettings, toasts, addToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

const ToastContainer: React.FC<{ toasts: Toast[] }> = ({ toasts }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {toasts.map(toast => {
        const bgColor = {
          success: 'bg-green-500',
          error: 'bg-red-500',
          info: 'bg-blue-500',
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`${bgColor} text-white py-2 px-4 rounded-lg shadow-lg animate-fade-in-right`}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
};