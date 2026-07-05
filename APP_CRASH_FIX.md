# 🔧 App Crash Fix - Opens Then Closes Immediately

## 🔍 Common Causes

When an app opens and immediately closes, it's usually:

1. **Backend not responding** (Render cold start - 30 seconds)
2. **Network timeout** (API request failing)
3. **Missing error handling** (app crashes on failed request)
4. **WebSocket error** (trying to connect to undefined WS_URL)

---

## ✅ Quick Fix #1: Wake Up Backend First

Render free tier "sleeps" after 15 minutes. The first request takes ~30 seconds to wake it up.

### Test Backend:
```bash
# This will wake up the backend
curl https://crossword-backend-aqfx.onrender.com/api/health
```

**Wait 30 seconds**, then try opening the app again.

---

## ✅ Quick Fix #2: Increase Timeout

The app might be timing out too quickly. Let me update the API timeout:

### Update mobile-app/src/api.js:
Change timeout from 10 seconds to 60 seconds for first load.

---

## ✅ Quick Fix #3: Add Error Handling

The app might be crashing when it can't reach the backend. We need to add proper error handling.

---

## 🔍 How to Debug

### Check if Backend is Awake:
```bash
curl https://crossword-backend-aqfx.onrender.com/api/health
```

**Expected Response:**
```json
{"status":"ok","timestamp":"2026-07-05T..."}
```

**If you get an error or timeout:**
- Wait 30 seconds and try again
- Backend is waking up from sleep

### Check if Puzzles Load:
```bash
curl https://crossword-backend-aqfx.onrender.com/api/puzzles/published
```

**Expected Response:**
```json
[{"id":"...","title":"Tech Basics",...}, ...]
```

---

## 🛠️ Fixes to Apply

### Fix 1: Update API Timeout

I'll update the mobile app to handle slow backend responses better.

### Fix 2: Add Loading State

The app should show a loading screen while waiting for backend, not crash.

### Fix 3: Add Error Handling

If backend is unreachable, show a friendly error message instead of crashing.

---

## 📱 Temporary Workaround (While I Fix)

### Keep Backend Awake:

**Option A: Use UptimeRobot (Free)**
1. Go to https://uptimerobot.com
2. Sign up (free, no credit card)
3. Add monitor:
   - Type: HTTP(s)
   - URL: `https://crossword-backend-aqfx.onrender.com/api/health`
   - Interval: 5 minutes
4. Backend stays awake 24/7

**Option B: Manual Wake Up**
Before opening the app, run:
```bash
curl https://crossword-backend-aqfx.onrender.com/api/health
```
Wait 30 seconds, then open app.

---

## 🔧 Let Me Fix the Code

I'll update the mobile app to:
1. Increase timeout to 60 seconds
2. Add loading screen
3. Handle errors gracefully
4. Retry failed requests

Then you'll need to rebuild the APK.

---

## 🆘 Other Possible Issues

### Issue: App Permissions
**Solution:** App should auto-request permissions, but check:
- Settings → Apps → Crossword Puzzle → Permissions
- Enable "Internet" (should be automatic)

### Issue: Android Version
**Solution:** App requires Android 5.0+ (API 21+)
- Check: Settings → About Phone → Android Version
- If below 5.0, app won't work

### Issue: Corrupted APK
**Solution:** Redownload APK
- Delete current APK
- Download fresh from EAS link
- Reinstall

---

## 🎯 Most Likely Cause

**Backend Cold Start**

Render free tier sleeps after 15 minutes of inactivity. When the app tries to load puzzles on startup, the backend is asleep and takes 30 seconds to wake up. The app times out (10 seconds) and crashes.

**Solution:** I'll fix the app to wait longer and show loading screen.

---

## 📞 Next Steps

1. **Test backend** (curl command above)
2. **Wait 30 seconds** for backend to wake
3. **Try app again**
4. If still crashes, I'll fix the code and rebuild APK

Let me know if the app works after waking up the backend!
