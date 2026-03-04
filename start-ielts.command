#!/bin/bash

# ============================================
# ICAN IELTS Simulation App Launcher
# ============================================

cd "$(dirname "$0")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   ICAN IELTS Simulation App Launcher${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Start Cloudflare tunnel if not already running
if ! pgrep -f "cloudflared tunnel run cosmodrive" > /dev/null 2>&1; then
    echo -e "${YELLOW}🌐 Starting Cloudflare Tunnel...${NC}"
    cloudflared tunnel run cosmodrive &
    sleep 2
    echo -e "${GREEN}✅ Cloudflare Tunnel started${NC}"
else
    echo -e "${GREEN}🌐 Cloudflare Tunnel already running${NC}"
fi
echo -e "🌍 Public URL: ${GREEN}https://ielts.icanacademy.work${NC}"
echo ""

# Configuration
SERVER_PORT=5002
CLIENT_PORT=1375
MONGO_PORT=27017

# Function to check if a port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}Killing existing process on port $port (PID: $pid)${NC}"
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"

    # Kill server and client
    if [ -n "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
        echo -e "${GREEN}Server stopped${NC}"
    fi

    if [ -n "$CLIENT_PID" ]; then
        kill $CLIENT_PID 2>/dev/null
        echo -e "${GREEN}Client stopped${NC}"
    fi

    # Note: We don't stop MongoDB as other apps might need it
    echo -e "${BLUE}MongoDB left running (other apps may use it)${NC}"
    echo -e "${GREEN}Goodbye!${NC}"
    exit 0
}

# Set up trap for cleanup
trap cleanup SIGINT SIGTERM

# ============================================
# Step 1: Check/Install MongoDB
# ============================================
echo -e "${BLUE}[1/4] Checking MongoDB...${NC}"

if ! command -v mongod &> /dev/null; then
    echo -e "${YELLOW}MongoDB not found. Installing via Homebrew...${NC}"

    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        echo -e "${RED}Homebrew not found. Please install Homebrew first:${NC}"
        echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
        exit 1
    fi

    # Add MongoDB tap and install
    brew tap mongodb/brew
    brew install mongodb-community

    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install MongoDB. Please install manually.${NC}"
        exit 1
    fi

    echo -e "${GREEN}MongoDB installed successfully!${NC}"
fi

# ============================================
# Step 2: Start MongoDB
# ============================================
echo -e "${BLUE}[2/4] Starting MongoDB...${NC}"

if check_port $MONGO_PORT; then
    echo -e "${GREEN}MongoDB already running on port $MONGO_PORT${NC}"
else
    echo -e "${YELLOW}Starting MongoDB...${NC}"

    # Create data directory if needed
    mkdir -p /usr/local/var/mongodb 2>/dev/null || mkdir -p ~/data/db 2>/dev/null

    # Try brew services first
    if brew services list 2>/dev/null | grep -q mongodb-community; then
        brew services start mongodb-community
    else
        # Fallback: start mongod directly
        mongod --dbpath ~/data/db --fork --logpath ~/data/db/mongodb.log 2>/dev/null || \
        mongod --dbpath /usr/local/var/mongodb --fork --logpath /usr/local/var/log/mongodb/mongo.log 2>/dev/null
    fi

    # Wait for MongoDB to start (may take longer on first run)
    echo -e "${YELLOW}Waiting for MongoDB to initialize...${NC}"
    sleep 8

    if check_port $MONGO_PORT; then
        echo -e "${GREEN}MongoDB started successfully!${NC}"
    else
        echo -e "${RED}Failed to start MongoDB. Please start it manually.${NC}"
        echo "Try: brew services start mongodb-community"
        exit 1
    fi
fi

# ============================================
# Step 3: Check for port conflicts
# ============================================
echo -e "${BLUE}[3/4] Checking for port conflicts...${NC}"

if check_port $SERVER_PORT; then
    echo -e "${YELLOW}Port $SERVER_PORT is in use. Attempting to free it...${NC}"
    kill_port $SERVER_PORT
fi

if check_port $CLIENT_PORT; then
    echo -e "${YELLOW}Port $CLIENT_PORT is in use. Attempting to free it...${NC}"
    kill_port $CLIENT_PORT
fi

echo -e "${GREEN}Ports $SERVER_PORT and $CLIENT_PORT are available${NC}"

# ============================================
# Step 4: Install dependencies if needed
# ============================================
echo -e "${BLUE}[4/4] Checking dependencies...${NC}"

# Server dependencies
if [ ! -d "server/node_modules" ]; then
    echo -e "${YELLOW}Installing server dependencies...${NC}"
    cd server && npm install && cd ..
fi

# Client dependencies
if [ ! -d "client/node_modules" ]; then
    echo -e "${YELLOW}Installing client dependencies...${NC}"
    cd client && npm install && cd ..
fi

echo -e "${GREEN}Dependencies ready!${NC}"

# ============================================
# Start the application
# ============================================
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}Starting IELTS Simulation App...${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Start server in background
echo -e "${BLUE}Starting backend server on port $SERVER_PORT...${NC}"
cd server
npm start &
SERVER_PID=$!
cd ..

# Wait for server to initialize
sleep 3

# Check if server started successfully
if ! check_port $SERVER_PORT; then
    echo -e "${RED}Server failed to start. Check the logs above.${NC}"
    cleanup
fi
echo -e "${GREEN}Backend server running!${NC}"

# Start client in background
echo -e "${BLUE}Starting frontend on port $CLIENT_PORT...${NC}"
cd client
npm run dev &
CLIENT_PID=$!
cd ..

# Wait for client to initialize
sleep 3

# Check if client started successfully
if ! check_port $CLIENT_PORT; then
    echo -e "${RED}Client failed to start. Check the logs above.${NC}"
    cleanup
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   IELTS Simulation App is running!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "   ${BLUE}Frontend:${NC}  https://localhost:$CLIENT_PORT"
echo -e "   ${BLUE}Backend:${NC}   http://localhost:$SERVER_PORT"
echo -e "   ${BLUE}MongoDB:${NC}   localhost:$MONGO_PORT"
echo ""
echo -e "   ${YELLOW}Note: Using HTTPS for microphone access${NC}"
echo -e "   ${YELLOW}Accept the self-signed certificate warning in browser${NC}"
echo ""
echo -e "   ${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Open browser (HTTPS for microphone access)
sleep 2
open "https://localhost:$CLIENT_PORT"

# Keep script running and wait for processes
wait $SERVER_PID $CLIENT_PID
