#!/bin/bash
# YouTube Watch API Examples with Comment & Like Features

BASE_URL="http://localhost:3000/api/v1/watch"

echo "💬 YouTube Watch API - Comment & Like Examples"
echo "=============================================="
echo ""

# ==============================================================================
# Example 1: Watch + Like (15% of viewers)
# ==============================================================================
echo "1️⃣  Watch Video with Auto Like (15% conversion)"
echo "   - Use logged-in accounts"
echo "   - Random 15% will like the video"
echo "   - Natural user behavior"
echo ""
cat <<'EOF'
curl -X POST http://localhost:3000/api/v1/watch/batch \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtube.com/watch?v=YOUR_VIDEO_ID",
    "tabs": 50,
    "duration": 60,
    "useAccounts": true,
    "humanBehavior": true,
    "randomDuration": true,
    "autoLike": true,
    "batchSize": 3
  }'
EOF
echo ""
echo "✅ Expected: 50 views, ~7-8 likes (15% conversion)"
echo ""

# ==============================================================================
# Example 2: Watch + Comment (5% of viewers)
# ==============================================================================
echo "2️⃣  Watch Video with Auto Comment (5% conversion)"
echo "   - Use logged-in accounts"
echo "   - Random 5% will comment"
echo "   - Comments from comments.json"
echo ""
cat <<'EOF'
curl -X POST http://localhost:3000/api/v1/watch/batch \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtube.com/watch?v=YOUR_VIDEO_ID",
    "tabs": 100,
    "duration": 60,
    "useAccounts": true,
    "humanBehavior": true,
    "randomDuration": true,
    "autoComment": true,
    "batchSize": 5
  }'
EOF
echo ""
echo "✅ Expected: 100 views, ~5 comments (5% conversion)"
echo ""

# ==============================================================================
# Example 3: Watch + Like + Comment + Subscribe (Full Engagement)
# ==============================================================================
echo "3️⃣  Full Engagement Campaign (Like + Comment + Subscribe)"
echo "   - 25% subscribe"
echo "   - 15% like"
echo "   - 5% comment"
echo "   - Natural overlapping behavior"
echo ""
cat <<'EOF'
curl -X POST http://localhost:3000/api/v1/watch/batch \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtube.com/watch?v=YOUR_VIDEO_ID",
    "tabs": 200,
    "duration": 60,
    "useAccounts": true,
    "humanBehavior": true,
    "randomDuration": true,
    "autoSubscribe": true,
    "autoLike": true,
    "autoComment": true,
    "batchSize": 5,
    "proxyFile": "./proxies.txt"
  }'
EOF
echo ""
echo "✅ Expected Results:"
echo "   - 200 views"
echo "   - ~50 subscribers (25%)"
echo "   - ~30 likes (15%)"
echo "   - ~10 comments (5%)"
echo ""

# ==============================================================================
# Example 4: Comment-Only Campaign (Boost Engagement)
# ==============================================================================
echo "4️⃣  Comment-Only Campaign (No views, just comments)"
echo "   - For boosting existing video engagement"
echo "   - Use aged accounts"
echo ""
cat <<'EOF'
curl -X POST http://localhost:3000/api/v1/watch/batch \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtube.com/watch?v=YOUR_VIDEO_ID",
    "tabs": 20,
    "duration": 45,
    "useAccounts": true,
    "humanBehavior": true,
    "autoComment": true,
    "batchSize": 2
  }'
EOF
echo ""
echo "✅ Expected: 20 views, ~1 comment (natural 5% rate)"
echo "💡 Tip: Set autoComment rate higher if you want more comments"
echo ""

# ==============================================================================
# Example 5: With Proxy Rotation (Best for Large Campaigns)
# ==============================================================================
echo "5️⃣  Large Campaign with Proxies + Full Engagement"
echo "   - Use residential proxies"
echo "   - Rotate proxy per account"
echo "   - Full engagement features"
echo ""
cat <<'EOF'
curl -X POST http://localhost:3000/api/v1/watch/batch \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtube.com/watch?v=YOUR_VIDEO_ID",
    "tabs": 500,
    "duration": 60,
    "useAccounts": true,
    "humanBehavior": true,
    "randomDuration": true,
    "autoSubscribe": true,
    "autoLike": true,
    "autoComment": true,
    "batchSize": 5,
    "proxyFile": "./proxies.txt"
  }'
