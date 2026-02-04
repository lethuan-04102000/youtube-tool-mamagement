const youtubeUploadService = require('../services/youtube.upload.service');
const VideoDownloadService = require('../services/video.download.service');
const { AccountYoutube, UploadedVideo } = require('../models');
const { Op } = require('sequelize');

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
   * Hoặc: Upload file video từ client -> Upload lên YouTube
   * 
   * Hỗ trợ 2 cách:
   * 1. Truyền sourceUrl: Tải video từ URL (Facebook, TikTok, etc.)
   * 2. Truyền file qua multipart/form-data: Upload file trực tiếp
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

      // Kiểm tra có file upload không
      const uploadedFile = req.file;
      
      // Phải có ít nhất 1 trong 2: sourceUrl hoặc file
      if (!sourceUrl && !uploadedFile) {
        return res.status(400).json({
          success: false,
          message: 'Cần truyền sourceUrl (URL video) hoặc upload file video'
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

      let result;

      // Trường hợp 1: Upload file từ client
      if (uploadedFile) {
        console.log(`\n📤 Upload file từ client: ${uploadedFile.originalname}`);
        
        // Lấy tên file gốc làm title mặc định (bỏ đuôi .mp4, .mov, etc.)
        const defaultTitle = title || uploadedFile.originalname.replace(/\.[^/.]+$/, '');
        
        result = await youtubeUploadService.uploadVideo(
          account.email,
          uploadedFile.path,
          { 
            title: defaultTitle, 
            description, 
            visibility, 
            tags, 
            scheduleDate 
          }
        );

        // Xóa file đã upload sau khi hoàn tất (thành công hay thất bại)
        try {
          const fs = require('fs');
          if (fs.existsSync(uploadedFile.path)) {
            fs.unlinkSync(uploadedFile.path);
            console.log(`🗑️  Đã xóa file upload: ${uploadedFile.filename}`);
          }
        } catch (err) {
          console.error(`⚠️  Không thể xóa file upload: ${err.message}`);
        }

        // Lưu vào database nếu thành công
        if (result.success && result.data?.videoUrl) {
          await UploadedVideo.create({
            account_youtube_id: account.id,
            email: account.email,
            video_url: result.data.videoUrl,
            title: title || uploadedFile.originalname,
            source_url: 'uploaded-file'
          });
        }
      } 
      // Trường hợp 2: Tải từ URL
      else {
        result = await youtubeUploadService.downloadAndUpload(
          account.email,
          sourceUrl,
          { title, description, visibility, tags, scheduleDate }
        );
      }

      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json(result);

    } catch (error) {
      console.error('❌ Download and upload controller error:', error);
      
      // Xóa file nếu có lỗi
      if (req.file) {
        try {
          const fs = require('fs');
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (err) {
          console.error(`⚠️  Không thể xóa file: ${err.message}`);
        }
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * POST /api/v1/upload/batch-upload
   * Upload nhiều video cùng lúc (tối đa 4 videos)
   * Body: {
   *   id: number,
   *   videos: [{sourceUrl, title?, description?, visibility?, tags?, scheduleDate?}]
   * }
   */
  async batchUpload(req, res) {
    try {
      const { id, email, videos } = req.body;

      if (!id && !email) {
        return res.status(400).json({
          success: false,
          message: 'Cần truyền id hoặc email của account'
        });
      }

      if (!videos || !Array.isArray(videos) || videos.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cần truyền mảng videos (tối thiểu 1 video)'
        });
      }

      if (videos.length > 4) {
        return res.status(400).json({
          success: false,
          message: 'Tối đa 4 videos mỗi lần upload'
        });
      }

      // Validate each video has sourceUrl
      for (let i = 0; i < videos.length; i++) {
        if (!videos[i].sourceUrl) {
          return res.status(400).json({
            success: false,
            message: `Video ${i + 1}: sourceUrl là bắt buộc`
          });
        }
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

      console.log(`\n📤 Batch upload ${videos.length} videos cho account: ${account.email}`);

      const results = [];
      const errors = [];

      // Upload từng video tuần tự (để tránh quá tải)
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const videoNum = i + 1;

        console.log(`\n[${videoNum}/${videos.length}] Uploading: ${video.sourceUrl}`);

        try {
          const result = await youtubeUploadService.downloadAndUpload(
            account.email,
            video.sourceUrl,
            {
              title: video.title,
              description: video.description,
              visibility: video.visibility || 'public',
              tags: video.tags,
              scheduleDate: video.scheduleDate
            }
          );

          results.push({
            index: videoNum,
            sourceUrl: video.sourceUrl,
            success: result.success,
            message: result.message,
            videoUrl: result.data?.videoUrl,
            error: result.error
          });

          if (result.success) {
            console.log(`✅ [${videoNum}/${videos.length}] Upload thành công`);
          } else {
            console.log(`❌ [${videoNum}/${videos.length}] Upload thất bại: ${result.message}`);
            errors.push({
              index: videoNum,
              sourceUrl: video.sourceUrl,
              error: result.message
            });
          }

          // Delay giữa các video để tránh spam
          if (i < videos.length - 1) {
            console.log(`⏳ Waiting 3s before next video...`);
            await new Promise(r => setTimeout(r, 3000));
          }

        } catch (error) {
          console.error(`❌ [${videoNum}/${videos.length}] Error:`, error.message);
          results.push({
            index: videoNum,
            sourceUrl: video.sourceUrl,
            success: false,
            message: 'Upload failed',
            error: error.message
          });
          errors.push({
            index: videoNum,
            sourceUrl: video.sourceUrl,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      console.log(`\n📊 Batch upload completed: ${successCount}/${videos.length} success`);

      return res.json({
        success: successCount > 0,
        message: `Uploaded ${successCount}/${videos.length} videos successfully`,
        data: {
          total: videos.length,
          success: successCount,
          failed: failCount,
          results
        },
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      console.error('❌ Batch upload controller error:', error);
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

  /**
   * GET /api/v1/upload/videos
   * Lấy danh sách video đã upload lên YouTube
   * @query { page?: number, limit?: number, search?: string }
   */
  async getUploadedVideos(req, res) {
    try {
      const { page = 1, limit = 20, search = '' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Build where clause for search
      const whereClause = search
        ? {
            [Op.or]: [
              { email: { [Op.like]: `%${search}%` } },
              { title: { [Op.like]: `%${search}%` } },
              { video_url: { [Op.like]: `%${search}%` } },
              { source_url: { [Op.like]: `%${search}%` } }
            ]
          }
        : {};

      // Query with pagination
      const { count, rows } = await UploadedVideo.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: offset,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: AccountYoutube,
            as: 'account',
            attributes: ['id', 'email', 'channel_name', 'channel_link'],
            required: false
          }
        ]
      });

      return res.status(200).json({
        success: true,
        data: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / parseInt(limit))
        }
      });

    } catch (error) {
      console.error('❌ Get uploaded videos error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = new UploadController();
