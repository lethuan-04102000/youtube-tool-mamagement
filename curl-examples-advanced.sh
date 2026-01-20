#!/bin/bash
# Advanced YouTube Watch API Examples
# Includes proxy rotation, anti-detection, and optimized settings

BASE_URL="http://localhost:3000/api/v1/watch"

echo "📚 YouTube Watch API - Advanced Examples with Proxy & Anti-Detection"
echo "======================================================================"
echo ""

# ==============================================================================
# Example 1: Anonymous Views with Proxy Rotation (RECOMMENDED)
# ==============================================================================
echo "1️⃣  Anonymous Views with Proxy Rotation (Best for mass views)"
echo "   - 100 views with residential proxies"
echo "   - Random watch time (30-180s)"
echo "   - Human behavior simulation"
echo "   - Unique fingerprint per view"
echo ""
cat <<'EOF'
curl -X POST http://localhost:3000/api/v1/watch/batch \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtube.com/watch?v=YOUR_VIDEO_ID",
    "tabs": 100,
    "duration": 60,
    "humanBehavior": true,
    "randomDuration": true,
    "proxyFile": "./proxies.txt",
    "batchSize": 5,
    "delayBetweenBatches": 30000
  }'
EOF
echo ""
echo "✅ Best for: Large campaigns (1000+ views)"
echo "⚡ Success rate: 70-80% if proxies are good"
echo "💰 Cost: ~$100-200/month for proxies"
echo ""

# ==============================================================================
# Example 2: Anonymous Views with Proxy List (Inline)
# ==============================================================================
echo "2️⃣  Anonymous Views with Inline Proxy List"
echo ""
cat <<'EOF'
curl -X POST http://localhost:3000/api/v1/watch/batch \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtube.com/watch?v=YOUR_VIDEO_ID",
    "tabs": 50,
    "duration": 45,
    "humanBehavior": true,
    "randomDuration": true,
    "proxyList": [
      "http://user1:pass1@proxy1.example.com:8080",
      "http://user2:pass2@proxy2.example.com:8080",
      "http://user3:pass3@proxy3.example.com:8080"
    ],
    "batchSize": 3
  }'
EOF
echo ""
echo "✅ Use when: You have a small list of proxies"
echo ""

# ==============================================================================
# Example 3: Logged-in Views with Accounts + Proxy (AUTO SUBSCRIBE)
# ==============================================================================
echo "3️⃣  Logged-in Views with Auto Subscribe + Proxy"
echo "   - Uses accounts from CSV file"
echo "   - 25% will subscribe (natural conversion)"
echo "   - Each account gets unique proxy"
echo ""
cat <<'EOF'
curl -X POST http://localhost:3000/api/v1/watch/batch-accounts \
  -H "Content-Type: application/json" \
  -F "accountsFile=@accounts.csv" \
  -F 'data={
    "videoUrl": "https://youtube.com/watch?v=YOUR_VIDEO_ID",
    "duration": 60,
    "humanBehavior": true,
    "randomDuration": true,
    "autoSubscribe": true,
    "proxyFile": "./proxies.txt",
    "batchSize": 3
  }'
EOF
echo ""
echo "✅ Best for: Subscriber campaigns"
echo "📊 Subscribe rate: 25% (natural, not 100%)"
echo "⚠️  Accounts MUST be aged (3+ months) and verified"
echo ""

# ==============================================================================
# Example 4: Small Campaign (No Proxy - Testing)
# ==============================================================================
echo "4️⃣  Small Campaign without Proxy (Testing)"
echo "   - 10 views for testing"
echo "   - No proxy (use your own IP)"
echo ""
cat <<'EOF'
curl -X POST http://localhost:3000/api/v1/watch/batch \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtube.com/watch?v=YOUR_VIDEO_ID",
    "tabs": 10,
    "duration": 45,
    "humanBehavior": true,
    "randomDuration": true,
    "batchSize": 2
  }'
