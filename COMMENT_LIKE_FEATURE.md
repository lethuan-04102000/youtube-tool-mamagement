# 💬 Comment & Like Feature Documentation

## Overview

This tool now supports **auto-commenting** and **auto-liking** YouTube videos when using logged-in accounts. Comments are randomly selected from `comments.json` to ensure natural variation and avoid spam detection.

---

## 🎯 Features

### 1. **Auto Like** (`autoLike: true`)
- ✅ Automatically likes videos during watch sessions
- ✅ **Natural conversion rate: 15%** (realistic, not 100%)
- ✅ Works only with logged-in accounts
- ✅ Human-like delays before clicking
- ✅ Scrolls to like button naturally
- ✅ Checks if already liked

### 2. **Auto Comment** (`autoComment: true`)
- ✅ Automatically comments on videos
- ✅ **Natural conversion rate: 5%** (realistic, not 100%)
- ✅ Works only with logged-in accounts
- ✅ Random comments from `comments.json`
- ✅ Human-like typing speed
- ✅ Natural delays before submitting
- ✅ Scrolls to comment section naturally

---

## 📋 Requirements

### ⚠️ IMPORTANT:
- **MUST use `useAccounts: true`** - Anonymous users cannot comment/like
- **Accounts must be logged in** - No guest commenting
- **Accounts should be aged** - New accounts may be restricted
- **Accounts should be verified** - Email/phone verification recommended

---

## 🚀 Usage

### Basic Example (With Like):
```bash
curl -X POST http://localhost:3000/api/v1/watch/batch \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtube.com/watch?v=YOUR_VIDEO_ID",
    "tabs": 50,
    "useAccounts": true,
    "autoLike": true,
    "humanBehavior": true,
    "batchSize": 3
  }'
```

**Expected:** 50 views, ~7-8 likes (15% conversion)

---

### Basic Example (With Comment):
```bash
curl -X POST http://localhost:3000/api/v1/watch/batch \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtube.com/watch?v=YOUR_VIDEO_ID",
    "tabs": 100,
    "useAccounts": true,
    "autoComment": true,
    "humanBehavior": true,
    "batchSize": 5
  }'
```

**Expected:** 100 views, ~5 comments (5% conversion)

---

### Full Engagement Campaign:
```bash
curl -X POST http://localhost:3000/api/v1/watch/batch \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtube.com/watch?v=YOUR_VIDEO_ID",
    "tabs": 200,
    "useAccounts": true,
    "autoSubscribe": true,
    "autoLike": true,
    "autoComment": true,
    "humanBehavior": true,
    "randomDuration": true,
    "batchSize": 5,
    "proxyFile": "./proxies.txt"
  }'
```

**Expected:**
- 200 views
- ~50 subscribers (25%)
- ~30 likes (15%)
- ~10 comments (5%)

---

## 📝 Comment System

### Comment Sources:

Comments are loaded from `comments.json` with multiple types:

1. **Regular Comments** (50%):
   - "Great video! Really helpful content 👍"
   - "Thanks for sharing this!"
   - "Amazing content, keep it up! 🔥"

2. **Template-Generated Comments** (20%):
   - "This is {adjective}! {emotion}"
   - "Thanks for {action}"
   - "{greeting}! {feedback}"

3. **Specific Praise** (10%):
   - "The editing on this is top notch! 🎬"
   - "Your explanation style is perfect"

4. **Engagement Comments** (10%):
   - "This channel is so underrated!"
   - "Why doesn't this have more views?"

5. **Question Comments** (5%):
   - "How did you do that at {timestamp}?"
   - "Can you make a tutorial about {topic}?"

6. **Short/Emoji Comments** (5%):
   - "👍"
   - "🔥"
   - "Nice"

---

## 🎨 Customizing Comments

### Edit `comments.json`:

```json
{
  "comments": [
    {
      "text": "Your custom comment here!",
      "category": "positive",
      "language": "en"
    }
  ]
}
```

### Categories:
- `positive` - Positive feedback
- `neutral` - Simple reactions
- `question` - Questions to creator
- `praise` - Specific praise
- `engagement` - Engagement-boosting

### Template Variables:
- `{adjective}` - amazing, awesome, great, etc.
- `{emotion}` - 😊, 🔥, 👍, 💯, etc.
- `{action}` - sharing this, making this video, etc.
- `{greeting}` - Hey, Hello, Hi there, etc.
- `{feedback}` - Very helpful, So useful, etc.

---

## 📊 Natural Conversion Rates

### Default Rates (Realistic):

| Action | Rate | Why? |
|--------|------|------|
| **View** | 100% | Everyone watches |
| **Subscribe** | 25% | Natural conversion for good content |
| **Like** | 15% | Lower than subscribe (common pattern) |
| **Comment** | 5% | Most users don't comment |

### Why Not 100%?

- ❌ **100% like rate = SPAM detected**
- ❌ **100% comment rate = SPAM detected**
- ✅ **Natural rates = YouTube accepts**

Real YouTube data:
- Average like/view ratio: 2-4%
- Average comment/view ratio: 0.1-1%

Our rates (15% like, 5% comment) are **already generous** but still realistic enough to avoid detection.

---

## ⚙️ Adjusting Conversion Rates

If you want to change the conversion rates, edit:

**File:** `src/services/playwright/watch.service.js`

### For Like Rate:
```javascript
// Current: 15% like rate
const shouldLike = Math.random() < 0.15;

// Change to 30% like rate
const shouldLike = Math.random() < 0.30;

// Change to 50% like rate
const shouldLike = Math.random() < 0.50;
```

### For Comment Rate:
```javascript
// Current: 5% comment rate
const shouldComment = Math.random() < 0.05;

// Change to 10% comment rate
const shouldComment = Math.random() < 0.10;

// Change to 20% comment rate
const shouldComment = Math.random() < 0.20;
```

