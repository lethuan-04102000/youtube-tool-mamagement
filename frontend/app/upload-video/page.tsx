'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, CheckCircle, XCircle, Loader2, Plus, Trash2, Search, ChevronDown } from 'lucide-react';
import { api, type Account, type BatchUploadVideoItem, type BatchUploadResult } from '@/lib/api';

interface VideoInput extends BatchUploadVideoItem {
  id: string;
  videoFile?: File;
}

export default function UploadVideoPage() {
  const [channels, setChannels] = useState<Account[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null);
  const [videos, setVideos] = useState<VideoInput[]>([
    { id: '1', sourceUrl: '', visibility: 'public' }
  ]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<BatchUploadResult[] | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const addVideoInput = () => {
    if (videos.length >= 4) return;
    const newId = (Math.max(...videos.map(v => parseInt(v.id))) + 1).toString();
    setVideos([...videos, { id: newId, sourceUrl: '', visibility: 'public' }]);
  };

  const removeVideoInput = (id: string) => {
    if (videos.length === 1) return;
    setVideos(videos.filter(v => v.id !== id));
  };

  const updateVideoInput = (id: string, field: keyof VideoInput, value: any) => {
    setVideos(videos.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedChannel) {
      alert('Vui lòng chọn kênh');
      return;
    }

    // Validate based on upload mode
    if (uploadMode === 'url') {
      const emptyVideos = videos.filter(v => !v.sourceUrl.trim());
      if (emptyVideos.length > 0) {
        alert('Vui lòng nhập link video cho tất cả các ô');
        return;
      }
    } else {
      const emptyFiles = videos.filter(v => !v.videoFile);
      if (emptyFiles.length > 0) {
        alert('Vui lòng chọn file video cho tất cả các ô');
        return;
      }
    }

    setUploading(true);
    setResults(null);

    try {
      if (uploadMode === 'url') {
        // Batch upload from URLs
        const response = await api.upload.batchUpload({
          id: selectedChannel,
          videos: videos.map(({ id, videoFile, ...rest }) => rest),
        });
        
        setResults(response.data?.results || []);

        if (response.success && response.data?.summary.success) {
          setVideos([{ id: '1', sourceUrl: '', visibility: 'public' }]);
        }
      } else {
        // Upload files one by one
        const results: BatchUploadResult[] = [];
        
        for (let i = 0; i < videos.length; i++) {
          const video = videos[i];
          try {
            const response = await api.upload.downloadAndUpload({
              id: selectedChannel,
              videoFile: video.videoFile,
              title: video.title,
              description: video.description,
              visibility: video.visibility,
              scheduleDate: video.scheduleDate,
            });
            
            results.push({
              index: i + 1,
              sourceUrl: video.videoFile?.name || 'file-upload',
              success: response.success,
              message: response.message,
              videoUrl: response.data?.videoUrl,
              error: response.error,
            });
          } catch (error: any) {
            results.push({
              index: i + 1,
              sourceUrl: video.videoFile?.name || 'file-upload',
              success: false,
              message: 'Upload failed',
              error: error.message,
            });
          }
          
          // Delay between uploads
          if (i < videos.length - 1) {
            await new Promise(r => setTimeout(r, 2000));
          }
        }
        
        setResults(results);
        
        // Reset on success
        if (results.some(r => r.success)) {
          setVideos([{ id: '1', sourceUrl: '', visibility: 'public' }]);
        }
      }
    } catch (error: any) {
      alert(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 2);
    return now.toISOString().slice(0, 16);
  };

  const filteredChannels = channels.filter(channel => {
    const query = searchQuery.toLowerCase();
    const channelName = (channel.channelName || '').toLowerCase();
    const email = (channel.email || '').toLowerCase();
    return channelName.includes(query) || email.includes(query);
  });

  const selectedChannelData = channels.find(c => c.id === selectedChannel);

  const successCount = results?.filter(r => r.success).length || 0;
  const totalCount = results?.length || 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Upload Video</h1>
        <p className="text-sm text-gray-600 mt-1">
          Download và upload video lên YouTube (tối đa 4 videos cùng lúc)
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Upload Mode Tabs */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nguồn Video
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                console.log('Switching to URL mode');
                setUploadMode('url');
                setVideos([{ id: '1', sourceUrl: '', visibility: 'public' }]);
                setResults(null);
              }}
              className={`px-4 py-3 rounded-md border text-sm font-medium transition-colors ${
                uploadMode === 'url'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              🔗 Từ URL
            </button>
            <button
              type="button"
              onClick={() => {
                console.log('Switching to File mode');
                setUploadMode('file');
                setVideos([{ id: '1', sourceUrl: '', visibility: 'public' }]);
                setResults(null);
              }}
              className={`px-4 py-3 rounded-md border text-sm font-medium transition-colors ${
                uploadMode === 'file'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              📁 Từ File
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              <div className="relative" ref={dropdownRef}>
                {/* Custom Dropdown Button */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-left flex items-center justify-between hover:bg-gray-50"
                >
                  {selectedChannelData ? (
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {selectedChannelData.channelName || 'Chưa có tên kênh'}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {selectedChannelData.email}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-500">-- Chọn kênh --</span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-400 ml-2 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Tìm kênh hoặc email..."
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    {/* Channel List */}
                    <div className="max-h-60 overflow-y-auto">
                      {filteredChannels.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">
                          Không tìm thấy kênh nào
                        </div>
                      ) : (
                        filteredChannels.map((channel) => (
                          <button
                            key={channel.id}
                            type="button"
                            onClick={() => {
                              setSelectedChannel(channel.id);
                              setIsDropdownOpen(false);
                              setSearchQuery('');
                            }}
                            className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                              selectedChannel === channel.id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm truncate">
                                  {channel.channelName || 'Chưa có tên kênh'}
                                </div>
                                <div className="text-xs text-gray-500 truncate mt-0.5">
                                  {channel.email}
                                </div>
                              </div>
                              {selectedChannel === channel.id && (
                                <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Video Inputs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Danh sách video ({videos.length}/4)
              </label>
              {videos.length < 4 && (
                <button
                  type="button"
                  onClick={addVideoInput}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
                >
                  Thêm video
                </button>
              )}
            </div>

            {videos.map((video, index) => (
              <div key={`${uploadMode}-${video.id}`} className="border-2 border-gray-300 rounded-lg p-5 space-y-4 bg-white shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                      {index + 1}
                    </span>
                    Video {index + 1}
                  </span>
                  {videos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVideoInput(video.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa
                    </button>
                  )}
                </div>

                {/* Source URL or File */}
                {uploadMode === 'url' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Link Video *
                    </label>
                    <input
                      type="url"
                      value={video.sourceUrl}
                      onChange={(e) => updateVideoInput(video.id, 'sourceUrl', e.target.value)}
                      placeholder="https://www.facebook.com/reel/..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Facebook, TikTok, Instagram, Google Drive, etc.</p>
                  </div>
                )}

                {uploadMode === 'file' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Chọn File Video *
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          console.log('File selected:', file?.name, file?.size);
                          if (file) {
                            // Update both videoFile and title in one state update
                            setVideos(videos.map(v => {
                              if (v.id === video.id) {
                                return {
                                  ...v,
                                  videoFile: file,
                                  title: v.title || file.name.replace(/\.[^/.]+$/, '')
                                };
                              }
                              return v;
                            }));
                          }
                        }}
                        className="hidden"
                        id={`file-input-${video.id}`}
                      />
                      <label
                        htmlFor={`file-input-${video.id}`}
                        className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-blue-400 transition-colors bg-white"
                      >
                        <div className="text-center">
                          {video.videoFile ? (
                            <>
                              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                              <p className="text-sm text-gray-700 font-medium">{video.videoFile.name}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {(video.videoFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                              <p className="text-xs text-blue-600 mt-2">Click để chọn file khác</p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">Click để chọn file</p>
                              <p className="text-xs text-gray-500 mt-1">MP4, MOV, AVI, etc.</p>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Title (Optional) */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Tiêu đề (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={video.title || ''}
                    onChange={(e) => updateVideoInput(video.id, 'title', e.target.value)}
                    placeholder="Tự động lấy từ video nguồn"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                  />
                </div>

                {/* Description (Optional) */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Mô tả (tùy chọn)
                  </label>
                  <textarea
                    value={video.description || ''}
                    onChange={(e) => updateVideoInput(video.id, 'description', e.target.value)}
                    placeholder="Mô tả video..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white resize-none"
                  />
                </div>

                {/* Visibility */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Hiển thị
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['public', 'unlisted', 'private'] as const).map((vis) => (
                      <button
                        key={vis}
                        type="button"
                        onClick={() => updateVideoInput(video.id, 'visibility', vis)}
                        className={`px-2 py-2 rounded-md border text-xs font-medium transition-colors ${
                          video.visibility === vis
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Lên lịch (tùy chọn)
                  </label>
                  <input
                    type="datetime-local"
                    value={video.scheduleDate || ''}
                    onChange={(e) => updateVideoInput(video.id, 'scheduleDate', e.target.value)}
                    min={getMinDateTime()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Để trống để đăng ngay. Tối thiểu 2 giờ sau hiện tại.
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading || !selectedChannel}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-sm shadow-sm"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Đang upload {videos.length} video...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload {videos.length} Video{videos.length > 1 ? 's' : ''}
              </>
            )}
          </button>
        </form>

        {/* Results */}
        {results && results.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">
                Kết quả Upload
              </h3>
              <span className={`text-xs font-medium px-2 py-1 rounded ${
                successCount === totalCount 
                  ? 'bg-green-100 text-green-700' 
                  : successCount > 0 
                  ? 'bg-yellow-100 text-yellow-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {successCount}/{totalCount} thành công
              </span>
            </div>

            {results.map((result) => (
              <div
                key={result.index}
                className={`p-3 rounded-md border ${
                  result.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  {result.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${
                        result.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        Video {result.index}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-600 truncate">
                        {result.sourceUrl}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${
                      result.success ? 'text-green-700' : 'text-red-700'
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
                    {result.error && !result.success && (
                      <p className="text-xs text-red-600 mt-1 font-mono">
                        Lỗi: {result.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
