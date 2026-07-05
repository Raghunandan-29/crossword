# ✅ Quick Start Checklist - Share App with Friend

## 🎯 Goal
Get your crossword app on your friend's Android phone for **FREE** in **30 minutes**.

---

## 📋 Checklist

### ☐ Step 1: Create GitHub Account (2 min)
- [ ] Go to https://github.com
- [ ] Sign up (if you don't have account)
- [ ] Verify email

### ☐ Step 2: Push Code to GitHub (3 min)
```bash
cd /Users/rnallanchakravarthula/Desktop/Apps/crossword-app
git init
git add .
git commit -m "Crossword app"
```

- [ ] Create new repository on GitHub (name: `crossword-app`)
- [ ] Copy the commands GitHub shows you:
```bash
git remote add origin https://github.com/YOUR_USERNAME/crossword-app.git
git branch -M main
git push -u origin main
```

### ☐ Step 3: Deploy Backend to Render (5 min)
- [ ] Go to https://render.com
- [ ] Click "Get Started for Free"
- [ ] Sign up with GitHub
- [ ] Click "New +" → "Web Service"
- [ ] Select your `crossword-app` repository
- [ ] Fill in:
  - Name: `crossword-backend`
  - Root Directory: `backend`
  - Build Command: `npm install`
  - Start Command: `npm start`
  - Plan: **Free**
- [ ] Click "Create Web Service"
- [ ] Wait 2-3 minutes for deployment
- [ ] Copy your URL (e.g., `https://crossword-backend.onrender.com`)

### ☐ Step 4: Update Mobile App API (1 min)
- [ ] Open `mobile-app/src/api.js`
- [ ] Change line 4 to your Render URL:
```javascript
const API_BASE = 'https://crossword-backend.onrender.com/api';
```
- [ ] Comment out or remove WebSocket (line 5):
```javascript
// const WS_URL = 'ws://localhost:3001/ws';
```
- [ ] Save file

### ☐ Step 5: Build APK (20 min wait time)
```bash
cd mobile-app
npm install -g eas-cli
eas login
```
- [ ] Create Expo account (if needed)
- [ ] Login with your credentials
```bash
eas build:configure
```
- [ ] Press Enter for all defaults
```bash
eas build --platform android --profile preview
```
- [ ] Wait 10-20 minutes
- [ ] Copy the download link when done

### ☐ Step 6: Share with Friend (2 min)
- [ ] Download APK from EAS link
- [ ] Send APK to friend via:
  - WhatsApp, or
  - Email, or
  - Google Drive, or
  - Any file sharing method
- [ ] Friend installs APK on Android
  - May need to enable "Install from unknown sources"
- [ ] Done! 🎉

---

## 🎮 After Setup: How to Add Puzzles

### Update Admin Dashboard
- [ ] Open `admin-dashboard/src/api.js`
- [ ] Change line 2 to your Render URL:
```javascript
const API_URL = 'https://crossword-backend.onrender.com/api';
```
- [ ] Save file

### Run Admin Dashboard
```bash
cd admin-dashboard
npm run dev
```
- [ ] Open http://localhost:3000
- [ ] Login: `admin` / `admin123`
- [ ] Create and publish puzzles
- [ ] They appear instantly in your friend's app!

---

## ⚠️ Important Notes

### First Request is Slow
Render free tier "sleeps" after 15 minutes of no activity.
- First request takes ~30 seconds to wake up
- After that, it's fast
- **This is normal and free!**

### To Keep It Awake (Optional)
Use UptimeRobot (free):
1. Go to https://uptimerobot.com
2. Add monitor for your Render URL
3. It pings every 5 minutes to keep it awake

### Updating the App
If you make changes:
```bash
# Push to GitHub
git add .
git commit -m "Update"
git push

# Render auto-deploys (2-3 min)

# Rebuild APK
cd mobile-app
eas build --platform android --profile preview

# Send new APK to friend
```

---

## 🆘 Troubleshooting

### Problem: "Unable to find expo"
**Solution:**
```bash
cd mobile-app
npm install
```

### Problem: "git: command not found"
**Solution:**
```bash
# Install git
xcode-select --install
```

### Problem: APK won't install on friend's phone
**Solution:**
Friend needs to:
1. Go to Settings → Security
2. Enable "Install from unknown sources"
3. Try installing again

### Problem: App shows "Network Error"
**Solution:**
1. Check Render URL is correct in `mobile-app/src/api.js`
2. Wait 30 seconds (Render might be waking up)
3. Check Render dashboard - service should be "Live"

### Problem: Can't login to admin dashboard
**Solution:**
1. Make sure backend is deployed and running
2. Check API_URL in `admin-dashboard/src/api.js`
3. Default credentials: `admin` / `admin123`

---

## 📊 Progress Tracker

- [ ] GitHub account created
- [ ] Code pushed to GitHub
- [ ] Backend deployed to Render
- [ ] Mobile app API updated
- [ ] APK built successfully
- [ ] APK sent to friend
- [ ] Friend installed and tested
- [ ] Admin dashboard updated
- [ ] Successfully added a new puzzle

---

## 🎉 Success Criteria

You're done when:
- ✅ Friend can open app on their Android phone
- ✅ Friend can see and play puzzles
- ✅ Friend's progress is saved
- ✅ You can add new puzzles from admin dashboard
- ✅ New puzzles appear in friend's app

---

## 💰 Total Cost

**$0** - Everything is free!

---

## ⏱️ Time Estimate

| Step | Time |
|------|------|
| GitHub setup | 2 min |
| Push code | 3 min |
| Deploy to Render | 5 min |
| Update mobile app | 1 min |
| Build APK | 20 min (wait) |
| Share with friend | 2 min |
| **Total active time** | **13 min** |
| **Total wait time** | **20 min** |

---

## 📚 Files to Reference

- **Detailed Render guide:** `EASIEST_DEPLOY.md`
- **All deployment options:** `DEPLOYMENT_OPTIONS.md`
- **Firebase alternative:** `FIREBASE_DEPLOY.md`
- **Sharing guide:** `SHARING_GUIDE.md`

---

## 🚀 Ready to Start?

Open `EASIEST_DEPLOY.md` and follow the step-by-step instructions!

Good luck! 🎮
