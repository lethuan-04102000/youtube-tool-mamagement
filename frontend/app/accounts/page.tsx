'use client';

import { useState } from 'react';
import { Upload, Plus, Trash2, RefreshCw, Download, Shield } from 'lucide-react';

interface Account {
  email: string;
  status: 'active' | 'inactive' | '2fa-required';
  lastUsed?: string;
  videosWatched: number;
  commentsPosted: number;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:3000/api/accounts/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh accounts list
        fetchAccounts();
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  };

  const exportAccounts = () => {
    const csv = [
      'Email,Status,Last Used,Videos Watched,Comments Posted',
      ...accounts.map(acc => 
        `${acc.email},${acc.status},${acc.lastUsed || 'Never'},${acc.videosWatched},${acc.commentsPosted}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounts-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Account Management</h1>
          <p className="text-gray-600 mt-2">Manage your YouTube accounts for automation</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportAccounts}
            disabled={accounts.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download size={20} />
            Export CSV
          </button>
          <button
            onClick={fetchAccounts}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw size={20} />
            Refresh
          </button>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Upload size={24} />
          Upload Accounts
        </h2>
        <p className="text-gray-600 mb-4">
          Upload a CSV file with columns: email, password, recoveryEmail (optional)
        </p>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
            <Upload size={20} />
            {uploading ? 'Uploading...' : 'Choose File'}
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <a
            href="/templates/accounts-template.csv"
            download
            className="text-blue-600 hover:underline"
          >
            Download Template
          </a>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Last Used</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Videos Watched</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Comments</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No accounts found. Upload a CSV file to get started.
                  </td>
                </tr>
              ) : (
                accounts.map((account, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">{account.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          account.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : account.status === '2fa-required'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {account.status === '2fa-required' && <Shield size={12} />}
                        {account.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {account.lastUsed || 'Never'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{account.videosWatched}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{account.commentsPosted}</td>
                    <td className="px-6 py-4">
                      <button className="text-red-600 hover:text-red-800 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Summary */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-gray-600 text-sm mb-1">Total Accounts</div>
            <div className="text-3xl font-bold text-gray-900">{accounts.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-gray-600 text-sm mb-1">Active</div>
            <div className="text-3xl font-bold text-green-600">
              {accounts.filter(a => a.status === 'active').length}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-gray-600 text-sm mb-1">2FA Required</div>
            <div className="text-3xl font-bold text-yellow-600">
              {accounts.filter(a => a.status === '2fa-required').length}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-gray-600 text-sm mb-1">Inactive</div>
            <div className="text-3xl font-bold text-gray-600">
              {accounts.filter(a => a.status === 'inactive').length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
