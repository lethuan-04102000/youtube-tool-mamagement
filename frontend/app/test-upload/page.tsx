'use client';

import { useState } from 'react';

export default function TestUploadPage() {
  const [mode, setMode] = useState<'url' | 'file'>('url');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Test Upload Mode Switching</h1>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => {
            console.log('Switching to URL');
            setMode('url');
          }}
          className={`px-4 py-2 rounded ${mode === 'url' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          URL Mode
        </button>
        <button
          onClick={() => {
            console.log('Switching to FILE');
            setMode('file');
          }}
          className={`px-4 py-2 rounded ${mode === 'file' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          File Mode
        </button>
      </div>

      <div className="p-4 border rounded">
        <p className="font-bold mb-2">Current Mode: {mode}</p>
        {mode === 'url' ? (
          <div>
            <p className="text-green-600">✅ URL Mode Active</p>
            <input type="text" placeholder="Enter URL" className="border p-2 w-full mt-2" />
          </div>
        ) : (
          <div>
            <p className="text-blue-600">✅ FILE Mode Active</p>
            <input type="file" className="border p-2 w-full mt-2" />
          </div>
        )}
      </div>
    </div>
  );
}
