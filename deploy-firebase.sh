#!/bin/bash

echo "🚀 Firebase Deployment Script for Crossword App"
echo "================================================"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "📦 Installing Firebase CLI..."
    npm install -g firebase-tools
fi

# Login to Firebase
echo ""
echo "🔐 Logging into Firebase..."
firebase login

# Initialize Firebase (if not already done)
if [ ! -d "functions" ]; then
    echo ""
    echo "⚙️  Initializing Firebase Functions..."
    firebase init functions
fi

# Copy backend to functions
echo ""
echo "📁 Copying backend code to functions..."
mkdir -p functions/src
cp -r backend/src/* functions/src/
cp backend/package.json functions/package-backup.json

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
cd functions
npm install express cors bcryptjs jsonwebtoken uuid sql.js firebase-functions firebase-admin

# Create index.js if it doesn't exist
if [ ! -f "index.js" ]; then
    echo ""
    echo "📝 Creating Firebase function entry point..."
    cat > index.js << 'EOF'
const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./src/database');
const authRoutes = require('./src/routes/auth');
const puzzleRoutes = require('./src/routes/puzzles');
const playerRoutes = require('./src/routes/players');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

let dbInitialized = false;

app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await initializeDatabase();
      dbInitialized = true;
    } catch (error) {
      console.error('Database init error:', error);
    }
  }
  next();
});

app.use('/auth', authRoutes);
app.use('/puzzles', puzzleRoutes);
app.use('/players', playerRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

exports.api = functions.https.onRequest(app);
EOF
fi

cd ..

# Deploy
echo ""
echo "🚀 Deploying to Firebase..."
firebase deploy --only functions

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy the function URL from above"
echo "2. Update mobile-app/src/api.js with the URL"
echo "3. Build APK: cd mobile-app && eas build --platform android"
echo ""
