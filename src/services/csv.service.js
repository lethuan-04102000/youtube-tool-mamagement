const fs = require('fs');

class CsvService {
  
  loadAccountsFromCSV(csvPath) {
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    const accounts = [];
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Parse header to detect columns
    const header = lines[0].toLowerCase();
    console.log(`📋 CSV Header: ${lines[0]}`);
    
    // Detect delimiter (tab or comma)
    const delimiter = header.includes('\t') ? '\t' : ',';
    console.log(`🔍 Delimiter: ${delimiter === '\t' ? 'TAB' : 'COMMA'}`);
    
    const headerParts = header.split(delimiter);
    const emailIndex = headerParts.findIndex(h => h.includes('email'));
    const passwordIndex = headerParts.findIndex(h => h.includes('password'));
    const channelNameIndex = headerParts.findIndex(h => h.includes('channel'));
    
    console.log(`📊 Column indices: email=${emailIndex}, password=${passwordIndex}, channel=${channelNameIndex}\n`);
    
    let totalCount = 0;
    let validCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(delimiter);
      
      if (parts.length >= 2) {
        const email = parts[emailIndex]?.trim();
        const password = parts[passwordIndex]?.trim();
        const channelName = channelNameIndex >= 0 ? parts[channelNameIndex]?.trim() : '';
        
        if (email && password) {
          totalCount++;
          validCount++;
          
          accounts.push({ 
            email, 
            password, 
            channel_name: channelName || '',
            authenticator: '' // Empty, will be filled after setup
          });
        }
      }
    }
    
    console.log(`📊 Tổng kết:`);
    console.log(`   📧 Tổng số records: ${totalCount}`);
    console.log(`   ✅ Hợp lệ: ${validCount}\n`);
    
    return accounts;
  }

  saveResults(results, filePath = 'results.json') {
    try {
      fs.writeFileSync(filePath, JSON.stringify(results, null, 2), 'utf-8');
      console.log(`💾 Đã lưu kết quả: ${filePath}`);
    } catch (error) {
      console.error('❌ Lỗi khi lưu kết quả:', error);
    }
  }

  // Save results back to CSV with authenticator codes
  saveResultsToCSV(results, filePath = 'accounts-updated.csv') {
    try {
      const header = 'Email,Password,Channel Name,Authenticator,Status\n';
      const rows = results.map(r => {
        return `${r.email},${r.password || ''},${r.channel_name || ''},${r.secretKey || ''},${r.success ? 'Success' : 'Failed'}`;
      }).join('\n');
      
      fs.writeFileSync(filePath, header + rows, 'utf-8');
      console.log(`💾 Đã lưu CSV cập nhật: ${filePath}`);
    } catch (error) {
      console.error('❌ Lỗi khi lưu CSV:', error);
    }
  }
}

module.exports = new CsvService();
