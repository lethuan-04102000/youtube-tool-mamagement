const express = require('express');
const router = express.Router();
const uploadController = require('../../controllers/upload.controller');

/**
 * @route POST /api/v1/upload/download
 * @desc Tải video từ URL qua taivideo.vn
 * @body { videoUrl: string, quality?: 'best' | 'hd' | 'sd' }
 */
router.post('/download', uploadController.downloadVideo);

/**
 * @route POST /api/v1/upload/youtube
 * @desc Upload video từ file local lên YouTube
 * @body { id?: number, email?: string, videoPath: string, title?: string, description?: string, visibility?: 'public' | 'unlisted' | 'private', tags?: string[], scheduleDate?: string (ISO format: '2024-01-15T10:00:00') }
 */
router.post('/youtube', uploadController.uploadToYoutube);

/**
 * @route POST /api/v1/upload/download-and-upload
 * @desc Flow hoàn chỉnh: Download từ URL -> Upload lên YouTube
 * @body { id?: number, email?: string, sourceUrl: string, title?: string, description?: string, visibility?: 'public' | 'unlisted' | 'private', tags?: string[], scheduleDate?: string (ISO format: '2024-01-15T10:00:00') }
 */
router.post('/download-and-upload', uploadController.downloadAndUpload);

/**
 * @route GET /api/v1/upload/downloads
 * @desc Lấy danh sách file đã download
 */
router.get('/downloads', uploadController.getDownloadedFiles);

module.exports = router;
