# ✨ Kita PDF Reader v2.2.1

## 🎉 What's New

### ✨ New Features
- 🔄 **Auto-Check for Updates on Startup**
  - Automatic update check 3 seconds after app launch
  - Smart toast notification when updates available
  - "Update Now" or "Later" options
  - Silent background check without disruption

### 🎨 UI/UX Improvements
- 🖼️ **Enhanced About Dialog**
  - **20% smaller** and more compact design (600px width)
  - Fully **responsive** (mobile-friendly)
  - Removed blur effects for better performance
  - Logo reduced to 70×70px for cleaner look
  - Beautiful feature badges with hover effects
  - Contact section with simple design
  - **One-click email copy** with toast notification
  - Fixed toast auto-display bug

- 📊 **Enhanced Update Dialog**
  - **Real-time download speed** display (🏎️ 5.32 MB/s)
  - **Large percentage** progress with accent color
  - **File size indicator** (downloaded / total MB)
  - **Estimated time remaining (ETA)** calculation
  - Animated shimmer progress bar
  - Colorful gradient (primary → secondary)

- ⚙️ **Settings Button Polish**
  - Fixed hover background issue
  - Smooth 90° rotation animation
  - Cleaner visual feedback

### 🔧 Bug Fixes
- ✅ **Drag & Drop Fixed in Development Mode**
  - Now works properly in `npm start` mode
  - Fixed security sandbox configuration
  - Added fallback using FileReader + arrayBuffer
  - Save-temp-file IPC handler for edge cases
  - Updated will-navigate handler for file:// URLs

- ✅ **Toast Notification Bug**
  - Fixed auto-display issue in About dialog
  - Now shows only when email is copied

### 🔄 Auto-Update System
- ✅ **Differential Updates Enabled**
  - Downloads only changed files (5-10 MB instead of 100 MB)
  - No full reinstallation required
  - Faster update process
  - GitHub Releases integration

---

## 📥 Installation

### New Installation
Download `Kita PDF Reader-Setup-2.2.1.exe` and run it.

### Updating from v2.2.0
The app will automatically notify you about this update!
- Open your v2.2.0 app
- Wait 3 seconds → Toast notification appears
- Click "Update Now"
- **Only ~5-10 MB** will be downloaded (differential update)
- Click "Restart Now" after download completes

---

## 📊 Technical Details

### Files Modified
- ✅ `index.html` - About Dialog redesign
- ✅ `style.css` - Compact & responsive styles
- ✅ `renderer.js` - Auto-update check, email copy, drag & drop fix
- ✅ `main.js` - Sandbox configuration, IPC handlers
- ✅ `preload.js` - saveTempFile API
- ✅ `package.json` - v2.2.1, differentialPackage enabled
- ✅ `CHANGELOG.md` - v2.2.1 changelog

### Compatibility
- ✅ Windows 10/11 (x64)
- ✅ Auto-update from v2.2.0
- ✅ Differential updates supported

---

## 🔗 Links

- 📖 [Full Changelog](https://github.com/russianff13-crypto/PDF-Library/blob/main/CHANGELOG.md)
- 🐛 [Report Issues](https://github.com/russianff13-crypto/PDF-Library/issues)
- 📧 [Contact](mailto:samoutff22@gmail.com)

---

**Enjoy the enhanced experience! 🎉**

© 2025 Kita PDF Reader - All Rights Reserved
