# How to Share This App With Your Friend

## Quick Answer

**YES, you need the backend running** for your friend to use the app. The app fetches puzzles, saves progress, and syncs data through your backend server.

## Option 1: Share via Expo Go (Easiest - No Build Required)

### Step 1: Get Your Local IP Address
```bash
# On Mac, run:
ipconfig getifaddr en0
# Example output: 192.168.1.100
```

### Step 2: Update Mobile App API URLs
Edit `mobile-app/src/api.js` and change:
```javascript
const API_BASE = 'http://192.168.1.100:3001/api';  // Use YOUR IP
const WS_URL = 'ws://192.168.1.100:3001/ws';       // Use YOUR IP
```

### Step 3: Start Everything
```bash
# Terminal 1 - Backend (MUST BE RUNNING)
cd backend
npm run dev

# Terminal 2 - Mobile App
cd mobile-app
npx expo start
```

### Step 4: Share with Friend
1. Your friend installs **Expo Go** app from Google Play Store
2. You scan the QR code from `npx expo start` with your phone
3. Share the **same WiFi network** with your friend
4. Your friend scans the **same QR code** with Expo Go app
5. Both of you can now use the app!

**Requirements:**
- ✅ Both phones on same WiFi network
- ✅ Your Mac running backend server
- ✅ Your Mac NOT sleeping

---

## Option 2: Build APK for Android (Friend Can Use Offline)

This creates a standalone app, but **backend still needed for puzzles**.

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Create Expo Account
```bash
eas login
# Create account at expo.dev if you don't have one
```

### Step 3: Configure Project
```bash
cd mobile-app
eas build:configure
```

### Step 4: Update API URLs for Production
Edit `mobile-app/src/api.js`:
```javascript
// Option A: Use your public IP (if you have static IP)
const API_BASE = 'http://YOUR_PUBLIC_IP:3001/api';

// Option B: Use ngrok (temporary tunnel - see below)
const API_BASE = 'https://abc123.ngrok.io/api';
```

### Step 5: Build APK
```bash
eas build --platform android --profile preview
```

This takes 10-20 minutes. You'll get a download link for the APK.

### Step 6: Share APK
1. Download the APK from the link
2. Send it to your friend (WhatsApp, email, etc.)
3. Friend installs it on Android (may need to enable "Install from unknown sources")

**Backend Setup for Remote Access:**

Since your friend won't be on your WiFi, you need to expose your backend:

#### Option A: Use ngrok (Temporary Tunnel)
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3001

# You'll get a URL like: https://abc123.ngrok.io
# Update mobile-app/src/api.js with this URL
```

#### Option B: Deploy Backend to Cloud
Deploy to Heroku, Railway, Render, etc. (requires deployment setup)

---

## When Does Backend Need to Run?

### Backend MUST be running for:
- ✅ Fetching puzzle list
- ✅ Playing puzzles (loads grid and clues)
- ✅ Checking answers
- ✅ Saving progress
- ✅ Completing puzzles
- ✅ Viewing leaderboard
- ✅ Real-time puzzle updates

### Backend NOT needed for:
- ❌ Nothing - the app requires backend for all features

**The app is online-only.** It doesn't work offline because:
- Puzzles are stored in the backend database
- Progress is saved to the backend
- Leaderboard is calculated by the backend

---

## Recommended Setup for Sharing with Friend

### For Testing (Same WiFi):
Use **Option 1** (Expo Go) - easiest and instant

### For Long-term Use:
1. Build APK with **Option 2**
2. Deploy backend to a free cloud service:
   - **Railway** (easiest): https://railway.app
   - **Render**: https://render.com
   - **Fly.io**: https://fly.io

This way:
- ✅ Friend has standalone app
- ✅ Backend runs 24/7 in cloud
- ✅ You can add puzzles from admin dashboard anytime
- ✅ Multiple friends can use it

---

## Adding New Puzzles

You only need the **Admin Dashboard** to add puzzles:

```bash
cd admin-dashboard
npm run dev
# Open http://localhost:3000
# Login: admin / admin123
```

When you publish a puzzle, it **instantly appears** on all connected devices via WebSocket!

---

## Summary

| Method | Friend Needs | Backend Needs | Best For |
|--------|-------------|---------------|----------|
| Expo Go | Expo Go app + Same WiFi | Running on your Mac | Quick testing |
| APK + ngrok | APK file | Running on your Mac + ngrok | Short-term sharing |
| APK + Cloud | APK file | Deployed to cloud | Long-term use |

**Next Steps:**
1. Try Option 1 first (Expo Go) to test
2. If you like it, deploy backend to Railway/Render
3. Build APK and share with friend
