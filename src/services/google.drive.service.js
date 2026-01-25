const browserService = require('./browser.service');
const path = require('path');
const fs = require('fs');

class GoogleDriveService {

    /**
     * Kiểm tra xem URL có phải Google Drive không
     */
    isGoogleDriveUrl(url) {
        return url.includes('drive.google.com') || url.includes('docs.google.com');
    }

    /**
     * Tải video từ Google Drive
     * @param {string} driveUrl - URL Google Drive
     * @param {string} downloadPath - Thư mục lưu file
     * @returns {Promise<object>} - Kết quả download
     */
    async downloadFromDrive(driveUrl, downloadPath) {
        let browser = null;
        let page = null;

        try {
            console.log(`\n📥 Tải video từ Google Drive`);
            console.log(`   URL: ${driveUrl}`);

            // Tạo thư mục nếu chưa tồn tại
            if (!fs.existsSync(downloadPath)) {
                fs.mkdirSync(downloadPath, { recursive: true });
            }

            browser = await browserService.launchBrowser(false);
            page = await browserService.createPage(browser);

            // Cấu hình download behavior
            const client = await page.target().createCDPSession();
            await client.send('Browser.setDownloadBehavior', {
                behavior: 'allow',
                downloadPath: downloadPath,
                eventsEnabled: true
            });

            // Lấy file ID từ URL
            const fileId = this.extractFileId(driveUrl);
            if (!fileId) {
                throw new Error('Không thể trích xuất File ID từ URL Google Drive');
            }
            console.log(`   File ID: ${fileId}`);

            // Truy cập trang preview để lấy tên file
            const previewUrl = `https://drive.google.com/file/d/${fileId}/view`;
            await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await new Promise(r => setTimeout(r, 3000));

            // Lấy tên file từ trang preview
            const fileName = await this.extractFileName(page, fileId);
            console.log(`   Tên file: ${fileName}`);

            // Click nút download trên trang preview
            console.log('   Đang tìm nút download...');

            let downloadStarted = false;

            // Cách 1: Click nút download trực tiếp
            downloadStarted = await page.evaluate(() => {
                const downloadBtn = document.querySelector('[aria-label="Download"]') ||
                    document.querySelector('[data-tooltip="Download"]') ||
                    document.querySelector('div[aria-label*="ownload"]');

                if (downloadBtn) {
                    downloadBtn.click();
                    return true;
                }
                return false;
            });

            if (!downloadStarted) {
                // Cách 2: Mở menu và tìm download
                console.log('   Thử mở menu...');
                await page.evaluate(() => {
                    const menuBtn = document.querySelector('[aria-label="More actions"]') ||
                        document.querySelector('[data-tooltip="More actions"]');
                    if (menuBtn) menuBtn.click();
                });

                await new Promise(r => setTimeout(r, 1000));

                downloadStarted = await page.evaluate(() => {
                    const items = document.querySelectorAll('[role="menuitem"], [role="option"]');
                    for (const item of items) {
                        if (item.textContent.toLowerCase().includes('download')) {
                            item.click();
                            return true;
                        }
                    }
                    return false;
                });
            }

            if (!downloadStarted) {
                // Cách 3: Truy cập trực tiếp URL download
                console.log('   Thử download trực tiếp...');
                const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
                await page.goto(directUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await new Promise(r => setTimeout(r, 2000));
            }

            // Kiểm tra nếu có trang xác nhận "Download anyway" (file lớn)
            console.log('   Kiểm tra trang xác nhận file lớn...');
            const hasConfirmPage = await page.evaluate(() => {
                const pageText = document.body.innerText;
                return pageText.includes("can't scan this file") ||
                       pageText.includes('Download anyway') ||
                       pageText.includes('too large');
            });

            if (hasConfirmPage) {
                console.log('   File lớn - đang click "Download anyway"...');

                // Tìm và click nút "Download anyway"
                const downloadClicked = await page.evaluate(() => {
                    // Tìm nút bằng nhiều cách
                    const buttons = document.querySelectorAll('a, button, form');
                    for (const btn of buttons) {
                        const text = btn.textContent || btn.innerText || '';
                        if (text.toLowerCase().includes('download anyway')) {
                            btn.click();
                            return true;
                        }
                    }

                    // Tìm form submit
                    const form = document.querySelector('form[action*="download"]');
                    if (form) {
                        form.submit();
                        return true;
                    }

                    // Tìm link có chứa confirm
                    const confirmLink = document.querySelector('a[href*="confirm="]') ||
                                       document.querySelector('a[href*="download"]');
                    if (confirmLink) {
                        confirmLink.click();
                        return true;
                    }

                    return false;
                });

                if (!downloadClicked) {
                    // Fallback: tìm link trong href và navigate
                    const confirmUrl = await page.evaluate(() => {
                        const link = document.querySelector('a[href*="confirm="]') ||
                                    document.querySelector('a[href*="export=download"]');
                        return link ? link.href : null;
                    });

                    if (confirmUrl) {
                        console.log('   Đang download từ confirm URL...');
                        await page.goto(confirmUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
                    }
                }

                await new Promise(r => setTimeout(r, 3000));
            }

            console.log('   Đang tải file...');

            // Đợi file download hoàn tất
            const downloadedFile = await this.waitForDownload(downloadPath);

            if (!downloadedFile) {
                throw new Error('Download timeout');
            }

            console.log(`✅ Tải thành công: ${downloadedFile.fileName} (${downloadedFile.sizeMB} MB)`);

            await browser.close();

            // Tạo title từ filename (bỏ extension)
            const title = fileName.replace(/\.[^/.]+$/, '');

            return {
                success: true,
                message: 'Tải video từ Google Drive thành công',
                data: {
                    originalUrl: driveUrl,
                    title: title,
                    description: title,
                    filePath: downloadedFile.filePath,
                    fileName: downloadedFile.fileName
                }
            };

        } catch (error) {
            console.error(`❌ Lỗi: ${error.message}`);
            if (browser) await browser.close();
            return { success: false, message: error.message };
        }
    }

    /**
     * Trích xuất File ID từ Google Drive URL
     */
    extractFileId(url) {
        // https://drive.google.com/file/d/FILE_ID/view
        // https://drive.google.com/open?id=FILE_ID
        // https://docs.google.com/file/d/FILE_ID

        let match = url.match(/\/file\/d\/([^\/]+)/);
        if (match) return match[1];

        match = url.match(/[?&]id=([^&]+)/);
        if (match) return match[1];

        match = url.match(/\/d\/([^\/]+)/);
        if (match) return match[1];

        return null;
    }

    /**
     * Lấy tên file từ trang Google Drive
     */
    async extractFileName(page, fileId) {
        const fileName = await page.evaluate(() => {
            // Thử lấy từ title
            const titleEl = document.querySelector('title');
            if (titleEl) {
                const title = titleEl.textContent;
                // Title thường có dạng "filename.mp4 - Google Drive"
                const match = title.match(/^(.+?)\s*-\s*Google Drive/);
                if (match) return match[1].trim();
            }

            // Thử lấy từ meta tag
            const metaTitle = document.querySelector('meta[property="og:title"]');
            if (metaTitle) {
                return metaTitle.getAttribute('content');
            }

            return null;
        });

        return fileName || `google-drive-${fileId}.mp4`;
    }

    /**
     * Đợi file download hoàn tất
     */
    async waitForDownload(downloadPath) {
        const maxWait = 600000; // 10 phút cho file lớn
        const startTime = Date.now();
        let lastLogTime = 0;

        while (Date.now() - startTime < maxWait) {
            const currentFiles = fs.readdirSync(downloadPath);
            const videoFiles = currentFiles.filter(f =>
                (f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.mov') || f.endsWith('.mkv')) &&
                !f.endsWith('.crdownload') && !f.endsWith('.part')
            );

            const now = Date.now();
            for (const fileName of videoFiles) {
                const filePath = path.join(downloadPath, fileName);
                const stats = fs.statSync(filePath);
                const modifiedAgo = now - stats.mtimeMs;

                // File vừa được tạo gần đây
                if (modifiedAgo < 60000 && stats.size > 100000) {
                    // Đợi 2 giây để chắc file đã download xong
                    await new Promise(r => setTimeout(r, 2000));
                    const stats2 = fs.statSync(filePath);

                    // Nếu size không đổi = download xong
                    if (stats.size === stats2.size) {
                        return {
                            filePath: filePath,
                            fileName: fileName,
                            sizeMB: (stats.size / (1024 * 1024)).toFixed(2)
                        };
                    }
                }
            }

            // Log tiến độ download mỗi 5 giây
            const downloading = currentFiles.filter(f => f.endsWith('.crdownload') || f.endsWith('.part'));
            if (downloading.length > 0 && (now - lastLogTime > 5000)) {
                try {
                    const dlPath = path.join(downloadPath, downloading[0]);
                    const dlStats = fs.statSync(dlPath);
                    const elapsedSec = Math.round((now - startTime) / 1000);
                    console.log(`   Đang download: ${(dlStats.size / (1024 * 1024)).toFixed(2)} MB (${elapsedSec}s)`);
                    lastLogTime = now;
                } catch { /* ignore */ }
            }

            await new Promise(r => setTimeout(r, 2000));
        }

        return null;
    }
}

module.exports = new GoogleDriveService();
