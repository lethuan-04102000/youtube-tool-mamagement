const sequelize = require('../config/database');
const AccountYoutube = require('./AccountYoutube');
const UploadedVideo = require('./UploadedVideo');

// Associations
AccountYoutube.hasMany(UploadedVideo, { foreignKey: 'account_youtube_id' });
UploadedVideo.belongsTo(AccountYoutube, { foreignKey: 'account_youtube_id' });

module.exports = {
  sequelize,
  AccountYoutube,
  UploadedVideo
};
