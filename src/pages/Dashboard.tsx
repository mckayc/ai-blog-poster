import React, { useState, useEffect, useCallback } from 'react';
import * as db from '/src/services/dbService';
import { testApiKey } from '/src/services/geminiService';
import { AppSettings } from '/src/types';
import Card from '/src/components/common/Card';
import Textarea from '/src/components/common/Textarea';
import Button from '/src/components/common/Button';
import Input from '/src/components/common/Input';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const defaultSettings: AppSettings = {
    generalInstructions: '',
    tone: '',
    ctaText: 'Check Price',
    footerText: 'As an affiliate, I earn from qualifying purchases. This does not affect the price you pay.'
};

const Dashboard: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [apiKeyIsSet, setApiKeyIsSet] = useState(false);

  const checkApiKeyStatus = useCallback(async () => {
    try {
        const status = await db.getApiKeyStatus();
        setApiKeyIsSet(!!status.apiKey);
        if (!status.apiKey) {
            setTestStatus('idle');
        }
    } catch (e) {
        console.error(e);
        setApiKeyIsSet(false);
    }
  }, []);


  useEffect(() => {
    checkApiKeyStatus();
    db.getSettings()
      .then(s => setSettings(s || defaultSettings))
      .catch(console.error);
  }, [checkApiKeyStatus]);
  
  const handleSettingsChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings(prev => ({...prev, [key]: value}));
  }

  const handleSaveSettings = async () => {
    try {
        await db.saveSettings(settings);
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 3000);
    } catch (e) {
        console.error(e);
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
            return <span className="text-green-400">API Key is configured on server.</span>;
         }
        return <span className="text-slate-400">API Key not set on server.</span>;
    }
  };


  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Dashboard & Settings</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">API Configuration</h2>
          <p className="text-slate-400 mb-4">
            Your Gemini API Key must be set in the <code className="bg-slate-700 text-sm p-1 rounded">.env</code> file on the server. The application reads the key from the server environment for security.
          </p>
          <div className="space-y-4 mt-6">
             <div className="flex items-center space-x-4">
                <Button onClick={handleTestApiKey} disabled={!apiKeyIsSet || testStatus === 'testing'}>
                  {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                </Button>
                <div className="h-6 flex items-center">{getStatusIndicator()}</div>
              </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">Global AI Settings</h2>
           <div className="space-y-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                  <label htmlFor="tone-select" className="block text-sm font-medium text-slate-300 mb-1">
                    Tone of Voice
                  </label>
                  <select
                      id="tone-select"
                      className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 pl-3 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={settings.tone}
                      onChange={e => handleSettingsChange('tone', e.target.value as AppSettings['tone'])}
                  >
                      <option value="">Select a Tone (Optional)</option>
                      <option value="friendly">Friendly & Conversational</option>
                      <option value="professional">Professional & Formal</option>
                      <option value="humorous">Humorous & Witty</option>
                      <option value="technical">Technical & In-Depth</option>
                      <option value="casual">Casual & Relaxed</option>
                      <option value="witty">Witty & Clever</option>
                      <option value="authoritative">Authoritative & Confident</option>
                  </select>
               </div>
                <Input
                    label="Affiliate Link CTA Text"
                    id="cta-text"
                    value={settings.ctaText}
                    onChange={(e) => handleSettingsChange('ctaText', e.target.value)}
                    placeholder="e.g., Check Price"
                />
             </div>
             <Textarea
                label="General Instructions for AI"
                id="ai-settings"
                rows={5}
                value={settings.generalInstructions}
                onChange={(e) => handleSettingsChange('generalInstructions', e.target.value)}
                placeholder="e.g., 'Always include a pros and cons section for each product. The target audience is tech beginners.'"
              />
              <Textarea
                label="Standard Post Footer"
                id="footer-text"
                rows={3}
                value={settings.footerText}
                onChange={(e) => handleSettingsChange('footerText', e.target.value)}
                placeholder="e.g., Affiliate link disclosures or a standard closing."
              />
          </div>
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