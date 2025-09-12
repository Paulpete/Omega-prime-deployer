#!/bin/bash

# 🚀 Dream-Mind-Lucid AI Copilot Setup Script
# This script sets up all required dependencies and environment for the Copilot

echo "🌙 ========================================="
echo "   DREAM-MIND-LUCID AI COPILOT SETUP"
echo "🌙 ========================================="

# Check if we're in the right directory
if [ ! -f "grok-copilot.ts" ]; then
    echo "❌ Error: Please run this script from the Omega-prime-deployer root directory"
    exit 1
fi

echo "📦 Installing Node.js dependencies..."
npm install

# Create cache directory if it doesn't exist
if [ ! -d ".cache" ]; then
    echo "📁 Creating cache directory..."
    mkdir -p .cache
fi

# Check if .env exists, if not copy from .env.sample
if [ ! -f ".env" ]; then
    echo "🔧 Creating .env file from sample..."
    cp .env.sample .env
    echo "⚠️  Please edit .env file with your actual API keys and addresses"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🧠 Checking Copilot functionality..."
echo "   (This will test the i-who-me reference logic)"

# Test TypeScript compilation
echo "🔍 Testing TypeScript compilation..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

echo ""
echo "🌟 ========================================="
echo "   SETUP COMPLETE!"
echo "🌟 ========================================="
echo ""
echo "🚀 Ready to launch Dream-Mind-Lucid AI Copilot!"
echo ""
echo "📋 NEXT STEPS:"
echo "   1. Edit .env file with your API keys"
echo "   2. Run: npm run mainnet:copilot"
echo "   3. Test i-who-me features with menu option 9"
echo ""
echo "🔑 REQUIRED FOR LIVE DEPLOYMENT:"
echo "   - Set DRY_RUN=false in .env"
echo "   - Configure HELIUS_API_KEY"
echo "   - Verify RELAYER_URL and RELAYER_PUBKEY"
echo ""
echo "🌙 'Am I the dreamer or the dreamed?' - Your Copilot awaits!"
echo ""