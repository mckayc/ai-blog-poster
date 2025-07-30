
import React, { useState, useEffect } from 'react';
import * as db from '../services/dbService';
import { testApiKey } from '../services/geminiService';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import Button from '../components/common/Button';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const Dashboard: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [settings, setSettings] = useState('');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [keySaved, setKeySaved] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    setApiKey(db.getApiKey() || '');
    setSettings(db.getSettings() || '');
  }, []);

  const handleSaveApiKey = () => {
    db.saveApiKey(apiKey);
    setKeySaved(true);
    setTestStatus('idle');
    setTimeout(() => setKeySaved(false), 3000);
  };

  const handleSaveSettings = () => {
    db.saveSettings(settings);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };
  
  const handleTestApiKey = async () => {
    setTestStatus('testing');
    const isValid = await testApiKey(apiKey);
    setTestStatus(isValid ? 'success' : 'error');
  };
  
  const getStatusIndicator = () => {
    switch (testStatus) {
      case 'testing':
        return <span className="text-yellow-400">Testing...</span>;
      case 'success':
        return <span className="text-green-400">Connection successful!</span>;
      case 'error':
        return <span className="text-red-400">Connection failed. Check key.</span>;
      default:
        return null;
    }
  };


  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">API Configuration</h2>
          <p className="text-slate-400 mb-4">
            Your Gemini API Key is required to generate content. It's stored securely in your browser's local storage and never sent anywhere except to Google's API.
          </p>
          <div className="space-y-4">
            <Input
              label="Gemini API Key"
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestStatus('idle');
              }}
              placeholder="Enter your API key"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button onClick={handleTestApiKey} disabled={!apiKey || testStatus === 'testing'}>
                  {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                </Button>
                <div className="h-6">{getStatusIndicator()}</div>
              </div>
              <div className="flex items-center space-x-3">
                 {keySaved && <span className="text-green-400 text-sm">Saved!</span>}
                <Button onClick={handleSaveApiKey} disabled={!apiKey}>
                  Save Key
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">Global AI Settings</h2>
          <p className="text-slate-400 mb-4">
            Provide general information or instructions for the AI to use in all blog posts. For example, specify a target audience, writing tone, or standard disclaimers.
          </p>
          <Textarea
            label="General Instructions for AI"
            id="ai-settings"
            rows={5}
            value={settings}
            onChange={(e) => setSettings(e.target.value)}
            placeholder="e.g., 'Write in a friendly, conversational tone for tech beginners. Always include a pros and cons section.'"
          />
          <div className="mt-4 flex items-center justify-end space-x-3">
            {settingsSaved && <span className="text-green-400 text-sm">Saved!</span>}
            <Button onClick={handleSaveSettings}>Save Settings</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;