# 📋 Changelog - Kita PDF Reader

## [2.2.0] - December 13, 2025

### ✨ New Features
- ✅ **Drag & Drop Support:** Drag PDF files directly into the app
  - Visual drop indicator with animated border
  - Automatic copy to BooksStorage
  - Success notifications
  - Support for multiple files at once
  - Detailed console logs for debugging

- ✅ **Default PDF Handler:** Open PDFs from Windows Explorer
  - Set Kita as default PDF viewer
  - Direct PDF opening from file system
  - Windows & macOS support
  - Pending file queue system

- ✅ **Per-PDF Dark Mode:** Individual dark mode settings
  - Each PDF remembers its own dark mode state
  - Automatic restoration when reopening
  - Black background in viewer content
  - Moon icon with golden active state
  - Smooth transitions

### 🔧 Bug Fixes
- ✅ **Duplicate Books Fixed:** No more duplicated entries
  - Removed duplicate `renderGrid()` call
  - Enhanced deduplication in initialization
  - Set-based duplicate detection
  - Clean library on startup

- ✅ **Loading Screen:** Fixed initialization hang
  - Removed redundant initialization code
  - Simplified startup sequence
  - Added `finally` block for reliability

### 🎨 UI/UX Improvements
- ✅ **Drop Zone Styling:** Beautiful drag & drop UI
  - Animated dashed border
  - Drop message with icon
  - Smooth CSS transitions
  - Toast notifications

- ✅ **Dark Mode Button:** Enhanced visual feedback
  - Moon icon (fa-moon)
  - Golden color when active (#ffd700)
  - Smooth hover effects

- ✅ **Viewer Background:** Better dark mode experience
  - Black background for PDF pages
  - Improved contrast
  - Eye-comfort optimization

### 📦 Technical Improvements
- ✅ **Code Cleanup:** Removed redundant code blocks
- ✅ **Console Logging:** Enhanced debugging messages
- ✅ **localStorage:** Better state persistence
- ✅ **Performance:** Optimized duplicate checks

---

## [2.0.1] - December 12, 2025

### 🔧 Bug Fixes
- ✅ **Auto-Update System:** Fixed dependency issues
  - Disabled ASAR compression for node_modules
  - Fixed `electron-updater` and `graceful-fs` errors
  - Improved update check error messages
  - Added friendly message when no releases available

### 📦 Build Improvements
- ✅ **NSIS Installer:** Fixed icon format requirements
  - Added proper `.ico` file support
  - Optimized build configuration
  - Reduced installer size to ~96 MB

### 🎯 Minor Improvements
- ✅ Better error handling for offline mode
- ✅ Improved GitHub integration
- ✅ Updated documentation

---

## [2.0.0] - December 12, 2025

### 🎨 Rebranding
- ✅ **New Name:** "Kitaku PDF Reader" (formerly PDF Library)
- ✅ **Custom Icons:** Added `icon.png` and `iconTrans.png`
- ✅ **Navbar:** Updated with transparent icon logo
- ✅ **Loading Screen:** Branded with Kitaku logo
- ✅ **Window Title:** Shows "Kitaku PDF Reader"
- ✅ **About Section:** Updated to v2.0.0

### 🐛 Major Fixes
- ✅ **Duplicate Prevention:** 5-layer protection system
  - Cleanup on start
  - Set-based checking (O(1) performance)
  - Final validation in sync
  - Protection in renderGrid()
  - Deduplication in checkAndSyncBooksStorage()

- ✅ **BooksStorage Auto-Create:** No more ENOENT errors
  - Auto-creates folder when deleted manually
  - Protection in 3 IPC handlers
  - Safe folder operations

- ✅ **Final Delete:** Books deleted permanently
  - New IPC handler: `delete-pdf-from-storage`
  - Physical file deletion from BooksStorage
  - No return after app restart

- ✅ **Auto-Filter Application:** Saved filter applies on start
  - `applySavedFilter()` function
  - Restores user preferences
  - Seamless experience

### ✨ New Features
- ✅ **Random Shuffle on Start:** Books shuffle then sort
  - Random first
  - Then applies saved filter
  - Fresh look every time

### 🔧 Technical Improvements
- ✅ **Performance:** Set-based operations (O(1) vs O(n))
- ✅ **Code Quality:** Clean, documented, maintainable
- ✅ **Git Integration:** Connected to GitHub
- ✅ **Documentation:** Complete guides in Arabic

### 📦 Package Updates
- ✅ **Name:** `kitaku-pdf-reader`
- ✅ **Product Name:** `Kitaku PDF Reader`
- ✅ **Version:** 2.0.0
- ✅ **Icon:** `icon.png` added

---

## [1.0.0] - December 2025

### 🎉 Initial Release
- ✅ PDF viewing with PDF.js
- ✅ BooksStorage system
- ✅ Dark theme UI
- ✅ Context menus
- ✅ Zoom controls
- ✅ Page navigation
- ✅ Auto-save reading position
- ✅ Smart filters (Date, Last Read, Random)
- ✅ Lazy loading
- ✅ Frameless window design

---

## 📝 Notes

### Upcoming Features (Planned)
- [ ] Auto-update system
- [ ] Export to Word/Text
- [ ] Advanced bookmarks
- [ ] Cloud sync
- [ ] Annotations support
- [ ] Search inside PDF
- [ ] Theme toggle (Light/Dark)

### Known Issues
- None reported in v2.0.0 ✅

---

**For more information, visit:** [GitHub Repository](https://github.com/russianff13-crypto/PDF-Library)