EOF
echo ""
echo "✅ Use for: Testing video URL, checking if tool works"
echo "⚠️  Don't scale to 100+ views without proxy (YouTube will detect same IP)"
echo ""

# ==============================================================================
# Example 5: Optimized for Maximum View Count (Best Practices)
# ==============================================================================
echo "5️⃣  OPTIMIZED: Maximum Real Views (Anti-Detection Best Practices)"
echo "   - Watch 40-70% of video (not fixed 30s)"
echo "   - Space views over 24 hours"
echo "   - 1 proxy = 5-10 views max"
echo ""
cat <<'EOF'
# Step 1: Calculate optimal settings
VIDEO_DURATION_SECONDS=300  # 5 min video
TARGET_VIEWS=1000
PROXY_COUNT=100
BATCH_SIZE=5
HOURS_TO_SPACE=24

# Watch time = 40-70% of video (random)
WATCH_TIME=$(echo "$VIDEO_DURATION_SECONDS * 0.5" | bc | awk '{print int($1)}')

# Delay between batches (space over 24h)
TOTAL_BATCHES=$(echo "$TARGET_VIEWS / $BATCH_SIZE" | bc)
DELAY_MS=$(echo "$HOURS_TO_SPACE * 3600 * 1000 / $TOTAL_BATCHES" | bc)

echo "📊 Campaign Settings:"
echo "  - Target Views: $TARGET_VIEWS"
echo "  - Proxy Count: $PROXY_COUNT"
echo "  - Views per Proxy: ~10 (safe)"
echo "  - Batch Size: $BATCH_SIZE"
echo "  - Watch Time: ~$WATCH_TIME seconds (50% of video)"
echo "  - Delay between batches: ${DELAY_MS}ms"
echo ""

# Step 2: Run campaign
curl -X POST http://localhost:3000/api/v1/watch/batch \
  -H "Content-Type: application/json" \
  -d "{
    \"videoUrl\": \"https://youtube.com/watch?v=YOUR_VIDEO_ID\",
    \"tabs\": $TARGET_VIEWS,
    \"duration\": $WATCH_TIME,
    \"humanBehavior\": true,
    \"randomDuration\": true,
    \"proxyFile\": \"./proxies.txt\",
    \"batchSize\": $BATCH_SIZE,
    \"delayBetweenBatches\": $DELAY_MS
  }"
EOF
echo ""
echo "✅ Expected success rate: 70-80% views counted"
echo "💡 Key: Good proxies + Aged accounts + Natural behavior"
echo ""

# ==============================================================================
# Example 6: Mobile Proxies (Best for Subscribers)
# ==============================================================================
echo "6️⃣  Mobile Proxies (Best for Subscriber Campaigns)"
echo "   - Mobile IPs are most trusted by YouTube"
echo "   - Higher conversion rate"
echo ""
cat <<'EOF'
curl -X POST http://localhost:3000/api/v1/watch/batch-accounts \
  -H "Content-Type: application/json" \
  -F "accountsFile=@accounts.csv" \
  -F 'data={
    "videoUrl": "https://youtube.com/watch?v=YOUR_VIDEO_ID",
    "duration": 60,
    "humanBehavior": true,
    "randomDuration": true,
    "autoSubscribe": true,
    "proxyFile": "./mobile-proxies.txt",
    "batchSize": 2
  }'
EOF
echo ""
echo "💰 Mobile proxies: $15-25/GB (expensive but worth it)"
echo "📈 Subscriber retention: Higher than datacenter IPs"
echo ""

# ==============================================================================
# Example 7: Traffic Curve (Natural Distribution)
# ==============================================================================
echo "7️⃣  Natural Traffic Curve (Mimic Organic Growth)"
echo "   - Distribute 1000 views over 24 hours"
echo "   - Peak during business hours (9am-5pm)"
echo ""
cat <<'EOF'
# Use helper function to generate traffic curve
# This is just an example - implement in your scheduling logic

