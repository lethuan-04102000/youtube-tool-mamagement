/**
 * Service xử lý publish/schedule video và lấy video URL
 */
class YoutubeUploadPublishService {
  /**
   * Schedule video và lấy URL (thay vì publish ngay)
   */
  async scheduleVideo(page) {
    // Đợi video processing
    console.log('⏳ Đang đợi video processing...');

    const maxWaitProcessing = 600000; // 10 phút
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitProcessing) {
      const status = await page.evaluate(() => {
        const processingText = document.body.innerText;

        // Kiểm tra lỗi
        const errorMessages = [];
        if (processingText.includes('Processing abandoned')) errorMessages.push('Processing abandoned');
        if (processingText.includes('Video is too long')) errorMessages.push('Video is too long');
        if (processingText.includes('Copyright claim')) errorMessages.push('Copyright claim');
        if (processingText.includes('Upload failed')) errorMessages.push('Upload failed');

        const doneBtn = document.querySelector('#done-button');
        const isDoneEnabled = doneBtn && !doneBtn.hasAttribute('disabled');

        return {
          hasError: errorMessages.length > 0,
          errorMessages,
          isDoneEnabled
        };
      });

      if (status.hasError) {
        const errorMsg = status.errorMessages.join(', ');
        console.error(`❌ YouTube Error: ${errorMsg}`);
        throw new Error(`YouTube upload error: ${errorMsg}`);
      }

      if (status.isDoneEnabled) {
        console.log('✅ Video sẵn sàng để schedule!');
        break;
      }

      await new Promise(r => setTimeout(r, 5000));
    }

    await new Promise(r => setTimeout(r, 2000));

    // Click nút Schedule (thay vì Publish)
    const scheduleClicked = await page.evaluate(() => {
      const doneBtn = document.querySelector('#done-button');
      if (doneBtn && !doneBtn.hasAttribute('disabled')) {
        doneBtn.click();
        return true;
      }
      return false;
    });

    if (!scheduleClicked) {
      console.log('⚠️ Nút Schedule bị disabled, thử đợi thêm...');
      await new Promise(r => setTimeout(r, 10000));

      await page.evaluate(() => {
        const doneBtn = document.querySelector('#done-button');
        if (doneBtn) doneBtn.click();
      });
    }

    console.log('✅ Đã click Schedule');

    // Đợi dialog xác nhận schedule
    console.log('⏳ Đang đợi xác nhận schedule...');

    const maxWaitSchedule = 60000;
    const scheduleStartTime = Date.now();
    let isScheduled = false;

    while (Date.now() - scheduleStartTime < maxWaitSchedule && !isScheduled) {
      isScheduled = await page.evaluate(() => {
        const pageText = document.body.innerText;
        return pageText.includes('Video scheduled') ||
          pageText.includes('Scheduled') ||
          pageText.includes('will be published') ||
          document.querySelector('ytcp-video-share-dialog') !== null;
      });

      if (!isScheduled) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (isScheduled) {
      console.log('✅ Video đã được schedule!');
    } else {
      console.log('⚠️ Không xác nhận được trạng thái schedule');
    }

    await new Promise(r => setTimeout(r, 3000));

    // Lấy video URL
    console.log('⏳ Đang lấy video URL...');
    const videoUrl = await this.getVideoUrl(page);

    if (videoUrl) {
      console.log(`✅ Đã lấy được video URL: ${videoUrl}`);
      return {
        success: true,
        videoUrl: videoUrl
      };
    } else {
      console.log('⚠️ Không lấy được video URL');
      return {
        success: true,
        videoUrl: null,
        message: 'Video scheduled (URL not immediately available)'
      };
    }
  }

