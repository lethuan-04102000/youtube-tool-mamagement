'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { buildApiUrl, API_ENDPOINTS } from '@/lib/constants';

interface Channel {
  id: number;
  email: string;
  channelName: string;
  channelLink: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function ListChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Pagination & Search
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [search, setSearch] = useState('');
  const [searchBy, setSearchBy] = useState<'all' | 'email' | 'channelName'>('all');
  const [searchInput, setSearchInput] = useState('');

  // Fetch channels on mount and when pagination/search changes
  useEffect(() => {
    fetchChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, search, searchBy]);

  const fetchChannels = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (search) {
        params.append('search', search);
        params.append('searchBy', searchBy);
      }

      const url = `${buildApiUrl(API_ENDPOINTS.ACCOUNTS.LIST)}?${params}`;
      console.log('Fetching channels from:', url);

      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Channels data:', data);
        setChannels(data.data || []);
        setPagination(data.pagination);
      } else {
        console.error('Failed to fetch channels:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kênh YouTube</h1>
          <p className="text-gray-600 mt-2">Danh sách tất cả kênh YouTube</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchChannels}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Stats Summary - Moved to top */}
      {!loading && pagination.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-gray-600 text-sm mb-1">Tổng số kênh</div>
            <div className="text-3xl font-bold text-gray-900">{pagination.total}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-gray-600 text-sm mb-1">Có tên kênh</div>
            <div className="text-3xl font-bold text-green-600">
              {channels.filter(c => c.channelName).length}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-gray-600 text-sm mb-1">Trang hiện tại</div>
            <div className="text-3xl font-bold text-blue-600">
              {pagination.page} / {pagination.totalPages}
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <form onSubmit={handleSearch} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tìm kiếm
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm kiếm kênh..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tìm theo
            </label>
            <select
              value={searchBy}
              onChange={(e) => setSearchBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả</option>
              <option value="email">Email</option>
              <option value="channelName">Tên kênh</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tìm kiếm
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSearchInput('');
              }}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Xóa
            </button>
          )}
        </form>
      </div>

      {/* Channels Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tên kênh</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Liên kết kênh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                    Đang tải kênh...
                  </td>
                </tr>
              ) : channels.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                    {search ? 'Không tìm thấy kênh nào phù hợp.' : 'Không tìm thấy kênh nào.'}
                  </td>
                </tr>
              ) : (
                channels.map((channel) => (
                  <tr key={channel.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">{channel.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{channel.channelName || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      {channel.channelLink ? (
                        <a
                          href={channel.channelLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Xem kênh
                          <ExternalLink size={14} />
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && channels.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Hiển thị {((pagination.page - 1) * pagination.limit) + 1} đến{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số{' '}
              {pagination.total} kênh
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm text-gray-700">
                Trang {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNext}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
