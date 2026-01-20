const speakeasy = require('speakeasy');

class AuthenticatorPlaywrightService {
  
  /**
   * Generate TOTP code from secret
   */
  generateCode(secret) {
    try {
      const token = speakeasy.totp({
        secret: secret,
        encoding: 'base32'
      });
      
      return token;
    } catch (error) {
      console.error('Error generating TOTP code:', error);
      throw error;
    }
  }

  /**
   * Verify TOTP code
   */
  verifyCode(secret, token) {
    try {
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2
      });
      
      return verified;
    } catch (error) {
      console.error('Error verifying TOTP code:', error);
      return false;
    }
  }
}

module.exports = new AuthenticatorPlaywrightService();