EOF
echo ""
echo "✅ Expected Results (with good proxies):"
echo "   - 500 views (70-80% counted = ~350-400 real views)"
echo "   - ~125 subscribers"
echo "   - ~75 likes"
echo "   - ~25 comments"
echo ""
echo "💰 Cost: $200-300/month for proxies"
echo ""

# ==============================================================================
# IMPORTANT NOTES
# ==============================================================================
echo ""
echo "⚠️  IMPORTANT NOTES"
echo "==================="
echo ""
echo "1. Comment/Like ONLY work with useAccounts=true"
echo "   - Anonymous users cannot comment or like"
echo "   - Must be logged in"
echo ""
echo "2. Natural Conversion Rates:"
echo "   - Subscribe: 25% (realistic)"
echo "   - Like: 15% (realistic)"
echo "   - Comment: 5% (realistic)"
echo "   - These rates are randomized in the code"
echo ""
echo "3. Comment Quality:"
echo "   - Comments loaded from comments.json"
echo "   - Mix of positive, neutral, questions, etc."
echo "   - Randomized for natural variation"
echo ""
echo "4. Anti-Detection:"
echo "   - Don't set all rates to 100%"
echo "   - Use aged accounts (3+ months)"
echo "   - Use proxies for large campaigns"
echo "   - Space out over hours/days"
echo ""
echo "5. Customize comments.json:"
echo "   - Add your own comments"
echo "   - Customize for your niche"
echo "   - Mix languages if needed"
echo ""

# ==============================================================================
# Testing Single Comment
# ==============================================================================
echo ""
echo "🧪 TESTING"
echo "=========="
echo ""
echo "Test with 1 account first:"
echo ""
cat <<'EOF'
curl -X POST http://localhost:3000/api/v1/watch/batch \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtube.com/watch?v=YOUR_VIDEO_ID",
    "tabs": 1,
    "duration": 30,
    "useAccounts": true,
    "humanBehavior": true,
    "autoComment": true,
    "autoLike": true,
    "batchSize": 1
  }'
EOF
echo ""
echo "✅ Check console logs to see:"
echo "   - If like button was clicked"
echo "   - If comment was typed and submitted"
echo "   - What comment text was used"
echo ""

# ==============================================================================
# Customizing Comment Rate
# ==============================================================================
echo ""
echo "⚙️  CUSTOMIZING COMMENT RATE"
echo "============================"
echo ""
echo "Default rates (in watch.service.js):"
echo "  - autoLike: 15% chance (Math.random() < 0.15)"
echo "  - autoComment: 5% chance (Math.random() < 0.05)"
echo ""
echo "To change rates, edit:"
echo "  src/services/playwright/watch.service.js"
echo ""
echo "Example: 50% comment rate"
echo "  const shouldComment = Math.random() < 0.50; // 50% chance"
echo ""

# ==============================================================================
# Error Handling
# ==============================================================================
echo ""
echo "🆘 TROUBLESHOOTING"
echo "=================="
echo ""
echo "Q: Comments not showing up?"
echo "A: Check:"
echo "   - Account is logged in (useAccounts=true)"
echo "   - Account is not restricted (verify email/phone)"
echo "   - Console logs for errors"
echo "   - YouTube may delay showing comments (check after 5 mins)"
echo ""
echo "Q: Likes not working?"
echo "A: Check:"
echo "   - Account is logged in"
echo "   - Like button selector may have changed (update code)"
echo "   - Console logs for errors"
echo ""
echo "Q: Getting captchas?"
echo "A: Too aggressive! Solutions:"
echo "   - Reduce batchSize to 2-3"
echo "   - Add longer delays between batches"
echo "   - Use better proxies (residential/mobile)"
echo "   - Use aged accounts"
echo ""

echo ""
echo "✅ Ready to start? Copy one of the examples above!"
echo "======================================================================"
