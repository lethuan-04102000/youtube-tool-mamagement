'use client';

import { useState } from 'react';
import { PlayCircle, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { buildApiUrl, API_ENDPOINTS } from '@/lib/constants';

export default function BoostViewsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    videoUrl: '',
    tabs: 15,
    batchSize: 5,
    duration: 60,
    useAccounts: true,
    autoSubscribe: true,
    humanBehavior: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.WATCH.BATCH), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to start boost campaign');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tăng lượt xem</h1>
        <p className="text-gray-600 mt-2">Tăng lượt xem và tương tác cho video YouTube của bạn</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Video URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL Video <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              required
              value={formData.videoUrl}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tabs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số lượng tab
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.tabs}
                onChange={(e) => setFormData({ ...formData, tabs: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Tổng số tab trình duyệt sẽ mở</p>
            </div>

            {/* Batch Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kích thước lô
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.batchSize}
                onChange={(e) => setFormData({ ...formData, batchSize: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Số tab mở cùng lúc</p>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thời lượng xem (giây)
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Thời gian xem video</p>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="useAccounts"
                checked={formData.useAccounts}
                onChange={(e) => setFormData({ ...formData, useAccounts: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="useAccounts" className="ml-2 text-sm text-gray-700">
                Sử dụng tài khoản đã import
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoSubscribe"
                checked={formData.autoSubscribe}
                onChange={(e) => setFormData({ ...formData, autoSubscribe: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="autoSubscribe" className="ml-2 text-sm text-gray-700">
                Tự động đăng ký kênh
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="humanBehavior"
                checked={formData.humanBehavior}
                onChange={(e) => setFormData({ ...formData, humanBehavior: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="humanBehavior" className="ml-2 text-sm text-gray-700">
                Bật hành vi giống người (Độ trễ ngẫu nhiên, di chuyển chuột)
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Đang khởi động chiến dịch...
              </>
            ) : (
              <>
                <PlayCircle size={20} />
                Bắt đầu chiến dịch tăng view
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-red-900">Lỗi</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-green-900">Chiến dịch đã khởi động thành công!</h3>
              <p className="text-sm text-green-700 mt-1">
                {result.message || 'Chiến dịch tăng view đang chạy'}
              </p>
            </div>
          </div>

          {/* Campaign Details */}
          {result.data && (
            <div className="bg-white rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-gray-900 mb-2">Chi tiết chiến dịch:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">ID chiến dịch:</div>
                <div className="font-mono text-gray-900">{result.data.campaignId}</div>
                
                <div className="text-gray-600">Tổng số tab:</div>
                <div className="text-gray-900">{formData.tabs}</div>
                
                <div className="text-gray-600">Kích thước lô:</div>
                <div className="text-gray-900">{formData.batchSize}</div>
                
                <div className="text-gray-600">Thời lượng:</div>
                <div className="text-gray-900">{formData.duration} giây</div>
                
                <div className="text-gray-600">Sử dụng tài khoản:</div>
                <div className="text-gray-900">{formData.useAccounts ? 'Có' : 'Không'}</div>
                
                <div className="text-gray-600">Tự động đăng ký:</div>
                <div className="text-gray-900">{formData.autoSubscribe ? 'Có' : 'Không'}</div>
                
                <div className="text-gray-600">Hành vi giống người:</div>
                <div className="text-gray-900">{formData.humanBehavior ? 'Đã bật' : 'Đã tắt'}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Cách hoạt động</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• Mở nhiều tab trình duyệt để xem video của bạn</li>
          <li>• Mô phỏng hành vi con người với độ trễ và tương tác ngẫu nhiên</li>
          <li>• Có thể tự động đăng ký kênh</li>
          <li>• Xử lý theo lô để tránh quá tải hệ thống</li>
          <li>• Mỗi lượt xem được tính là lượt xem YouTube thực</li>
        </ul>
      </div>
    </div>
  );
}
