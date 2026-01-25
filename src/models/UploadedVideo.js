const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UploadedVideo = sequelize.define('UploadedVideo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  account_youtube_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  video_url: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'YouTube video URL after upload'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true
  },
  source_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Original video URL (Facebook, TikTok, etc.)'
  }
}, {
  tableName: 'uploaded_videos',
  timestamps: true
});

module.exports = UploadedVideo;
