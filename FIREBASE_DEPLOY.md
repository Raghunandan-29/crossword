# Deploy to Firebase (Free & Easy)

## Why Firebase?
- ✅ **100% Free** for your use case (1 user)
- ✅ **No credit card** required
- ✅ **Always online** - no need to run your Mac
- ✅ **Easy setup** - just a few commands
- ✅ **Real-time database** built-in

## Option A: Keep Current Backend + Deploy to Firebase Hosting

This is the **EASIEST** option - deploy your existing Node.js backend as-is.

### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase
```bash
firebase login
```

### Step 3: Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Name it "crossword-app"
4. Disable Google Analytics (not needed)
5. Click "Create project"

### Step 4: Initialize Firebase in Your Project
```bash
cd /Users/rnallanchakravarthula/Desktop/Apps/crossword-app
firebase init functions

# Select:
# - Use existing project → crossword-app
# - Language → JavaScript
# - ESLint → No
# - Install dependencies → Yes
```

### Step 5: Move Your Backend to Functions
```bash
# Copy your backend code to functions folder
cp -r backend/src functions/
cp backend/package.json functions/

# Update functions/package.json dependencies
cd functions
npm install express cors ws bcryptjs jsonwebtoken uuid sql.js
```

### Step 6: Create Firebase Function Entry Point

Create `functions/index.js`:
```javascript
const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const { initializeDatabase, getDb } = require('./src/database');
const authRoutes = require('./src/routes/auth');
const puzzleRoutes = require('./src/routes/puzzles');
const playerRoutes = require('./src/routes/players');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Initialize database
let dbInitialized = false;
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/puzzles', puzzleRoutes);
app.use('/api/players', playerRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

exports.api = functions.https.onRequest(app);
```

### Step 7: Deploy
```bash
firebase deploy --only functions
```

You'll get a URL like: `https://us-central1-crossword-app.cloudfunctions.net/api`

### Step 8: Update Mobile App
Edit `mobile-app/src/api.js`:
```javascript
const API_BASE = 'https://us-central1-crossword-app.cloudfunctions.net/api';
// Remove WebSocket for now (Firebase doesn't support it easily)
```

### Step 9: Build APK
```bash
cd mobile-app
npx expo build:android
# Or use EAS: eas build --platform android --profile preview
```

**Done!** Send the APK to your friend.

---

## Option B: Use Firebase Firestore (Better for Mobile)

**Even easier** - skip the backend entirely and use Firebase directly from the mobile app.

### Why This is Better:
- ✅ No backend code needed
- ✅ Real-time sync built-in
- ✅ Offline support automatic
- ✅ Simpler to maintain

### Quick Setup:

1. **Enable Firestore** in Firebase Console
2. **Install Firebase in mobile app:**
   ```bash
   cd mobile-app
   npm install firebase
   ```

3. **Replace `src/api.js`** with Firebase SDK calls
4. **Store puzzles in Firestore** instead of SQLite

This requires rewriting some code, but it's the **best long-term solution**.

---

## Option C: GitHub Pages + Netlify Functions (Also Free)

If you prefer GitHub:

### Step 1: Push to GitHub
```bash
cd /Users/rnallanchakravarthula/Desktop/Apps/crossword-app
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/crossword-app.git
git push -u origin main
```

### Step 2: Deploy Backend to Render (Free)
1. Go to https://render.com
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Select `backend` folder
6. Build command: `npm install`
7. Start command: `npm start`
8. Click "Create Web Service"

You'll get a URL like: `https://crossword-app.onrender.com`

### Step 3: Update Mobile App
```javascript
const API_BASE = 'https://crossword-app.onrender.com/api';
```

**Note:** Render free tier spins down after 15 min of inactivity, so first request takes 30 seconds.

---

## 🎯 My Recommendation for You:

### **Use Option A (Firebase Functions)** because:
1. ✅ Keeps your existing code
2. ✅ 100% free forever
3. ✅ Always fast (no cold starts)
4. ✅ No credit card needed
5. ✅ Easy to add puzzles via admin dashboard

### Then Later (Optional):
Migrate to **Option B (Firestore)** for:
- Better real-time sync
- Offline support
- Simpler architecture

---

## 📱 Sharing APK with Friend

After deploying backend:

### Method 1: Expo Build Service (Easiest)
```bash
cd mobile-app
npx expo build:android
# Wait 10-20 minutes
# Download APK from link
# Send to friend via WhatsApp/Email
```

### Method 2: EAS Build (Newer)
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

### Method 3: Direct APK Build (Advanced)
```bash
cd mobile-app
npx expo prebuild
cd android
./gradlew assembleRelease
# APK in: android/app/build/outputs/apk/release/
```

---

## 💰 Cost Breakdown (All Free!)

| Service | Free Tier | Your Usage | Cost |
|---------|-----------|------------|------|
| Firebase Functions | 2M invocations/month | ~1000/month | $0 |
| Firebase Firestore | 50K reads/day | ~100/day | $0 |
| Firebase Hosting | 10GB/month | <1MB | $0 |
| Expo Build | 30 builds/month | 1-2 builds | $0 |

**Total: $0/month** ✅

---

## Next Steps:

1. Choose **Option A** (Firebase Functions)
2. Follow steps 1-9 above
3. Build APK
4. Send to friend
5. Admin dashboard still works locally to add puzzles!

Want me to help you set up Firebase now?
