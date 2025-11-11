#!/bin/bash

echo "🚀 Setting up Next.js Pokémon Card App on Replit..."
echo ""

# Check Node version
echo "📦 Node version: $(node --version)"
echo "📦 NPM version: $(npm --version)"
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "✅ .env.local found"
else
    echo "⚠️  .env.local not found - creating template..."
    cp .env.local.example .env.local
fi
echo ""

# Check MongoDB URI
if grep -q "mongodb://localhost" .env.local; then
    echo "⚠️  WARNING: Using local MongoDB URI"
    echo "   For Replit, use MongoDB Atlas (cloud database)"
    echo "   Get free cluster at: https://mongodb.com/cloud/atlas"
    echo ""
fi

echo "✅ Configuration complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set up MongoDB Atlas (if not done)"
echo "2. Update MONGO_URI in .env.local or Secrets tab"
echo "3. Click the RUN button to start the app"
echo ""
echo "🎉 Your app will be available at:"
echo "   https://$(hostname).repl.co"
