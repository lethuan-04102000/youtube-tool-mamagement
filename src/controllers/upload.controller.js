const youtubeUploadService = require('../services/youtube.upload.service');
const VideoDownloadService = require('../services/video.download.service');
const { AccountYoutube } = require('../models');

class UploadController {

  /**
   * POST /api/v1/upload/download
   * Tải video từ URL (TikTok, Facebook, etc.) qua taivideo.vn
   */
  async downloadVideo(req, res) {
    try {
      const { videoUrl, quality } = req.body;

      if (!videoUrl) {
        return res.status(400).json({
          success: false,
          message: 'videoUrl là bắt buộc'
        });
      }

      const videoDownloadService = new VideoDownloadService();
      const result = await videoDownloadService.downloadVideo(videoUrl, {
        quality: quality || 'best'
      });

      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json(result);

    } catch (error) {
      console.error('❌ Download controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * POST /api/v1/upload/youtube
   * Upload video từ file local lên YouTube
   */
  async uploadToYoutube(req, res) {
    try {
      const { id, email, videoPath, title, description, visibility, tags, scheduleDate } = req.body;

      if (!id && !email) {
        return res.status(400).json({
          success: false,
          message: 'Cần truyền id hoặc email của account'
        });
      }

      if (!videoPath) {
        return res.status(400).json({
          success: false,
          message: 'videoPath là bắt buộc'
        });
      }

      // Tìm account
      const where = id ? { id } : { email };
      const account = await AccountYoutube.findOne({ where });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy account trong database'
        });
      }

      const result = await youtubeUploadService.uploadVideo(
        account.email,
        videoPath,
        { title, description, visibility, tags, scheduleDate }
      );

      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json(result);

    } catch (error) {
      console.error('❌ Upload controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * POST /api/v1/upload/download-and-upload
   * Flow hoàn chỉnh: Tải video từ URL -> Upload lên YouTube
   */
  async downloadAndUpload(req, res) {
    try {
      const {
        id,
        email,
        sourceUrl,
        title,
        description,
        visibility,
        tags,
        scheduleDate
      } = req.body;

      if (!id && !email) {
        return res.status(400).json({
          success: false,
          message: 'Cần truyền id hoặc email của account'
        });
      }

      if (!sourceUrl) {
        return res.status(400).json({
          success: false,
          message: 'sourceUrl là bắt buộc (URL video TikTok, Facebook, etc.)'
        });
      }

      // Tìm account
      const where = id ? { id } : { email };
      const account = await AccountYoutube.findOne({ where });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy account trong database'
        });
      }

      const result = await youtubeUploadService.downloadAndUpload(
        account.email,
        sourceUrl,
        { title, description, visibility, tags, scheduleDate }
      );

      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json(result);

    } catch (error) {
      console.error('❌ Download and upload controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/upload/downloads
   * Lấy danh sách file đã download
   */
  async getDownloadedFiles(req, res) {
    try {
      const files = videoDownloadService.getDownloadedFiles();

      return res.status(200).json({
        success: true,
        message: `Tìm thấy ${files.length} files`,
        data: files
      });

    } catch (error) {
      console.error('❌ Get downloads error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = new UploadController();
