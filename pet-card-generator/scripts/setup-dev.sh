#!/bin/bash

# Pet Card Generator - Development Setup Script

echo "🚀 Setting up Pet Card Generator development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "📦 Installing Firebase CLI..."
    npm install -g firebase-tools
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install functions dependencies
echo "📦 Installing Firebase Functions dependencies..."
cd functions && npm install && cd ..

# Copy environment file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env.local
    echo "⚠️  Please update .env.local with your actual Firebase configuration"
fi

# Initialize Firebase project (if not already done)
if [ ! -f .firebaserc ]; then
    echo "🔥 Initializing Firebase project..."
    echo "Please run 'firebase init' manually to set up your Firebase project"
fi

echo "✅ Development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your Firebase configuration"
echo "2. Run 'npm run dev:emulators' to start Firebase emulators"
echo "3. Run 'npm run dev' to start the development server"
echo "4. Set up your n8n Cloud account and import workflows from n8n-workflows/"