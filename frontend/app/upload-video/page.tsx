'use client';

import { useState, useEffect } from 'react';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api, type Account, type UploadVideoRequest } from '@/lib/api';

interface UploadResult {
  success: boolean;
  message: string;
  videoUrl?: string;
}

export default function UploadVideoPage() {
  const [channels, setChannels] = useState<Account[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [scheduleDate, setScheduleDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(true);

  // Load channels on mount
  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      setLoadingChannels(true);
      const response = await api.accounts.getAccounts({ limit: 1000 });
      setChannels(response.data);
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedChannel || !sourceUrl) {
      setResult({
        success: false,
        message: 'Vui lòng chọn kênh và nhập link video'
      });
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const uploadData: UploadVideoRequest = {
        id: selectedChannel,
        sourceUrl,
        visibility,
        scheduleDate: scheduleDate || undefined,
      };

      const response = await api.upload.downloadAndUpload(uploadData);
      
      setResult({
        success: response.success,
        message: response.message,
        videoUrl: response.data?.videoUrl,
      });

      // Reset form on success
      if (response.success) {
        setSourceUrl('');
        setScheduleDate('');
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Upload failed'
      });
    } finally {
      setUploading(false);
    }
  };

  const getMinDateTime = () => {
    // Minimum 2 hours from now
    const now = new Date();
    now.setHours(now.getHours() + 2);
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Upload Video</h1>
        <p className="text-sm text-gray-600 mt-1">Download và upload video lên YouTube</p>
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Channel Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Kênh YouTube
            </label>
            {loadingChannels ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            ) : (
              <select
                value={selectedChannel || ''}
                onChange={(e) => setSelectedChannel(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              >
                <option value="">-- Chọn kênh --</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.channelName || channel.email}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Source Video URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Link Video
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://www.facebook.com/reel/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Facebook, TikTok, Instagram, etc.</p>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Hiển thị
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['public', 'unlisted', 'private'] as const).map((vis) => (
                <button
                  key={vis}
                  type="button"
                  onClick={() => setVisibility(vis)}
                  className={`px-3 py-2 rounded-md border text-xs font-medium transition-colors ${
                    visibility === vis
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {vis === 'public' && '🌍 Public'}
                  {vis === 'unlisted' && '🔗 Unlisted'}
                  {vis === 'private' && '🔒 Private'}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Date (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Lên lịch (tùy chọn)
            </label>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              min={getMinDateTime()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Để trống để đăng ngay. Tối thiểu 2 giờ sau hiện tại.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading || !selectedChannel || !sourceUrl}
            className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-sm"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Video
              </>
            )}
          </button>
        </form>

        {/* Result */}
        {result && (
          <div className={`mt-4 p-3 rounded-md ${
            result.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start">
              {result.success ? (
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={`text-xs font-medium ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {result.message}
                </p>
                {result.videoUrl && (
                  <a
                    href={result.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                  >
                    Xem video →
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
