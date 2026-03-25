#!/bin/bash
# Start Nexus Trading Backend
cd "$(dirname "$0")/backend"
echo "🚀 Starting Nexus Trading Backend on http://localhost:8000"
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
