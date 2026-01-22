'use client';

import { useState } from 'react';
import { Settings as SettingsIcon, Save, AlertCircle } from 'lucide-react';

interface SettingsState {
  apiUrl: string;
  maxConcurrent: number;
  defaultWatchTime: number;
  enableProxies: boolean;
  enableFingerprinting: boolean;
  headless: boolean;
  autoSave: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    maxConcurrent: 5,
    defaultWatchTime: 180,
    enableProxies: true,
    enableFingerprinting: true,
    headless: false,
    autoSave: true,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('app-settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Configure your automation preferences</p>
      </div>

      {/* API Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <SettingsIcon size={24} />
          API Configuration
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Backend API URL
            </label>
            <input
              type="text"
              value={settings.apiUrl}
              onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="http://localhost:3000"
            />
            <p className="text-xs text-gray-500 mt-1">
              The base URL for the backend API server
            </p>
          </div>
        </div>
      </div>

      {/* Automation Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Automation Settings</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Concurrent Browsers
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={settings.maxConcurrent}
              onChange={(e) => setSettings({ ...settings, maxConcurrent: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum number of browser instances to run simultaneously (recommended: 3-5)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Watch Time (seconds)
            </label>
            <input
              type="number"
              min="30"
              max="3600"
              value={settings.defaultWatchTime}
              onChange={(e) => setSettings({ ...settings, defaultWatchTime: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Default duration to watch videos (30-3600 seconds)
            </p>
          </div>
        </div>
      </div>

      {/* Anti-Detection Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Anti-Detection Features</h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <div>
              <div className="font-medium text-gray-900">Enable Proxy Rotation</div>
              <div className="text-sm text-gray-600">Use different proxies for each session</div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableProxies}
              onChange={(e) => setSettings({ ...settings, enableProxies: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <div>
              <div className="font-medium text-gray-900">Browser Fingerprinting</div>
              <div className="text-sm text-gray-600">Randomize browser fingerprints for each session</div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableFingerprinting}
              onChange={(e) => setSettings({ ...settings, enableFingerprinting: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <div>
              <div className="font-medium text-gray-900">Headless Mode</div>
              <div className="text-sm text-gray-600">Run browsers without visible UI (faster but less natural)</div>
            </div>
            <input
              type="checkbox"
              checked={settings.headless}
              onChange={(e) => setSettings({ ...settings, headless: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <strong>Warning:</strong> Disabling anti-detection features may increase the risk of account bans. 
            Always use proxies and fingerprinting when automating at scale.
          </div>
        </div>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">General</h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <div>
              <div className="font-medium text-gray-900">Auto-Save Settings</div>
              <div className="text-sm text-gray-600">Automatically save settings when changed</div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoSave}
              onChange={(e) => setSettings({ ...settings, autoSave: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        {saved && (
          <div className="flex items-center gap-2 px-4 py-2 text-green-600">
            <Save size={20} />
            Settings saved successfully!
          </div>
        )}
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Save size={20} />
          Save Settings
        </button>
      </div>
    </div>
  );
}
