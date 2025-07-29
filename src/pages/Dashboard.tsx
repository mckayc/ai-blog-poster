import React, { useState, useEffect, useCallback } from 'react';
import * as db from '../services/dbService';
import { testApiKey } from '../services/geminiService';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import Button from '../components/common/Button';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const Dashboard: React.FC = () => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [settings, setSettings] = useState('');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [keySaved, setKeySaved] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [apiKeyIsSet, setApiKeyIsSet] = useState(false);

  const checkApiKeyStatus = useCallback(async () => {
    try {
        const status = await db.getApiKeyStatus();
        setApiKeyIsSet(!!status.apiKey);
    } catch (e) {
        console.error(e);
        setApiKeyIsSet(false);
    }
  }, []);


  useEffect(() => {
    checkApiKeyStatus();
    db.getSettings().then(s => setSettings(s.generalSettings || ''));
  }, [checkApiKeyStatus]);

  const handleSaveApiKey = async () => {
    try {
      await db.saveApiKey(apiKeyInput);
      setKeySaved(true);
      setApiKeyInput('');
      setTestStatus('idle');
      checkApiKeyStatus();
      setTimeout(() => setKeySaved(false), 3000);
    } catch(e) {
      alert('Failed to save API Key.');
    }
  };

  const handleSaveSettings = async () => {
    try {
        await db.saveSettings(settings);
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 3000);
    } catch (e) {
        alert('Failed to save settings.');
    }
  };
  
  const handleTestApiKey = async () => {
    setTestStatus('testing');
    const isValid = await testApiKey();
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
         if (apiKeyIsSet) {
            return <span className="text-green-400">API Key is set.</span>;
         }
        return <span className="text-slate-400">API Key not set.</span>;
    }
  };


  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">API Configuration</h2>
          <p className="text-slate-400 mb-4">
            Your Gemini API Key is required to generate content. It's stored securely in the app's database and never exposed to the client.
          </p>
          <div className="space-y-4">
            <Input
              label={apiKeyIsSet ? "Update Gemini API Key" : "Enter Gemini API Key"}
              id="api-key"
              type="password"
              value={apiKeyInput}
              onChange={(e) => {
                setApiKeyInput(e.target.value);
                setTestStatus('idle');
              }}
              placeholder="Enter new key to update"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button onClick={handleTestApiKey} disabled={!apiKeyIsSet || testStatus === 'testing'}>
                  {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                </Button>
                <div className="h-6">{getStatusIndicator()}</div>
              </div>
              <div className="flex items-center space-x-3">
                 {keySaved && <span className="text-green-400 text-sm">Saved!</span>}
                <Button onClick={handleSaveApiKey} disabled={!apiKeyInput}>
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