# Hour 0-6:   50 views (night, low traffic)
# Hour 7-12:  300 views (morning peak)
# Hour 13-18: 400 views (afternoon peak)
# Hour 19-24: 250 views (evening decline)

# Example: Morning peak (7am-12pm)
curl -X POST http://localhost:3000/api/v1/watch/batch \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtube.com/watch?v=YOUR_VIDEO_ID",
    "tabs": 300,
    "duration": 60,
    "humanBehavior": true,
    "randomDuration": true,
    "proxyFile": "./proxies.txt",
    "batchSize": 5,
    "delayBetweenBatches": 60000
  }'
EOF
echo ""
echo "💡 Use cron jobs to schedule different batches throughout the day"
echo ""

# ==============================================================================
# Example 8: Test Single View (Debug)
# ==============================================================================
echo "8️⃣  Test Single View (Debug Mode)"
echo "   - Test with 1 view"
echo "   - Check console logs for human behavior actions"
echo ""
cat <<'EOF'
curl -X POST http://localhost:3000/api/v1/watch/batch \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtube.com/watch?v=YOUR_VIDEO_ID",
    "tabs": 1,
    "duration": 60,
    "humanBehavior": true,
    "randomDuration": false,
    "batchSize": 1
  }'
EOF
echo ""
echo "✅ Check server logs for:"
echo "   - Scroll actions"
echo "   - Pause/play"
echo "   - Seek events"
echo "   - Volume changes"
echo "   - Mouse movements"
echo ""

# ==============================================================================
# BEST PRACTICES SUMMARY
# ==============================================================================
echo ""
echo "📋 BEST PRACTICES SUMMARY"
echo "======================================================================"
echo ""
echo "✅ DO:"
echo "  1. Use residential/mobile proxies (NOT datacenter)"
echo "  2. Limit to 5-10 views per IP per day"
echo "  3. Space views over hours/days (not minutes)"
echo "  4. Use aged accounts (3+ months old)"
echo "  5. Enable humanBehavior and randomDuration"
echo "  6. Watch 40-70% of video (not just 30s)"
echo "  7. Only subscribe 20-30% of the time"
echo "  8. Mix headless + headful mode"
echo "  9. Start small (10 views), then scale"
echo "  10. Monitor YouTube Analytics after 48h"
echo ""
echo "❌ DON'T:"
echo "  1. Don't use datacenter IPs (AWS/GCP/Azure)"
echo "  2. Don't spam 100 views in 5 minutes"
echo "  3. Don't use brand new accounts (<1 week old)"
echo "  4. Don't subscribe 100% of the time"
echo "  5. Don't use same fingerprint for all views"
echo "  6. Don't reuse same proxy for multiple views"
echo "  7. Don't watch exactly 30s every time"
echo "  8. Don't skip human behavior simulation"
echo ""
echo "💰 COST ESTIMATE:"
echo "  - Small (100 views):    $10-20/month"
echo "  - Medium (1000 views):  $100-200/month"
echo "  - Large (10000 views):  $500-1000/month"
echo ""
echo "📊 EXPECTED SUCCESS RATE:"
echo "  - Good setup (proxies + aged accounts):  70-80%"
echo "  - Average setup (some proxies):          40-60%"
echo "  - Poor setup (no proxies, new accounts): 10-20%"
echo ""
echo "🔗 SETUP FILES:"
echo "  - proxies.txt          : List of proxies (one per line)"
echo "  - accounts.csv         : List of accounts (email,password,recovery_email)"
echo "  - PROXY_SETUP.md       : Proxy setup guide"
echo "  - ANTI_DETECTION_GUIDE.md : Anti-detection best practices"
echo ""
echo "======================================================================"
echo "🚀 Ready to start? Copy one of the examples above and customize it!"
echo "======================================================================"
