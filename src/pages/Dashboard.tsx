
import React, { useState, useEffect, useCallback } from 'react';
import * as db from './../services/dbService';
import { testApiKey } from './../services/geminiService';
import { AppSettings } from './../types';
import Card from './../components/common/Card';
import Textarea from './../components/common/Textarea';
import Button from './../components/common/Button';
import Input from './../components/common/Input';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';
type ApiKeyStatus = 'loading' | 'set' | 'not_set';

const Dashboard: React.FC = () => {
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>('loading');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    db.getApiKeyStatus().then(status => {
      setApiKeyStatus(status.apiKey === 'SET' ? 'set' : 'not_set');
    }).catch(() => setApiKeyStatus('not_set'));
    
    db.getSettings().then(setSettings).catch(e => console.error("Failed to load settings", e));
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
        await db.saveSettings(settings);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
        alert("Failed to save settings. See console for details.");
        console.error(e);
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleTestConnection = async () => {
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
        return <span className="text-slate-400">Click to test your connection.</span>;
    }
  };

  const handleSettingChange = <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => {
    if (settings) {
        setSettings({ ...settings, [field]: value });
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">API Configuration</h2>
          {apiKeyStatus === 'loading' && <p className="text-slate-400">Checking API key status...</p>}
          {apiKeyStatus === 'not_set' && (
             <div className="bg-red-900/50 border border-red-500/50 p-4 rounded-lg">
                <p className="font-bold text-red-300">API Key Not Found</p>
                <p className="text-red-400 mt-1">
                    The Gemini API key is not configured on the server. Please add your key to the `.env` file and restart the container.
                </p>
            </div>
          )}
           {apiKeyStatus === 'set' && (
             <div className="bg-green-900/50 border border-green-500/50 p-4 rounded-lg">
                <p className="font-bold text-green-300">API Key Configured</p>
                <p className="text-green-400 mt-1">
                    An API key was found on the server. You can test the connection below.
                </p>
            </div>
          )}
          <div className="mt-4 flex items-center space-x-4">
            <Button onClick={handleTestConnection} disabled={apiKeyStatus !== 'set' || testStatus === 'testing'}>
              {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </Button>
            <div className="h-6">{getStatusIndicator()}</div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">Global AI Settings</h2>
           {!settings ? <p>Loading settings...</p> : (
            <>
            <p className="text-slate-400 mb-4">
              These instructions and settings are used by the AI in all generated posts.
            </p>
            <div className="space-y-4">
                <Textarea
                    label="General Instructions for AI"
                    id="ai-settings"
                    rows={4}
                    value={settings.generalInstructions}
                    onChange={(e) => handleSettingChange('generalInstructions', e.target.value)}
                    placeholder="e.g., 'Write in a friendly, conversational tone for tech beginners.'"
                />
                <div className="grid grid-cols-2 gap-4">
                     <Input
                        label="CTA Button Text"
                        id="cta-text"
                        value={settings.ctaText}
                        onChange={(e) => handleSettingChange('ctaText', e.target.value)}
                    />
                    <div>
                        <label htmlFor="tone-select" className="block text-sm font-medium text-slate-300 mb-1">Writing Tone</label>
                        <select
                            id="tone-select"
                            className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-indigo-500"
                            value={settings.tone}
                            onChange={(e) => handleSettingChange('tone', e.target.value as AppSettings['tone'])}
                        >
                            <option value="">Default</option>
                            <option value="friendly">Friendly</option>
                            <option value="professional">Professional</option>
                            <option value="humorous">Humorous</option>
                            <option value="technical">Technical</option>
                            <option value="casual">Casual</option>
                            <option value="witty">Witty</option>
                            <option value="authoritative">Authoritative</option>
                        </select>
                    </div>
                </div>
                 <Textarea
                    label="Affiliate Footer Text"
                    id="footer-text"
                    rows={2}
                    value={settings.footerText}
                    onChange={(e) => handleSettingChange('footerText', e.target.value)}
                />
            </div>
            <div className="mt-4 flex items-center justify-end space-x-3">
              {saveSuccess && <span className="text-green-400 text-sm">Saved!</span>}
              <Button onClick={handleSaveSettings} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
            </>
           )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
