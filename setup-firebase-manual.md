# 🔥 Firebase Setup - Manual Steps

Since Firebase CLI requires interactive input, follow these steps:

## Step 1: Stop the Current Process

Press `Ctrl+C` in the terminal where `firebase init` is running.

## Step 2: Create Firebase Project (Web Console)

1. Open browser: **https://console.firebase.google.com**
2. Click **"Add project"**
3. Name: `crossword-app`
4. Click **Continue**
5. **Disable Google Analytics** (toggle off)
6. Click **Create project**
7. Wait 30 seconds
8. Click **Continue**

✅ Project created!

## Step 3: Initialize Firebase Functions

Run this command and follow the prompts:

```bash
cd /Users/rnallanchakravarthula/Desktop/Apps/crossword-app
firebase init functions
```

**Answer these questions:**

1. **"Please select an option:"**
   - Choose: **"Use an existing project"** (press Enter)

2. **"Select a default Firebase project:"**
   - Choose: **"crossword-app"** (use arrow keys, press Enter)

3. **"What language would you like to use?"**
   - Choose: **"JavaScript"** (press Enter)

4. **"Do you want to use ESLint?"**
   - Type: **"N"** (No, press Enter)

5. **"Do you want to install dependencies with npm now?"**
   - Type: **"Y"** (Yes, press Enter)

Wait 1-2 minutes for npm install to complete.

✅ Functions initialized!

## Step 4: Copy Backend Code

```bash
# Copy your backend source files to functions folder
cp -r backend/src functions/

# Install additional dependencies
cd functions
npm install express cors bcryptjs jsonwebtoken uuid sql.js
```

## Step 5: Create Firebase Function Entry Point

Create file: `functions/index.js`

```javascript
const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./src/database');
const authRoutes = require('./src/routes/auth');
const puzzleRoutes = require('./src/routes/puzzles');
const playerRoutes = require('./src/routes/players');

const app = express();

// Enable CORS for all origins
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Initialize database once
let dbInitialized = false;

app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await initializeDatabase();
      dbInitialized = true;
      console.log('Database initialized');
    } catch (error) {
      console.error('Database init error:', error);
    }
  }
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/puzzles', puzzleRoutes);
app.use('/players', playerRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app);
```

Save this file.

## Step 6: Update functions/package.json

Make sure `functions/package.json` has these dependencies:

```json
{
  "name": "functions",
  "description": "Cloud Functions for Firebase",
  "scripts": {
    "serve": "firebase emulators:start --only functions",
    "shell": "firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "18"
  },
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^11.8.0",
    "firebase-functions": "^4.3.1",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "uuid": "^9.0.0",
    "sql.js": "^1.10.2"
  }
}
```

## Step 7: Deploy to Firebase

```bash
cd /Users/rnallanchakravarthula/Desktop/Apps/crossword-app
firebase deploy --only functions
```

Wait 2-3 minutes. You'll see:

```
✔  Deploy complete!

Function URL (api): https://us-central1-crossword-app.cloudfunctions.net/api
```

**Copy this URL!**

## Step 8: Test Your Deployment

```bash
curl https://us-central1-crossword-app.cloudfunctions.net/api/health
```

You should see:
```json
{"status":"ok","timestamp":"2026-07-05T..."}
```

✅ Backend deployed successfully!

## Step 9: Update Mobile App

Edit `mobile-app/src/api.js`:

Change line 4:
```javascript
const API_BASE = 'https://us-central1-crossword-app.cloudfunctions.net/api';
```

Comment out line 5:
```javascript
// const WS_URL = 'ws://localhost:3001/ws';
```

Save the file.

## Step 10: Update Admin Dashboard

Edit `admin-dashboard/src/api.js`:

Change line 2:
```javascript
const API_URL = 'https://us-central1-crossword-app.cloudfunctions.net/api';
```

Save the file.

## Step 11: Build APK

```bash
cd mobile-app

# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build APK
eas build --platform android --profile preview
```

Wait 15-20 minutes. You'll get a download link like:
```
https://expo.dev/artifacts/eas/abc123.apk
```

## Step 12: Share APK with Friend

**Option 1: Direct Link**
- Send the Expo download link to your friend
- Friend opens on Android phone
- Downloads and installs

**Option 2: Download and Share**
- Download APK from Expo link
- Upload to Google Drive
- Share Drive link with friend

**Option 3: WhatsApp/Email**
- Download APK (file size ~50-80 MB)
- Send via WhatsApp or email
- Friend downloads and installs

## Friend's Installation Steps:

1. Download APK file
2. Go to Settings → Security
3. Enable "Install from unknown sources" or "Install unknown apps"
4. Open the APK file
5. Click "Install"
6. Open the app and play!

## ✅ Done!

Your app is now:
- ✅ Deployed to Firebase (Google's secure servers)
- ✅ Running 24/7 in the cloud
- ✅ Accessible via APK on your friend's phone
- ✅ 100% FREE
- ✅ Secure (Google infrastructure)

## 🎮 Adding New Puzzles

Run admin dashboard locally:
```bash
cd admin-dashboard
npm run dev
```

Open http://localhost:3000
- Login: `admin` / `admin123`
- Create and publish puzzles
- They appear instantly in your friend's app!

## 📊 Monitor Your App

Firebase Console: https://console.firebase.google.com
- Click your project: `crossword-app`
- Click "Functions" to see usage
- Click "Logs" to see requests

---

**Need help? Check `FIREBASE_SETUP_GUIDE.md` for detailed troubleshooting!**
