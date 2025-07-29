
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { testApiKey } from '../services/geminiService';
import SaveIcon from '../components/icons/SaveIcon';

const Dashboard: React.FC = () => {
  const { settings, setSettings, addToast } = useApp();
  const [localApiKey, setLocalApiKey] = useState(settings.apiKey);
  const [localInstructions, setLocalInstructions] = useState(settings.generalInstructions);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'failed'>('idle');

  useEffect(() => {
    setLocalApiKey(settings.apiKey);
    setLocalInstructions(settings.generalInstructions);
  }, [settings]);

  const handleTestApiKey = async () => {
    setIsTesting(true);
    setTestStatus('idle');
    const isValid = await testApiKey(localApiKey);
    if (isValid) {
      setTestStatus('success');
      addToast('API Key connection successful!', 'success');
    } else {
      setTestStatus('failed');
      addToast('API Key connection failed.', 'error');
    }
    setIsTesting(false);
  };

  const handleSaveSettings = () => {
    setSettings({
      apiKey: localApiKey,
      generalInstructions: localInstructions,
    });
    addToast('Settings saved successfully!', 'success');
  };
  
  const getTestStatusIndicator = () => {
    if (isTesting) return 'border-yellow-500';
    if (testStatus === 'success') return 'border-green-500';
    if (testStatus === 'failed') return 'border-red-500';
    return 'border-gray-300';
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome!</h2>
        <p className="text-gray-600">
          This is your central hub for managing settings and navigating the app. Start by setting up your Gemini API key below.
        </p>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">API Configuration</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              Gemini API Key
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                id="apiKey"
                value={localApiKey}
                onChange={(e) => {
                  setLocalApiKey(e.target.value);
                  setTestStatus('idle');
                }}
                className={`flex-grow px-3 py-2 border rounded-md shadow-sm focus:ring-primary focus:border-primary transition-colors ${getTestStatusIndicator()}`}
                placeholder="Enter your Gemini API Key"
              />
              <button
                onClick={handleTestApiKey}
                disabled={isTesting || !localApiKey}
                className="px-4 py-2 bg-secondary text-white font-semibold rounded-md shadow-sm hover:bg-opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isTesting ? 'Testing...' : 'Test Key'}
              </button>
            </div>
             {testStatus === 'success' && <p className="text-sm text-green-600 mt-1">Connection successful.</p>}
             {testStatus === 'failed' && <p className="text-sm text-red-600 mt-1">Connection failed. Please check your key.</p>}
          </div>
        </div>
      </div>
      
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">AI Generation Settings</h3>
        <div>
          <label htmlFor="generalInstructions" className="block text-sm font-medium text-gray-700 mb-1">
            General AI Instructions
          </label>
          <p className="text-sm text-gray-500 mb-2">
            These instructions are sent with every request to guide the AI's tone, style, and output format.
          </p>
          <textarea
            id="generalInstructions"
            value={localInstructions}
            onChange={(e) => setLocalInstructions(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
            placeholder="e.g., You are a witty blog writer who uses humor..."
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-md shadow-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-transform transform hover:scale-105"
        >
          <SaveIcon className="w-5 h-5"/>
          Save All Settings
        </button>
      </div>
    </div>
  );
};

export default Dashboard;