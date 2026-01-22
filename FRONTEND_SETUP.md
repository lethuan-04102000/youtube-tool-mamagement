# 🎨 Frontend Setup Guide

## 📦 Quick Setup

### Step 1: Install Frontend Dependencies

```bash
cd frontend
npm install
```

### Step 2: Configure Environment

```bash
# .env.local is already created
# Backend API URL: http://localhost:3006
```

### Step 3: Start Development Servers

**Option A: Run Both (Recommended)**
```bash
# From root directory
npm install -D concurrently
npm run dev:all
```

**Option B: Run Separately**

Terminal 1 - Backend:
```bash
# From root directory
npm run dev:backend
# Running on http://localhost:3006
```

Terminal 2 - Frontend:
```bash
# From root directory
npm run dev:frontend
# Running on http://localhost:3000
```

### Step 4: Access Dashboard

Open browser: **http://localhost:3000**

---

## 🏗️ Project Structure

```
tool-manager-ytb-acc/
├── frontend/                    # ⚡ NEW: Frontend application
│   ├── app/                    # Next.js pages
│   │   ├── page.tsx           # Dashboard
│   │   ├── watch/page.tsx     # Boost Views page
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── Sidebar.tsx       # Navigation
│   │   └── StatsCard.tsx     # Stats display
│   ├── lib/                   # Utilities
│   │   └── api.ts            # API client (connects to backend)
│   ├── package.json           # Frontend dependencies
│   ├── next.config.js         # Next.js config
│   ├── tailwind.config.js     # TailwindCSS config
│   └── .env.local             # Environment variables
│
├── src/                       # Backend (existing)
│   ├── controllers/
│   ├── services/
│   └── ...
├── package.json               # Root package.json (updated with scripts)
└── README.md                  # Main documentation
```

---

## 🎯 Features Implemented

### ✅ Dashboard Page (`/`)
- Stats overview (views, subscribers, comments, engagement)
- Quick action cards
- Recent activity feed

### ✅ Boost Views Page (`/watch`)
- Form to generate views
- Support for:
  - ✅ Anonymous views
  - ✅ Logged-in account views
  - ✅ Auto subscribe (25% rate)
  - ✅ Auto like (15% rate)
  - ✅ Auto comment (5% rate)
  - ✅ Human behavior simulation
  - ✅ Random duration
  - ✅ Batch processing
- Real-time feedback
- Error handling

### 🚧 TODO Pages (Placeholders)
- [ ] Accounts Management (`/accounts`)
- [ ] Comments Library (`/comments`)
- [ ] Campaign History (`/history`)
- [ ] Settings (`/settings`)

---

## 📚 NPM Scripts

### Root Directory:

```bash
# Backend only
npm run dev:backend          # Start backend on port 3006

# Frontend only
npm run dev:frontend         # Start frontend on port 3000

# Both at once
npm run dev:all              # Run both servers concurrently

# Install frontend dependencies
npm run install:frontend

# Build frontend for production
npm run build:frontend

# Start frontend production server
npm run start:frontend
```

### Frontend Directory (`cd frontend`):

```bash
# Development
npm run dev                  # Start dev server (port 3000)

# Production
npm run build                # Build for production
npm start                    # Start production server

# Linting
npm run lint                 # Run ESLint
```

---

## 🔧 Configuration

### Backend CORS (Already Configured)

Backend already has CORS enabled in `src/server.js`:

```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3006'],
  credentials: true
}));
```

### Frontend API Client

Frontend connects to backend via `lib/api.ts`:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'
```

Change in `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://your-backend-url
```

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | TailwindCSS |
| **Icons** | Lucide React |
| **HTTP Client** | Axios |
| **Backend** | Express.js (existing) |

---

## 🚀 Development Workflow

### 1. **Start Backend**
```bash
npm run dev:backend
```
- API server: http://localhost:3006
- API docs: Check backend README

### 2. **Start Frontend**
```bash
npm run dev:frontend
```
- Web UI: http://localhost:3000
- Hot reload enabled

### 3. **Make Changes**
- Edit files in `frontend/app/` or `frontend/components/`
- Changes auto-reload in browser

### 4. **Test API Integration**
- Open browser DevTools > Network tab
- Submit forms, check API calls
- Verify data flow backend ↔ frontend

---

## 🐛 Troubleshooting

### Issue: Port 3000 already in use

```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
cd frontend
npm run dev -- -p 3001
```

### Issue: Frontend can't connect to backend

**Check:**
1. Backend is running on port 3006
2. `.env.local` has correct API URL
3. CORS is enabled in backend
4. No firewall blocking ports

**Test backend:**
```bash
curl http://localhost:3006/api/v1/youtube/accounts
```

### Issue: npm install fails

```bash
# Clear cache
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Issue: Build errors

```bash
# Clear Next.js cache
cd frontend
rm -rf .next
npm run build
```

---

## 📖 API Integration Examples

### Watch Batch API

```typescript
// File: lib/api.ts
import { watchAPI } from '@/lib/api'

const response = await watchAPI.watchBatch({
  videoUrl: 'https://youtube.com/watch?v=xxx',
  tabs: 10,
  duration: 60,
  useAccounts: true,
  humanBehavior: true,
  autoSubscribe: true,
  autoLike: true,
  autoComment: true,
  batchSize: 3
})
```

### Upload Accounts

```typescript
import { accountsAPI } from '@/lib/api'

const formData = new FormData()
formData.append('accountsFile', file)

const response = await accountsAPI.uploadAccounts(formData)
```

---

## 🎯 Next Steps

### 1. Complete Remaining Pages

Create these pages:
- [ ] `frontend/app/accounts/page.tsx` - Account management
- [ ] `frontend/app/comments/page.tsx` - Comment library
- [ ] `frontend/app/history/page.tsx` - Campaign history
- [ ] `frontend/app/settings/page.tsx` - Settings page

### 2. Add Components

Reusable components:
- [ ] `Button.tsx` - Styled button
- [ ] `Card.tsx` - Content card
- [ ] `Table.tsx` - Data table
- [ ] `Form.tsx` - Form wrapper
- [ ] `Modal.tsx` - Modal dialog

### 3. Add Features

- [ ] Real-time progress tracking (WebSocket)
- [ ] Campaign history with charts
- [ ] Proxy configuration UI
- [ ] Comment template editor
- [ ] Authentication/login
- [ ] Dark mode

---

## 📝 Development Notes

### Component Structure

```tsx
// Example component
'use client'  // For client-side interactivity

import { useState } from 'react'

export default function MyPage() {
  const [state, setState] = useState(initial)
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Content */}
    </div>
  )
}
```

### Styling with TailwindCSS

```tsx
<div className="bg-white rounded-lg shadow-md p-6">
  <h1 className="text-3xl font-bold text-gray-900">Title</h1>
  <p className="text-gray-600 mt-2">Description</p>
</div>
```

### API Calls

```tsx
const handleSubmit = async () => {
  try {
    const response = await watchAPI.watchBatch(data)
    console.log(response.data)
  } catch (error) {
    console.error(error)
  }
}
```

---

## ✅ Setup Complete!

Your frontend is now ready. Run:

```bash
# Install concurrently if not installed
npm install -D concurrently

# Start both servers
npm run dev:all
```

Then open: **http://localhost:3000** 🎉

---

## 📚 Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [TypeScript Docs](https://www.typescriptlang.org/docs)
- [Backend API Docs](../README.md)

---

**Status:** ✅ Frontend Setup Complete  
**Last Updated:** 2025-01-16
