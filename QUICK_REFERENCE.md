# 🚀 Quick Reference Card

## Essential Commands

### Development
```bash
# First time setup (everything)
npm run setup

# Start both backend + frontend
npm run dev

# Start backend only
npm start
# or
npm run dev:backend

# Start frontend only
npm run dev:frontend
```

### Production
```bash
# Build everything
npm run build

# Start production
./start-prod.sh
```

## URLs

| Service | URL | Description |
|---------|-----|-------------|
| Backend API | http://localhost:3000 | REST API server |
| Frontend UI | http://localhost:3001 | Web interface |
| API Docs | http://localhost:3000/api-docs | API documentation (if configured) |

## Key Files

### Configuration
- `frontend/.env.local` - Frontend environment variables
- `comments.json` - Comment templates library
- `proxies.txt` - Proxy server list (optional)
- `accounts.csv` - YouTube account credentials

### Scripts
- `start-dev.sh` - Start development servers
- `build-prod.sh` - Build for production
- `start-prod.sh` - Start production servers

### Documentation
- `README.md` - Main documentation
- `WATCH_VIDEO_API.md` - Backend API reference
- `frontend/API_REFERENCE.md` - Frontend API docs
- `ARCHITECTURE.md` - System architecture

## API Endpoints

### Watch Video
```bash
POST /api/youtube/watch
Body: {
  videoUrl: string,
  watchTimeSeconds: number,
  useAccounts: boolean,
  autoComment?: boolean,
  autoLike?: boolean,
  autoSubscribe?: boolean
}
```

### Accounts
```bash
GET    /api/accounts              # List all accounts
POST   /api/accounts/upload       # Upload CSV
DELETE /api/accounts/:email       # Delete account
```

### Comments
```bash
GET  /api/comments                # Get all comments
POST /api/comments                # Save comments
```

### Campaigns
```bash
GET /api/campaigns/history        # Get history
GET /api/campaigns/:id            # Get single campaign
```

### Stats
```bash
GET /api/stats                    # Dashboard statistics
```

## Frontend Pages

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/` | Overview & statistics |
| Watch Video | `/watch` | Start campaigns |
| Accounts | `/accounts` | Manage accounts |
| Comments | `/comments` | Comment library |
| History | `/history` | Campaign history |
| Settings | `/settings` | Configuration |

## Common Tasks

### Add New Accounts
1. Create CSV: `email,password,recoveryEmail`
2. Go to http://localhost:3001/accounts
3. Click "Choose File" and upload
4. Accounts appear in table

### Start Watch Campaign
1. Go to http://localhost:3001/watch
2. Enter YouTube URL
3. Configure settings
4. Click "Start Campaign"
5. View progress in real-time

### Add Comments
1. Go to http://localhost:3001/comments
2. Enter comment text
3. Add category (optional)
4. Click "Add Comment"

### View Campaign Results
1. Go to http://localhost:3001/history
2. Filter by status if needed
3. Click on campaign for details

## File Formats

### Accounts CSV
```csv
email,password,recoveryEmail
user@gmail.com,Password123!,backup@gmail.com
```

### Comments JSON
```json
{
  "comments": [
    { "text": "Great video!", "category": "general" },
    { "text": "Very helpful!", "category": "educational" }
  ]
}
```

### Proxies TXT
```
http://username:password@proxy1.com:8080
socks5://proxy2.com:1080
```

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Backend
```env
PORT=3000
NODE_ENV=development
```

## Troubleshooting

### Backend won't start
```bash
# Check port
lsof -i :3000
# Kill if needed
kill -9 <PID>
```

### Frontend won't start
```bash
# Reinstall dependencies
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### API connection fails
```bash
# Test backend
curl http://localhost:3000/api/stats

# Check frontend config
cat frontend/.env.local
```

### Playwright issues
```bash
# Reinstall browsers
npx playwright install firefox
```

## Feature Flags

### Watch Video Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| videoUrl | string | required | YouTube video URL |
| watchTimeSeconds | number | required | Watch duration (30-3600) |
| useAccounts | boolean | required | Use logged-in accounts |
| anonymousCount | number | 0 | Number of anonymous views |
| autoComment | boolean | false | Post random comment |
| autoLike | boolean | false | Like the video |
| autoSubscribe | boolean | false | Subscribe to channel |

### Settings Options
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| maxConcurrent | number | 5 | Max browser instances |
| defaultWatchTime | number | 180 | Default watch duration |
| enableProxies | boolean | true | Use proxy rotation |
| enableFingerprinting | boolean | true | Randomize fingerprints |
| headless | boolean | false | Run browsers headless |

## Performance Tips

1. **Limit Concurrent Browsers**: 3-5 recommended
2. **Use Proxies**: Distribute IP load
3. **Enable Fingerprinting**: Better anti-detection
4. **Batch Processing**: Process in smaller groups
5. **Monitor Resources**: Watch CPU/RAM usage

## Security Checklist

- [ ] Never commit credentials to git
- [ ] Use strong passwords for accounts
- [ ] Enable 2FA on all accounts
- [ ] Use residential proxies
- [ ] Add authentication (production)
- [ ] Enable HTTPS (production)
- [ ] Configure CORS properly
- [ ] Implement rate limiting

## Quick Tests

### Test Backend
```bash
curl http://localhost:3000/api/stats
```

### Test Frontend
```bash
open http://localhost:3001
```

### Test Watch Campaign (cURL)
```bash
curl -X POST http://localhost:3000/api/youtube/watch \
  -H "Content-Type: application/json" \
  -d '{"videoUrl":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","watchTimeSeconds":60,"useAccounts":false,"anonymousCount":1}'
```

## Support Resources

- **Main README**: Complete documentation
- **API Docs**: Backend API reference
- **Frontend Docs**: Frontend API reference
- **Architecture**: System design overview
- **Anti-Detection**: Security best practices

## Version Info

- **Backend**: Node.js 18+, Express.js, Playwright
- **Frontend**: Next.js 14, React 18, TypeScript 5
- **Styling**: TailwindCSS 3.x
- **Icons**: Lucide React

## License & Disclaimer

⚠️ **For Educational Use Only**
- Use responsibly and ethically
- Respect YouTube's Terms of Service
- Don't spam or abuse the platform
- Use at your own risk

---

**Need help? Check the documentation files or logs for more details.**
