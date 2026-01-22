'use client'

import { useState } from 'react'
import { PlayCircle, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { watchAPI } from '@/lib/api'

export default function WatchPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    videoUrl: '',
    tabs: 10,
    duration: 60,
    useAccounts: false,
    humanBehavior: true,
    randomDuration: true,
    autoSubscribe: false,
    autoComment: false,
    autoLike: false,
    batchSize: 3,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await watchAPI.watchBatch(formData)
      setResult(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start campaign')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Boost Views & Engagement</h1>
        <p className="text-gray-600 mt-2">Generate views, likes, comments, and subscribers</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Video URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              YouTube Video URL *
            </label>
            <input
              type="url"
              required
              value={formData.videoUrl}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Number of Views */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Views
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={formData.tabs}
                onChange={(e) => setFormData({ ...formData, tabs: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Watch Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Watch Duration (seconds)
              </label>
              <input
                type="number"
                min="30"
                max="600"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Batch Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Concurrent Tabs (Batch Size)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.batchSize}
                onChange={(e) => setFormData({ ...formData, batchSize: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Lower is safer (2-3 recommended)</p>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="useAccounts"
                checked={formData.useAccounts}
                onChange={(e) => setFormData({ ...formData, useAccounts: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="useAccounts" className="ml-2 text-sm text-gray-700">
                Use logged-in accounts (required for subscribe/like/comment)
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
                Enable human behavior simulation (scroll, pause, seek, etc.)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="randomDuration"
                checked={formData.randomDuration}
                onChange={(e) => setFormData({ ...formData, randomDuration: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="randomDuration" className="ml-2 text-sm text-gray-700">
                Random watch duration (30-180s)
              </label>
            </div>

            {formData.useAccounts && (
              <>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoSubscribe"
                    checked={formData.autoSubscribe}
                    onChange={(e) => setFormData({ ...formData, autoSubscribe: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="autoSubscribe" className="ml-2 text-sm text-gray-700">
                    Auto subscribe (25% conversion rate)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoLike"
                    checked={formData.autoLike}
                    onChange={(e) => setFormData({ ...formData, autoLike: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="autoLike" className="ml-2 text-sm text-gray-700">
                    Auto like video (15% conversion rate)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoComment"
                    checked={formData.autoComment}
                    onChange={(e) => setFormData({ ...formData, autoComment: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="autoComment" className="ml-2 text-sm text-gray-700">
                    Auto comment (5% conversion rate)
                  </label>
                </div>
              </>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Anti-Detection Tips:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Use residential proxies for better results (configure in Settings)</li>
                  <li>Lower batch size (2-3) is safer than higher (10)</li>
                  <li>Enable human behavior to avoid detection</li>
                  <li>Use aged accounts (3+ months) for subscribe/like/comment</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Starting Campaign...
              </>
            ) : (
              <>
                <PlayCircle className="w-5 h-5 mr-2" />
                Start Campaign
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800 mb-2">Campaign Started Successfully!</p>
              <div className="grid grid-cols-2 gap-4 text-sm text-green-700">
                <div>
                  <span className="font-medium">Total Views:</span> {result.summary?.total || 0}
                </div>
                <div>
                  <span className="font-medium">Successful:</span> {result.summary?.success || 0}
                </div>
                <div>
                  <span className="font-medium">Failed:</span> {result.summary?.failed || 0}
                </div>
                <div>
                  <span className="font-medium">Duration:</span> {result.summary?.duration || 0}s
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
