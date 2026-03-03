#!/bin/bash
# FOUR.MEME Complete Token Creator - Quick Install Script

set -e

echo "================================"
echo "FOUR.MEME Token Creator Install"
echo "================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js v18+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version is too old. Please upgrade to v18+."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the four-meme-complete directory."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Set your private key: export PRIVATE_KEY=\"0x...\""
echo "2. Create a token:"
echo "   npx tsx scripts/create-token-api.ts logo.jpg \"NAME\" \"SYMBOL\" \"DESC\" \"AI\""
echo ""
echo "See README.md for full documentation."