⚠️ **Warning:** Higher rates = higher risk of detection!

---

## 🛡️ Anti-Detection for Comments

### ✅ What We Do:

1. **Natural Conversion Rate** (5%, not 100%)
2. **Random Comment Selection** (from 100+ comments)
3. **Human-Like Typing** (50-150ms per character)
4. **Natural Delays:**
   - 2-5s before scrolling to comments
   - 2-4s after scrolling
   - 1-2s after clicking comment box
   - 2-4s before submitting (reading comment)
5. **Smooth Scrolling** (not instant jump)
6. **Check for Existing Actions** (don't like twice)

### ❌ What to Avoid:

- ❌ Same comment text for all accounts
- ❌ Commenting instantly (no delay)
- ❌ 100% comment rate
- ❌ Very short comments only ("Nice", "Cool")
- ❌ Commenting from new accounts
- ❌ Commenting without watching video

---

## 📈 Best Practices

### 1. **Account Quality Matters**
- ✅ Use aged accounts (3+ months old)
- ✅ Accounts with email verification
- ✅ Accounts with phone verification (best)
- ✅ Accounts with watch history
- ❌ Don't use brand new accounts

### 2. **Comment Quality**
- ✅ Use varied comments (100+ different)
- ✅ Mix lengths (short, medium, long)
- ✅ Mix types (praise, questions, feedback)
- ✅ Use emojis (but not excessively)
- ❌ Don't use spam keywords
- ❌ Don't repeat same comment

### 3. **Timing**
- ✅ Space out comments over hours/days
- ✅ Mix with organic engagement
- ✅ Comment after watching (not instantly)
- ❌ Don't post 100 comments in 5 minutes

### 4. **Engagement Mix**
- ✅ Some views only
- ✅ Some views + like
- ✅ Some views + comment
- ✅ Some views + like + comment + subscribe
- ❌ Don't make every view do everything

### 5. **Proxies**
- ✅ Use residential proxies
- ✅ 1 proxy per account
- ✅ Rotate proxies
- ❌ Don't use datacenter IPs for commenting

---

## 🧪 Testing

### Test Single Comment:
```bash
curl -X POST http://localhost:3000/api/v1/watch/batch \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtube.com/watch?v=YOUR_VIDEO_ID",
    "tabs": 1,
    "useAccounts": true,
    "autoComment": true,
    "humanBehavior": true,
    "batchSize": 1
  }'
```

Check console logs for:
- ✅ "💬 Attempting to comment on video..."
- ✅ "📝 Generated comment: ..."
- ✅ "✅ Comment typed"
- ✅ "✅ Comment submitted!"

---

## 🆘 Troubleshooting

### Q: Comments not showing up on video?
**A:**
1. Check account is logged in (console logs)
2. Check YouTube may delay showing comments (wait 5-10 mins)
3. Check account is not restricted (verify email/phone)
4. Check for errors in console logs
5. Try commenting manually with same account

### Q: "Comment input not found" error?
**A:**
1. YouTube UI may have changed
2. Update selectors in `watch.service.js`
3. Check if comments are disabled on video
4. Check if account can comment (restrictions)

### Q: Like button not working?
**A:**
1. Check account is logged in
2. YouTube UI may have changed
3. Update selectors in `watch.service.js`
4. Check if already liked

### Q: Getting rate limited?
**A:**
1. Reduce `batchSize` to 2-3
2. Add delays between batches
3. Use better proxies
4. Space out over longer time period

### Q: Accounts getting restricted?
**A:**
1. Too aggressive commenting
2. Reduce comment rate (5% → 3%)
3. Use aged accounts
4. Add longer delays
5. Use proxies

---

## 📚 Files Reference

| File | Purpose |
|------|---------|
| `comments.json` | Comment database (100+ comments) |
| `src/helpers/comment.helper.js` | Comment selection logic |
| `src/services/playwright/watch.service.js` | Like/comment implementation |
| `src/controllers/watch.controller.js` | API endpoint with validation |
| `curl-examples-comment-like.sh` | Usage examples |

---

## 💡 Pro Tips

1. **Test First**
   - Run 1 comment test before scaling to 100
   - Check if comment shows up
   - Verify no errors

2. **Mix Actions**
   - 70% views only
   - 20% views + like
   - 10% views + like + comment
   - Natural distribution

3. **Quality over Quantity**
   - 10 high-quality comments > 100 spam comments
   - Use accounts with history
   - Use good proxies

4. **Monitor Results**
   - Check YouTube Studio comments section
   - Watch for account restrictions
   - Adjust rates if needed

5. **Customize Comments**
   - Add niche-specific comments
   - Match video content
   - Use video language

---

## 🚀 Quick Start

```bash
# 1. Edit comments.json with your comments (optional)
nano comments.json

# 2. Test with 1 account
curl -X POST http://localhost:3000/api/v1/watch/batch \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtube.com/watch?v=xxx",
    "tabs": 1,
    "useAccounts": true,
    "autoComment": true,
    "autoLike": true,
    "batchSize": 1
  }'

# 3. Check console logs and YouTube video

# 4. Scale up if successful
curl -X POST http://localhost:3000/api/v1/watch/batch \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtube.com/watch?v=xxx",
    "tabs": 100,
    "useAccounts": true,
    "autoSubscribe": true,
    "autoComment": true,
    "autoLike": true,
    "humanBehavior": true,
    "randomDuration": true,
    "batchSize": 5,
    "proxyFile": "./proxies.txt"
  }'
```

---

**Last Updated:** 2025-01-16  
**Status:** ✅ Production Ready  
**Features:** View + Subscribe + Like + Comment
