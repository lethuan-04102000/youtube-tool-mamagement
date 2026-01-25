'use client';

import { useState } from 'react';
import { Upload, Video, CheckCircle, XCircle } from 'lucide-react';

export default function UploadVideoPage() {
  const [uploading, setUploading] = useState(false);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Video</h1>
        <p className="text-gray-600 mt-2">Upload videos to YouTube channels</p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
        <div className="flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <Video className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Upload Video Feature</h2>
          <p className="text-gray-600 text-center mb-6">
            This feature will allow you to upload videos to your YouTube channels
          </p>
          <div className="w-full max-w-md p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">Coming Soon</p>
            <p className="text-sm text-gray-500">
              Video upload functionality will be available in the next update
            </p>
          </div>
        </div>
      </div>

      {/* Features List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start">
            <CheckCircle className="w-6 h-6 text-green-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Bulk Upload</h3>
              <p className="text-sm text-gray-600">
                Upload multiple videos to multiple channels at once
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start">
            <CheckCircle className="w-6 h-6 text-green-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Schedule Uploads</h3>
              <p className="text-sm text-gray-600">
                Schedule video uploads for specific dates and times
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start">
            <CheckCircle className="w-6 h-6 text-green-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Auto Metadata</h3>
              <p className="text-sm text-gray-600">
                Automatically set title, description, and tags
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start">
            <CheckCircle className="w-6 h-6 text-green-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Progress Tracking</h3>
              <p className="text-sm text-gray-600">
                Monitor upload progress and status for each video
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
