'use client';

import { useState, useEffect } from 'react';
import { Clock, Eye, Users, MessageSquare, ThumbsUp, Filter } from 'lucide-react';

interface Campaign {
  id: string;
  videoUrl: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'failed';
  accountsUsed: number;
  anonymousViews: number;
  totalViews: number;
  comments: number;
  likes: number;
  watchTimeSeconds: number;
  errors?: string[];
}

export default function HistoryPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState<'all' | 'running' | 'completed' | 'failed'>('all');

  useEffect(() => {
    fetchCampaigns();
    const interval = setInterval(fetchCampaigns, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/campaigns/history');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || mockCampaigns);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      setCampaigns(mockCampaigns);
    }
  };

  const filteredCampaigns = campaigns.filter(c => 
    filter === 'all' || c.status === filter
  );

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaign History</h1>
          <p className="text-gray-600 mt-2">View all past and current campaigns</p>
        </div>
        <div className="flex items-center gap-3">
          <Filter size={20} className="text-gray-600" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Campaigns</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-gray-600 text-sm mb-1">Total Campaigns</div>
          <div className="text-3xl font-bold text-gray-900">{campaigns.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-gray-600 text-sm mb-1">Running</div>
          <div className="text-3xl font-bold text-blue-600">
            {campaigns.filter(c => c.status === 'running').length}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-gray-600 text-sm mb-1">Total Views</div>
          <div className="text-3xl font-bold text-green-600">
            {campaigns.reduce((sum, c) => sum + c.totalViews, 0)}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-gray-600 text-sm mb-1">Total Watch Time</div>
          <div className="text-3xl font-bold text-purple-600">
            {formatDuration(campaigns.reduce((sum, c) => sum + c.watchTimeSeconds, 0))}
          </div>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {filteredCampaigns.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
            No campaigns found. Start a new campaign from the Watch page.
          </div>
        ) : (
          filteredCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">Campaign #{campaign.id}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
                  </div>
                  <a
                    href={campaign.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {campaign.videoUrl}
                  </a>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    Started: {new Date(campaign.startTime).toLocaleString()}
                  </div>
                  {campaign.endTime && (
                    <div className="mt-1">
                      Ended: {new Date(campaign.endTime).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-600">Accounts</div>
                    <div className="font-semibold text-gray-900">{campaign.accountsUsed}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Eye size={18} className="text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-600">Anonymous</div>
                    <div className="font-semibold text-gray-900">{campaign.anonymousViews}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Eye size={18} className="text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-600">Total Views</div>
                    <div className="font-semibold text-gray-900">{campaign.totalViews}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} className="text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-600">Comments</div>
                    <div className="font-semibold text-gray-900">{campaign.comments}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ThumbsUp size={18} className="text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-600">Likes</div>
                    <div className="font-semibold text-gray-900">{campaign.likes}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-600">Watch Time</div>
                    <div className="font-semibold text-gray-900">
                      {formatDuration(campaign.watchTimeSeconds)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {campaign.errors && campaign.errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm font-semibold text-red-800 mb-2">Errors:</div>
                  <ul className="text-sm text-red-700 space-y-1">
                    {campaign.errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Progress Bar for running campaigns */}
              {campaign.status === 'running' && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full animate-pulse"
                      style={{
                        width: `${(campaign.totalViews / (campaign.accountsUsed + campaign.anonymousViews)) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Mock data for development
const mockCampaigns: Campaign[] = [
  {
    id: '1',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: new Date(Date.now() - 1800000).toISOString(),
    status: 'completed',
    accountsUsed: 5,
    anonymousViews: 10,
    totalViews: 15,
    comments: 8,
    likes: 12,
    watchTimeSeconds: 7200,
  },
  {
    id: '2',
    videoUrl: 'https://www.youtube.com/watch?v=example',
    startTime: new Date(Date.now() - 600000).toISOString(),
    status: 'running',
    accountsUsed: 3,
    anonymousViews: 5,
    totalViews: 8,
    comments: 4,
    likes: 6,
    watchTimeSeconds: 2400,
  },
];