  /**
   * Publish video và lấy URL
   */
  async publishVideo(page) {
    // Đợi video processing hoàn tất trước khi publish
    console.log('⏳ Đang đợi video processing hoàn tất...');

    const maxWaitProcessing = 1800000; // 30 phút (cho video dài)
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitProcessing) {
      const status = await page.evaluate(() => {
        const processingText = document.body.innerText;

        // Kiểm tra processing status
        const isProcessing = processingText.includes('standard definition') || 
                            processingText.includes('SD version') ||
                            processingText.includes('Processing') ||
                            processingText.includes('Uploading');

        // Kiểm tra lỗi thật sự
        const errorMessages = [];
        if (processingText.includes('Processing abandoned')) errorMessages.push('Processing abandoned');
        if (processingText.includes('Video is too long')) errorMessages.push('Video is too long');
        if (processingText.includes('Copyright claim')) errorMessages.push('Copyright claim');
        if (processingText.includes('Upload failed')) errorMessages.push('Upload failed');
        if (processingText.includes('Video rejected')) errorMessages.push('Video rejected');

        // Kiểm tra nút Publish
        const publishBtn = document.querySelector('#done-button');
        const isPublishEnabled = publishBtn && !publishBtn.hasAttribute('disabled');

        return {
          hasError: errorMessages.length > 0,
          errorMessages,
          isPublishEnabled,
          isProcessing
        };
      });

      if (status.hasError) {
        const errorMsg = status.errorMessages.join(', ');
        console.error(`❌ YouTube Error: ${errorMsg}`);
        throw new Error(`YouTube upload error: ${errorMsg}`);
      }

      if (status.isProcessing) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`⏳ Video đang processing... (${elapsed}s elapsed)`);
      }

      if (status.isPublishEnabled) {
        console.log('✅ Video đã sẵn sàng để publish!');
        break;
      }

      await new Promise(r => setTimeout(r, 5000));
    }

    await new Promise(r => setTimeout(r, 2000));

    // Click nút Publish
    console.log('🚀 Đang click nút Publish...');

    const publishClicked = await page.evaluate(() => {
      const publishBtn = document.querySelector('#done-button');
      if (publishBtn && !publishBtn.hasAttribute('disabled')) {
        publishBtn.click();
        return true;
      }
      return false;
    });

    if (!publishClicked) {
      console.log('⚠️ Nút Publish bị disabled, thử đợi thêm...');
      await new Promise(r => setTimeout(r, 10000));

      await page.evaluate(() => {
        const publishBtn = document.querySelector('#done-button');
        if (publishBtn) publishBtn.click();
      });
    }

    console.log('✅ Đã click Publish');

    // Đợi video được publish
    console.log('⏳ Đang đợi video được publish...');

    const maxWaitPublish = 60000;
    const publishStartTime = Date.now();
    let isPublished = false;

    while (Date.now() - publishStartTime < maxWaitPublish && !isPublished) {
      isPublished = await page.evaluate(() => {
        const pageText = document.body.innerText;
        return pageText.includes('Video published') ||
          pageText.includes('Uploaded') ||
          pageText.includes('Published') ||
          document.querySelector('ytcp-video-share-dialog') !== null;
      });

      if (!isPublished) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (isPublished) {
      console.log('✅ Video đã được publish!');
    } else {
      console.log('⚠️ Không xác nhận được trạng thái publish');
    }

    await new Promise(r => setTimeout(r, 3000));

    // Lấy video URL
    console.log('⏳ Đang lấy video URL...');
    const videoUrl = await this.getVideoUrl(page, { maxAttempts: 10, waitBetweenAttempts: 1500 });

    if (videoUrl) {
      console.log(`✅ Đã lấy được video URL: ${videoUrl}`);
      return {
        success: true,
        videoUrl: videoUrl
      };
    } else {
      console.log('⚠️ Không lấy được video URL - nhưng video có thể đã được publish');
      // Video đã publish nhưng chưa lấy được URL (do processing)
      // Vẫn coi là thành công
      return {
        success: true,
        videoUrl: null,
        message: 'Video published but URL not immediately available'
      };
    }
  }

  /**
   * Lấy video URL từ trang sau khi publish/schedule
   * @param {object} page - Puppeteer page
   * @param {object} options - { maxAttempts, waitBetweenAttempts }
   */
  async getVideoUrl(page, options = {}) {
    const { maxAttempts = 15, waitBetweenAttempts = 2000 } = options; // Tăng attempts và thời gian chờ
    const maxWaitUrl = maxAttempts * waitBetweenAttempts;
    const urlStartTime = Date.now();
    let videoUrl = null;
    let attempt = 0;

    console.log(`🔍 Bắt đầu tìm video URL (max ${maxAttempts} attempts, ${waitBetweenAttempts}ms between)...`);

    while (Date.now() - urlStartTime < maxWaitUrl && !videoUrl) {
      attempt++;
      
      videoUrl = await page.evaluate(() => {
        // PHƯƠNG PHÁP 1: Tìm <a id="share-url"> - ƯU TIÊN CAO NHẤT
        const shareUrlLink = document.querySelector('#share-url') || 
                            document.querySelector('a#share-url');
        if (shareUrlLink && shareUrlLink.href) {
          // Extract clean YouTube URL
          const href = shareUrlLink.href;
          if (href.includes('youtube.com/watch') || href.includes('youtube.com/shorts')) {
            // Remove feature=share parameter nếu có
            return href.split('?feature=')[0].split('&feature=')[0];
          }
        }

        // PHƯƠNG PHÁP 2: Tìm trong share dialog
        const shareDialog = document.querySelector('ytcp-video-share-dialog');
        if (shareDialog) {
          // Tìm <a> tag với href chứa youtube.com
          const linkEls = shareDialog.querySelectorAll('a[href*="youtube.com"]');
          for (const link of linkEls) {
            if (link.href && (link.href.includes('/watch') || link.href.includes('/shorts'))) {
              return link.href.split('?feature=')[0].split('&feature=')[0];
            }
          }

          // Tìm input chứa URL
          const linkInput = shareDialog.querySelector('input[type="text"]') ||
            shareDialog.querySelector('input[readonly]') ||
            shareDialog.querySelector('tp-yt-paper-input input');

          if (linkInput && linkInput.value && linkInput.value.includes('youtube.com')) {
            return linkInput.value.split('?feature=')[0].split('&feature=')[0];
          }
        }

        // PHƯƠNG PHÁP 3: Tìm trong URL bar (window.location)
        if (window.location.href.includes('youtube.com/watch?v=')) {
          return window.location.href.split('?feature=')[0].split('&feature=')[0];
        }

        // PHƯƠNG PHÁP 4: Tìm video ID trong ytInitialData
        if (window.ytInitialData) {
          try {
            const data = JSON.stringify(window.ytInitialData);
            const videoIdMatch = data.match(/"videoId":"([\w-]{11})"/);
            if (videoIdMatch && videoIdMatch[1]) {
              return `https://www.youtube.com/watch?v=${videoIdMatch[1]}`;
            }
          } catch (e) {
            // Ignore
          }
        }

        // PHƯƠNG PHÁP 5: Tìm trong script tags
        const scriptTags = document.querySelectorAll('script');
        for (const script of scriptTags) {
          const content = script.textContent || '';
          const videoIdMatch = content.match(/"videoId":"([\w-]{11})"/);
          if (videoIdMatch && videoIdMatch[1]) {
            return `https://www.youtube.com/watch?v=${videoIdMatch[1]}`;
          }
        }

        // PHƯƠNG PHÁP 6: Tìm tất cả links chứa youtube.com/watch
        const allLinks = document.querySelectorAll('a[href*="youtube.com/watch"], a[href*="youtube.com/shorts"]');
        for (const link of allLinks) {
          if (link.href && link.href.match(/youtube\.com\/(watch|shorts)/)) {
            return link.href.split('?feature=')[0].split('&feature=')[0];
          }
        }

        // PHƯƠNG PHÁP 7: Tìm trong toàn bộ page inputs
        const allInputs = document.querySelectorAll('input[readonly], input[type="text"]');
        for (const input of allInputs) {
          if (input.value && input.value.includes('youtube.com/watch')) {
            return input.value.split('?feature=')[0].split('&feature=')[0];
          }
        }

        // PHƯƠNG PHÁP 8: Tìm trong ytcfg
        if (window.ytcfg) {
          try {
            const data = JSON.stringify(window.ytcfg.data_ || {});
            const videoIdMatch = data.match(/"videoId":"([\w-]{11})"/);
            if (videoIdMatch && videoIdMatch[1]) {
              return `https://www.youtube.com/watch?v=${videoIdMatch[1]}`;
            }
          } catch (e) {
            // Ignore
          }
        }

        return null;
      });

      if (!videoUrl) {
        if (attempt % 3 === 0) { // Log mỗi 3 attempts
          console.log(`   🔍 Attempt ${attempt}/${maxAttempts}: Still looking for video URL...`);
        }
        await new Promise(r => setTimeout(r, waitBetweenAttempts));
      } else {
        console.log(`   ✅ Found video URL at attempt ${attempt}: ${videoUrl}`);
        break; // Tìm được rồi thì thoát ngay
      }
    }

    // Fallback 1: Click vào Copy link button để force show URL
    if (!videoUrl) {
      console.log('⚠️ Thử click Copy link button để show URL...');
      try {
        await page.evaluate(() => {
          const copyButton = document.querySelector('button[aria-label*="Copy"]') ||
                            document.querySelector('button[title*="Copy"]') ||
                            Array.from(document.querySelectorAll('button')).find(btn => 
                              btn.textContent.includes('Copy') || btn.textContent.includes('copy')
                            );
          if (copyButton) {
            copyButton.click();
          }
        });
        
        await new Promise(r => setTimeout(r, 2000));
        
        // Try to get URL from clipboard or input again
        videoUrl = await page.evaluate(() => {
          const shareUrlLink = document.querySelector('#share-url');
          if (shareUrlLink && shareUrlLink.href) {
            return shareUrlLink.href.split('?feature=')[0].split('&feature=')[0];
          }
          
          const linkInput = document.querySelector('input[readonly]') ||
                           document.querySelector('input[type="text"]');
          if (linkInput && linkInput.value && linkInput.value.includes('youtube.com')) {
            return linkInput.value.split('?feature=')[0].split('&feature=')[0];
          }
          
          return null;
        });
        
        if (videoUrl) {
          console.log('✅ Lấy được URL sau khi click Copy button');
        }
      } catch (e) {
        console.log('⚠️ Không thể click Copy button:', e.message);
      }
    }

    // Fallback 2: Navigate về Content page để lấy URL
    if (!videoUrl) {
      console.log('⚠️ Thử navigate về Content page để lấy URL...');
      try {
        await page.goto('https://studio.youtube.com/channel/UC/videos', {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        await new Promise(r => setTimeout(r, 3000));

        // Tìm video mới nhất (vừa upload)
        videoUrl = await page.evaluate(() => {
          // Tìm video đầu tiên trong list
          const videoLink = document.querySelector('a[href*="/video/"][href*="/edit"]');
          if (videoLink) {
            const href = videoLink.href;
            const videoIdMatch = href.match(/\/video\/([\w-]{11})\//);
            if (videoIdMatch && videoIdMatch[1]) {
              return `https://www.youtube.com/watch?v=${videoIdMatch[1]}`;
            }
          }
          return null;
        });

        if (videoUrl) {
          console.log('✅ Lấy được URL từ Content page:', videoUrl);
        }
      } catch (e) {
        console.log('⚠️ Không thể navigate về Content page:', e.message);
      }
    }

    return videoUrl;
  }
}

module.exports = new YoutubeUploadPublishService();
