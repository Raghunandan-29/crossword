# 📱 APK Build Guide - Step by Step

## ✅ What We've Done So Far

1. ✅ Backend deployed to Render: `https://crossword-backend-aqfx.onrender.com`
2. ✅ Mobile app API URL updated
3. ✅ Admin dashboard API URL updated
4. ✅ EAS configured
5. ⚠️ Build failed - let's fix it!

---

## 🔧 Fix the Build Issue

The build failed during prebuild. This is usually due to:
1. Missing dependencies
2. Configuration issues
3. Package version conflicts

### Solution: Try Building Again

```bash
cd /Users/rnallanchakravarthula/Desktop/Apps/crossword-app/mobile-app

# Clear any cache
rm -rf node_modules
npm install

# Try building again
eas build --platform android --profile preview
```

---

## 🎯 Alternative: Build APK Locally (If EAS Keeps Failing)

If EAS build continues to fail, you can build locally:

### Step 1: Install Android Studio (Required)
1. Download from: https://developer.android.com/studio
2. Install Android Studio
3. Open Android Studio → More Actions → SDK Manager
4. Install Android SDK (API 33 or 34)

### Step 2: Setup Environment Variables
Add to `~/.zshrc`:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Then run:
```bash
source ~/.zshrc
```

### Step 3: Build Locally
```bash
cd mobile-app

# Prebuild (generates Android project)
npx expo prebuild --platform android

# Build APK
cd android
./gradlew assembleRelease

# APK will be at:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## 🚀 Recommended: Try EAS Build One More Time

Before going the local route, let's try EAS again with the fixes:

```bash
cd /Users/rnallanchakravarthula/Desktop/Apps/crossword-app/mobile-app

# Build with verbose logging
eas build --platform android --profile preview --non-interactive
```

If it fails again, check the logs at the URL provided.

---

## 📋 Common Build Errors & Solutions

### Error: "Unknown error in Prebuild"
**Solution:**
```bash
# Update app.json - ensure package name is valid
# Check that all dependencies are compatible
npm install
eas build --platform android --profile preview --clear-cache
```

### Error: "Gradle build failed"
**Solution:**
```bash
# Update React Native version
cd mobile-app
npm install react-native@0.73.6
eas build --platform android --profile preview
```

### Error: "Out of memory"
**Solution:**
This is an EAS server issue. Just retry:
```bash
eas build --platform android --profile preview
```

### Error: "Invalid package name"
**Solution:**
Edit `app.json` and ensure `android.package` is valid:
```json
{
  "expo": {
    "android": {
      "package": "com.crossword.puzzle"
    }
  }
}
```

---

## 🎯 Quick Fix Checklist

Try these in order:

### 1. Clear Cache and Rebuild
```bash
cd mobile-app
rm -rf node_modules
npm install
eas build --platform android --profile preview --clear-cache
```

### 2. Check Build Logs
- Click the build URL provided by EAS
- Look for specific error messages
- Google the error if unclear

### 3. Update Dependencies
```bash
cd mobile-app
npm update
eas build --platform android --profile preview
```

### 4. Try Production Build Instead
```bash
eas build --platform android --profile production
```

---

## 📱 After Successful Build

Once build succeeds, you'll get:

```
✔ Build finished

https://expo.dev/artifacts/eas/abc123xyz.apk
```

### Share with Friend:

**Method 1: Direct Link**
- Send the link to your friend
- Friend opens on Android phone
- Downloads and installs

**Method 2: Download and Share**
- Download APK from link
- Upload to Google Drive
- Share Drive link

**Method 3: QR Code**
- EAS provides a QR code
- Friend scans with phone camera
- Downloads and installs

---

## 🔍 Debugging Build Failures

### View Detailed Logs:
1. Go to the build URL provided by EAS
2. Click "Build logs"
3. Look for red error messages
4. Common issues:
   - Missing dependencies
   - Version conflicts
   - Configuration errors

### Get Help:
1. Copy the error message
2. Search on: https://forums.expo.dev
3. Or ask on Discord: https://chat.expo.dev

---

## ⚡ Fastest Path to APK

If you just want an APK quickly:

### Option 1: Use Expo Go (No Build Needed)
```bash
cd mobile-app
npx expo start
```

- You and friend install "Expo Go" app from Play Store
- Both scan the QR code
- App runs instantly (no APK needed)
- **Downside:** Both need Expo Go installed

### Option 2: Wait for EAS Build
- Usually takes 10-20 minutes
- Sometimes fails, just retry
- Most reliable for production

### Option 3: Build Locally
- Requires Android Studio (10GB download)
- Takes 30-60 minutes first time
- Faster for subsequent builds

---

## 💡 Pro Tips

1. **Be patient with EAS** - First build can fail, just retry
2. **Check build logs** - They tell you exactly what's wrong
3. **Use `--clear-cache`** - Helps with weird errors
4. **Update dependencies** - Keeps things compatible
5. **Try different profiles** - preview vs production

---

## 🎉 Success Criteria

You know it worked when:
- ✅ Build completes without errors
- ✅ You get an APK download link
- ✅ APK file is 50-80 MB
- ✅ Friend can install and open the app
- ✅ App connects to Render backend
- ✅ Puzzles load and work

---

## 🆘 Still Having Issues?

### Try This Command:
```bash
cd mobile-app

# Full reset
rm -rf node_modules package-lock.json
npm install

# Update Expo
npm install expo@latest

# Try build again
eas build --platform android --profile preview --clear-cache
```

### Or Build Locally:
See "Alternative: Build APK Locally" section above

---

## 📞 Next Steps

1. Try the build command again
2. If it fails, check the build logs
3. Try the fixes in "Common Build Errors" section
4. If still stuck, try building locally

**You're almost there!** 🚀
