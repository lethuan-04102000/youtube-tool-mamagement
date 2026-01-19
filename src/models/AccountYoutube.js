const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AccountYoutube = sequelize.define('AccountYoutube', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  index_avatar: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'index of avatar in the folder_avatar'
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  code_authenticators: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '2FA/Authenticator code'
  },
  channel_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  channel_link: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  is_authenticator: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
    comment: 'Whether 2FA is enabled'
  },
  is_create_channel: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
    comment: 'Whether YouTube channel has been created'
  },
  is_upload_avatar: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
    comment: 'Whether avatar has been uploaded'
  },
  folder_avatar: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Avatar folder name used for this account'
  },
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'account_youtubes',
  timestamps: true
});

module.exports = AccountYoutube;
