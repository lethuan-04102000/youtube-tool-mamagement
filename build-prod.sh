#!/bin/bash

# YouTube Automation Tool - Production Build Script

echo "🏗️  Building YouTube Automation Tool for Production..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"

# Build backend
echo ""
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
npm ci --production

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Backend dependencies failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend dependencies installed${NC}"

# Build frontend
if [ -d "frontend" ]; then
    echo ""
    echo -e "${BLUE}🎨 Building frontend...${NC}"
    cd frontend
    
    echo "Installing frontend dependencies..."
    npm ci
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Frontend dependencies failed${NC}"
        exit 1
    fi
    
    echo "Building Next.js application..."
    npm run build
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Frontend build failed${NC}"
        exit 1
    fi
    
    cd ..
    echo -e "${GREEN}✅ Frontend built successfully${NC}"
fi

# Create start script for production
cat > start-prod.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting YouTube Automation Tool (Production)"

# Start backend
NODE_ENV=production node server.js &
BACKEND_PID=$!

# Start frontend if exists
if [ -d "frontend/.next" ]; then
    cd frontend
    npm start &
    FRONTEND_PID=$!
    cd ..
fi

echo "✅ Servers started"
echo "Backend: http://localhost:3000"
[ -d "frontend/.next" ] && echo "Frontend: http://localhost:3001"

wait
EOF

chmod +x start-prod.sh

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Build Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To start in production mode:"
echo -e "${BLUE}./start-prod.sh${NC}"
echo ""
