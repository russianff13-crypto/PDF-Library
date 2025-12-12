// Import PDF.js
import * as pdfjsLib from './node_modules/pdfjs-dist/build/pdf.mjs';

// Set up worker
pdfjsLib.GlobalWorkerOptions.workerSrc = './node_modules/pdfjs-dist/build/pdf.worker.mjs';

const pdfGrid = document.getElementById('pdf-grid');
const readGrid = document.getElementById('read-grid');
const emptyState = document.getElementById('empty-state');
const emptyReadState = document.getElementById('empty-read-state');
const mainContainer = document.getElementById('main-container');

// ✅ Window Controls - زر X يعتمد على الحالة
document.getElementById('min-btn')?.addEventListener('click', () => window.electronAPI.minimize());
document.getElementById('max-btn')?.addEventListener('click', () => window.electronAPI.maximize());
document.getElementById('close-btn')?.addEventListener('click', () => {
    // إذا كان PDF مفتوح، أغلق PDF فقط (ارجع للواجهة الرئيسية)
    if (!viewerOverlay?.classList.contains('hidden')) {
        closeViewer();
    } else {
        // إذا كنا في الواجهة الرئيسية، أغلق البرنامج
        window.electronAPI.close();
    }
});

// Viewer Elements
const viewerOverlay = document.getElementById('viewer-overlay');
const closeViewerBtn = document.getElementById('close-viewer');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomResetBtn = document.getElementById('zoom-reset');
const currentPageSpan = document.getElementById('current-page');
const pageCountSpan = document.getElementById('page-count');
const zoomPercentSpan = document.getElementById('zoom-percent');
const viewerContent = document.getElementById('viewer-content');
const pdfPagesContainer = document.getElementById('pdf-pages-container');

// ✅ Ctrl+Scroll Zoom - تكبير/تصغير بالماوس
viewerContent?.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
        
        // تحقق من أن PDF مفتوح
        if (viewerOverlay && !viewerOverlay.classList.contains('hidden')) {
            if (e.deltaY < 0) {
                // Scroll up = Zoom in
                zoomIn();
            } else {
                // Scroll down = Zoom out
                zoomOut();
            }
        }
    }
}, { passive: false });

// Context Menus
const contextMenu = document.getElementById('context-menu');
const emptyContextMenu = document.getElementById('empty-context-menu');
let currentContextPdf = null;

// State
let pdfs = JSON.parse(localStorage.getItem('pdfs') || '[]');

// ✅ تنظيف التكرار عند بداية البرنامج
(function cleanDuplicatesOnStart() {
    const uniquePdfs = [];
    const seen = new Set();
    pdfs.forEach(p => {
        const fileName = p.path.split(/[\\/]/).pop().toLowerCase();
        if (!seen.has(fileName)) {
            uniquePdfs.push(p);
            seen.add(fileName);
        }
    });
    
    if (uniquePdfs.length !== pdfs.length) {
        console.log(`🧹 Cleaned ${pdfs.length - uniquePdfs.length} duplicates on startup`);
        pdfs = uniquePdfs;
        localStorage.setItem('pdfs', JSON.stringify(pdfs));
    }
})();
let pdfDoc = null;
let scale = 1.0;
let renderedPages = new Set();
let currentPdfPath = null;
let lastOpenedPdf = null; // ✅ آخر PDF تم فتحه للعودة إليه بـ Esc
let readingPositions = JSON.parse(localStorage.getItem('readingPositions') || '{}');
let savePositionInterval = null; // ✅ Auto-save interval
let scrollTimeout = null; // ✅ Scroll debounce timeout

// ✅ Free Zoom System - بدون حدود
const ZOOM_STEP = 0.2;        // مقدار التكبير/التصغير في كل مرة (20%)
const MIN_ZOOM = 0.2;         // الحد الأدنى للزوم (20% من الحجم الطبيعي)
const MAX_ZOOM = 5.0;         // الحد الأقصى للزوم (500% من الحجم الطبيعي)
let currentZoomMode = 'fitWidth'; // 'fitWidth', 'fitScreen', أو 'custom'

// Page navigation elements
const pageInfoDisplay = document.getElementById('page-info-display');
const pageInputContainer = document.getElementById('page-input-container');
const pageInput = document.getElementById('page-input');
const pageJumpBtn = document.getElementById('page-jump-btn');

// ✅ Navbar Page Counter (Top)
const navbarPageCounter = document.getElementById('navbar-page-counter');
const pageCounterDisplay = document.getElementById('page-counter-display');
const currentPageNavbar = document.getElementById('current-page');
const pageCountNavbar = document.getElementById('page-count');
const pageInputWrapper = document.getElementById('page-input-wrapper');
const navbarPageInput = document.getElementById('navbar-page-input');
const navbarGoBtn = document.getElementById('navbar-go-btn');

// Invert colors button (Dark Mode in PDF)
const invertColorsBtn = document.getElementById('invert-colors');
let pdfDarkModeSettings = JSON.parse(localStorage.getItem('pdfDarkModeSettings') || '{}');

// ✅ Sort State - Default: Date Added (Newest First)
let currentSort = localStorage.getItem('currentSort') || 'dateAdded';

// Initialize
(async () => {
    console.log('🚀 Starting PDF Library...');
    console.log(`📚 Initial pdfs.length = ${pdfs.length}`);
    
    try {
        await checkAndSyncBooksStorage();
        console.log(`📚 After sync: pdfs.length = ${pdfs.length}`);
        
        const savedFilter = currentSort;
        currentSort = 'random';
        sortPdfs();
        
        currentSort = savedFilter;
        applySavedFilter();
        await renderGrid();
        
        console.log('✅ PDF Library ready!');
    } catch (error) {
        console.error('❌ Error initializing app:', error);
        alert('Error loading application: ' + error.message);
    } finally {
        // ✅ دائماً أخفي Loading Screen
        hideInitialLoading();
    }
})();

// ✅ عرض Loading بسيط عند فحص BooksStorage
function showSyncLoading() {
    const mainContainer = document.getElementById('main-container');
    if (!mainContainer) return;
    
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'sync-loading';
    loadingDiv.innerHTML = `
        <div style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 20px 30px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 15px;
            z-index: 10000;
            border: 1px solid rgba(255, 255, 255, 0.2);
        ">
            <div style="
                width: 20px;
                height: 20px;
                border: 3px solid rgba(255, 255, 255, 0.3);
                border-top-color: white;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            "></div>
            <span style="color: white; font-size: 14px;">Checking library...</span>
        </div>
        <style>
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        </style>
    `;
    
    document.body.appendChild(loadingDiv);
}

// ✅ إخفاء Loading
function hideSyncLoading() {
    const loadingDiv = document.getElementById('sync-loading');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// ✅ إخفاء Initial Loading Screen
function hideInitialLoading() {
    const initialLoading = document.getElementById('initial-loading');
    if (initialLoading) {
        initialLoading.classList.add('fade-out');
        setTimeout(() => {
            initialLoading.remove();
        }, 500);
    }
}

// ✅ التحقق من الكتب في BooksStorage وإضافتها إلى المكتبة
async function checkAndSyncBooksStorage() {
    try {
        console.log('🔍 Checking BooksStorage for existing books...');
        console.log(`📚 Current pdfs array has ${pdfs.length} book(s) BEFORE sync`);
        
        // الحصول على قائمة الملفات من BooksStorage
        const storageBooks = await window.electronAPI.getBooksFromStorage();
        
        if (!storageBooks || storageBooks.length === 0) {
            console.log('📁 BooksStorage is empty');
            return;
        }
        
        console.log(`📚 Found ${storageBooks.length} book(s) in BooksStorage`);
        console.log(`📚 Current library has ${pdfs.length} book(s)`);
        
        // ✅ نظام تحقق قوي: إنشاء Set من أسماء الكتب الموجودة
        const existingBookNames = new Set();
        pdfs.forEach(p => {
            const fileName = p.path.split(/[\\/]/).pop().toLowerCase();
            existingBookNames.add(fileName);
        });
        
        console.log(`📋 Existing book names in Set: ${Array.from(existingBookNames).join(', ')}`);
        
        // إضافة الكتب المفقودة إلى المكتبة
        let addedCount = 0;
        for (const book of storageBooks) {
            const bookFileName = book.name.toLowerCase();
            
            // ✅ التحقق باستخدام Set (أسرع وأكثر دقة)
            if (!existingBookNames.has(bookFileName)) {
                pdfs.push({
                    path: book.path,
                    name: book.name,
                    read: false,
                    dateAdded: Date.now(),
                    addedAt: new Date().toISOString()
                });
                existingBookNames.add(bookFileName); // إضافة للـ Set لمنع التكرار
                addedCount++;
                console.log(`✅ Added missing book: ${book.name}`);
            } else {
                console.log(`⏩ Skipping duplicate book: ${book.name}`);
            }
        }
        
        if (addedCount > 0) {
            console.log(`📗 Added ${addedCount} missing book(s) to library`);
            console.log(`📚 Total books after sync: ${pdfs.length}`);
            localStorage.setItem('pdfs', JSON.stringify(pdfs));
            console.log('💾 Saved to localStorage');
        } else {
            console.log('✅ All books in storage are already in library');
        }
        
        // ✅ تحقق نهائي من عدم وجود تكرار
        const finalCheck = new Set();
        const duplicates = [];
        pdfs.forEach(p => {
            const fileName = p.path.split(/[\\/]/).pop().toLowerCase();
            if (finalCheck.has(fileName)) {
                duplicates.push(fileName);
            }
            finalCheck.add(fileName);
        });
        
        if (duplicates.length > 0) {
            console.error(`❌ DUPLICATES DETECTED: ${duplicates.join(', ')}`);
            // إزالة التكرار
            const uniquePdfs = [];
            const seen = new Set();
            pdfs.forEach(p => {
                const fileName = p.path.split(/[\\/]/).pop().toLowerCase();
                if (!seen.has(fileName)) {
                    uniquePdfs.push(p);
                    seen.add(fileName);
                }
            });
            pdfs = uniquePdfs;
            localStorage.setItem('pdfs', JSON.stringify(pdfs));
            console.log(`🔧 Fixed duplicates. New count: ${pdfs.length}`);
        } else {
            console.log('✅ No duplicates found - library is clean');
        }
        
    } catch (error) {
        console.error('❌ Error checking BooksStorage:', error);
    }
}

// ============================================
// SORT FUNCTIONALITY
// ============================================

// Sort dropdown functionality
const sortBtn = document.getElementById('sort-btn');
const sortMenu = document.getElementById('sort-menu');
const sortLabel = document.getElementById('sort-label');

sortBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    sortMenu?.classList.toggle('hidden');
});

// Close sort menu when clicking outside
document.addEventListener('click', (e) => {
    if (sortMenu && !sortMenu.classList.contains('hidden')) {
        if (!sortBtn?.contains(e.target) && !sortMenu.contains(e.target)) {
            sortMenu.classList.add('hidden');
        }
    }
});

// Sort items click handlers
document.querySelectorAll('.sort-item').forEach(item => {
    item.addEventListener('click', () => {
        const sortType = item.dataset.sort;
        
        // Update active state
        document.querySelectorAll('.sort-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        // Update label
        const labelText = item.querySelector('span').textContent;
        if (sortLabel) sortLabel.textContent = `Sort: ${labelText}`;
        
        // Save preference
        currentSort = sortType;
        localStorage.setItem('currentSort', sortType);
        
        // Re-render with new sort
        sortPdfs();
        (async () => {
            await renderGrid();
        })();
        
        // Close menu
        sortMenu?.classList.add('hidden');
    });
});

// Sort PDFs based on current sort type
function sortPdfs() {
    switch (currentSort) {
        case 'dateAdded':
            // Newest first (default)
            pdfs.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
            break;
            
        case 'lastRead':
            // Last read first (PDFs with reading positions)
            pdfs.sort((a, b) => {
                const aPos = readingPositions[a.path];
                const bPos = readingPositions[b.path];
                const aTime = aPos?.lastRead || 0;
                const bTime = bPos?.lastRead || 0;
                return bTime - aTime;
            });
            break;
            
        case 'oldest':
            // Oldest first
            pdfs.sort((a, b) => (a.dateAdded || 0) - (b.dateAdded || 0));
            break;
            
        case 'random':
            // Random shuffle
            for (let i = pdfs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pdfs[i], pdfs[j]] = [pdfs[j], pdfs[i]];
            }
            break;
    }
}

// ✅ تطبيق الفلتر المحفوظ عند بدء البرنامج
function applySavedFilter() {
    console.log(`🔄 Applying saved filter: ${currentSort}`);
    
    // ✅ تحديث واجهة الفلتر
    const activeItem = document.querySelector(`.sort-item[data-sort="${currentSort}"]`);
    if (activeItem) {
        // إزالة active من الكل
        document.querySelectorAll('.sort-item').forEach(i => i.classList.remove('active'));
        
        // إضافة active للمحدد
        activeItem.classList.add('active');
        
        // تحديث النص
        const labelText = activeItem.querySelector('span')?.textContent || 'Date Added (Newest)';
        if (sortLabel) {
            sortLabel.textContent = `Sort: ${labelText}`;
        }
    }
    
    // ✅ تطبيق الترتيب
    sortPdfs();
    
    console.log('✅ Filter applied successfully');
}

// Apply initial sort on load
sortPdfs();

// ============================================
// Settings & Offline Mode
// ============================================

// ============================================
// Settings & Theme System
// ============================================

// Settings Elements
const settingsBtn = document.getElementById('settings-btn');
const settingsMenu = document.getElementById('settings-menu');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const checkUpdateBtn = document.getElementById('check-update-btn');
const aboutBtn = document.getElementById('about-btn');
const aboutDialog = document.getElementById('about-dialog');
const updateDialog = document.getElementById('update-dialog');
const offlineIndicator = document.getElementById('offline-indicator');

// Online/Offline Status
let isOnline = navigator.onLine;

// ✅ Theme System - Default: Dark
let currentTheme = localStorage.getItem('theme') || 'dark';

function applyTheme(theme) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (theme === 'auto') {
        document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        document.body.setAttribute('data-theme', theme);
    }
    
    // Update active theme button
    document.querySelectorAll('.theme-option').forEach(btn => {
        if (btn.dataset.theme === theme) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    currentTheme = theme;
    localStorage.setItem('theme', theme);
    console.log(`🎨 Theme applied: ${theme}`);
}

// Theme selection buttons
document.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        applyTheme(theme);
    });
});

// Listen to system theme changes (for auto mode)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (currentTheme === 'auto') {
        document.body.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        console.log(`🎨 System theme changed: ${e.matches ? 'dark' : 'light'}`);
    }
});

// Initialize theme on startup
applyTheme(currentTheme);

// Initialize offline mode
initializeOfflineMode();

// Settings menu toggle
settingsBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsMenu?.classList.toggle('hidden');
});

closeSettingsBtn?.addEventListener('click', () => {
    settingsMenu?.classList.add('hidden');
});

// Close settings when clicking outside
document.addEventListener('click', (e) => {
    if (!settingsMenu?.contains(e.target) && e.target !== settingsBtn) {
        settingsMenu?.classList.add('hidden');
    }
});

// About button
aboutBtn?.addEventListener('click', () => {
    settingsMenu?.classList.add('hidden');
    aboutDialog?.classList.remove('hidden');
});

// Close about dialog
document.getElementById('close-about-btn')?.addEventListener('click', () => {
    aboutDialog?.classList.add('hidden');
});

// Check for updates
checkUpdateBtn?.addEventListener('click', async () => {
    settingsMenu?.classList.add('hidden');
    
    if (!isOnline) {
        showUpdateDialog('offline');
        return;
    }
    
    showUpdateDialog('checking');
    
    try {
        const result = await window.electronAPI.checkForUpdates();
        
        if (!result.success) {
            // رسالة خاصة إذا لم يوجد release على GitHub
            if (result.error && result.error.includes('404')) {
                showUpdateDialog('error', { 
                    error: 'No releases available yet. This is the latest development version (v2.0.1).' 
                });
            } else {
                showUpdateDialog('error', { error: result.error });
            }
            return;
        }
        
        if (result.updateAvailable) {
            showUpdateDialog('available', {
                currentVersion: result.currentVersion,
                latestVersion: result.latestVersion,
                releaseNotes: result.releaseNotes
            });
        } else {
            showUpdateDialog('up-to-date', {
                currentVersion: result.currentVersion
            });
        }
    } catch (error) {
        console.error('Update check error:', error);
        showUpdateDialog('error', { 
            error: 'No releases available yet. This is the latest development version (v2.0.1).' 
        });
    }
});

// Online/Offline detection
window.addEventListener('online', () => {
    isOnline = true;
    hideOfflineIndicator();
    console.log('✅ Online - App connected to internet');
});

window.addEventListener('offline', () => {
    isOnline = false;
    showOfflineIndicator();
    console.log('⚠️ Offline - App running in offline mode');
});

// Initialize offline mode
function initializeOfflineMode() {
    // Check initial online status
    if (!navigator.onLine) {
        showOfflineIndicator();
        console.log('📡 Starting in offline mode');
    }
    
    // All data is already cached in localStorage:
    // - pdfFiles
    // - readingPositions
    // - pdfHighlights
    console.log('💾 Offline data ready');
}

// Show offline indicator
function showOfflineIndicator() {
    offlineIndicator?.classList.remove('hidden');
}

// Hide offline indicator
function hideOfflineIndicator() {
    offlineIndicator?.classList.add('hidden');
}

// Show update dialog
function showUpdateDialog(status, data = {}) {
    if (!updateDialog) return;
    
    let content = '';
    
    switch(status) {
        case 'checking':
            content = `
                <div class="update-content">
                    <div class="update-spinner"></div>
                    <h3>Checking for updates...</h3>
                    <p>Please wait while we check for new versions.</p>
                </div>
            `;
            break;
            
        case 'available':
            content = `
                <div class="update-content">
                    <i class="fas fa-download update-icon"></i>
                    <h3>Update Available!</h3>
                    <p>Version <strong>${data.latestVersion}</strong> is now available.</p>
                    <p class="update-current">Current: ${data.currentVersion}</p>
                    <div class="update-actions">
                        <button id="download-update-btn" class="btn-primary">
                            <i class="fas fa-download"></i> Download Update
                        </button>
                        <button id="close-update-dialog-btn" class="btn-secondary">Later</button>
                    </div>
                </div>
            `;
            break;
              case 'downloading':
            const percent = Math.min(99, Math.round((data.percent || 0) * 10) / 10); // حد أقصى 99% وتقريب لرقم عشري واحد
            const speedMB = (data.speedMB || 0).toFixed(2);
            const downloadedMB = (data.downloadedMB || 0).toFixed(1);
            const totalMB = (data.totalMB || 0).toFixed(1);
            
            content = `
                <div class="update-content">
                    <i class="fas fa-cloud-download-alt update-icon pulse"></i>
                    <h3>Downloading Update...</h3>
                    <div class="download-progress-container">
                        <div class="download-progress-bar">
                            <div class="download-progress-fill" style="width: ${percent}%"></div>
                        </div>
                        <div class="download-stats">
                            <span class="download-percent">${percent}%</span>
                            <span class="download-size">${downloadedMB} MB / ${totalMB} MB</span>
                            <span class="download-speed">${speedMB} MB/s</span>
                        </div>
                    </div>
                    <p class="download-note">Please don't close the app while downloading...</p>
                </div>
            `;
            break;
            
        case 'downloaded':
            content = `
                <div class="update-content">
                    <i class="fas fa-check-circle update-icon success pulse"></i>
                    <h3>Update Downloaded!</h3>
                    <p>The update has been downloaded successfully.</p>
                    <p class="update-note">The app will restart now to install the update.</p>
                    <div class="update-actions">
                        <button id="install-update-btn" class="btn-primary">
                            <i class="fas fa-sync-alt"></i> Restart & Install
                        </button>
                    </div>
                    <div class="countdown-timer">Restarting in <span id="countdown">5</span> seconds...</div>
                </div>
            `;
            break;
            
        case 'up-to-date':
            content = `
                <div class="update-content">
                    <i class="fas fa-check-circle update-icon success"></i>
                    <h3>You're up to date!</h3>
                    <p>Version <strong>${data.currentVersion}</strong> is the latest version.</p>
                    <div class="update-actions">
                        <button id="close-update-dialog-btn" class="btn-primary">OK</button>
                    </div>
                </div>
            `;
            break;
            
        case 'offline':
            content = `
                <div class="update-content">
                    <i class="fas fa-wifi-slash update-icon error"></i>
                    <h3>No Internet Connection</h3>
                    <p>Unable to check for updates while offline.</p>
                    <p class="update-current">The app will work normally with your existing library.</p>
                    <div class="update-actions">
                        <button id="close-update-dialog-btn" class="btn-primary">OK</button>
                    </div>
                </div>
            `;
            break;
            
        case 'error':
            content = `
                <div class="update-content">
                    <i class="fas fa-exclamation-circle update-icon error"></i>
                    <h3>Update Check Failed</h3>
                    <p>${data.error || 'Unable to check for updates. Please try again later.'}</p>
                    <div class="update-actions">
                        <button id="close-update-dialog-btn" class="btn-primary">OK</button>
                    </div>
                </div>
            `;
            break;
    }
    
    updateDialog.innerHTML = content;
    updateDialog.classList.remove('hidden');
    
    // Event listeners
    const closeBtn = document.getElementById('close-update-dialog-btn');
    closeBtn?.addEventListener('click', () => {
        updateDialog.classList.add('hidden');
    });
    
    const downloadBtn = document.getElementById('download-update-btn');
    downloadBtn?.addEventListener('click', async () => {
        downloadBtn.disabled = true;
        showUpdateDialog('downloading', { percent: 0, downloadedMB: 0, totalMB: 0, speedMB: 0 });
        
        const result = await window.electronAPI.downloadUpdate();
        if (!result.success) {
            showUpdateDialog('error', { error: result.error });
        }
    });
    
    const installBtn = document.getElementById('install-update-btn');
    if (installBtn) {
        installBtn.addEventListener('click', () => {
            window.electronAPI.installUpdate();
        });
        
        // ✅ عد تنازلي تلقائي 5 ثوان
        let countdown = 5;
        const countdownEl = document.getElementById('countdown');
        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdownEl) countdownEl.textContent = countdown;
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                window.electronAPI.installUpdate();
            }
        }, 1000);
    }
}

// ✅ استقبال events من main process

// عند توفر تحديث
window.electronAPI.onUpdateAvailable((info) => {
    console.log('✅ Update available:', info);
    const currentVersion = '2.0.2'; // النسخة الحالية
    showUpdateDialog('available', {
        currentVersion: currentVersion,
        latestVersion: info.version,
        releaseNotes: info.releaseNotes
    });
});

// ✅ عند تقدم التحميل
window.electronAPI.onDownloadProgress((progress) => {
    // البيانات تأتي جاهزة من main.js
    showUpdateDialog('downloading', {
        percent: progress.percent,
        speedMB: progress.speedMB,
        downloadedMB: progress.downloadedMB,
        totalMB: progress.totalMB
    });
});

// ✅ عند اكتمال التحميل
window.electronAPI.onUpdateDownloaded(() => {
    showUpdateDialog('downloaded');
});

// ✅ Scroll listener for updating current page continuously
viewerContent?.addEventListener('scroll', updateCurrentPage);

// ✅ Update current page on animation frame for smoother updates
let rafId = null;
function smoothUpdateCurrentPage() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
        updateCurrentPage();
        rafId = null;
    });
}
viewerContent?.addEventListener('scroll', smoothUpdateCurrentPage);

// ✅ Navbar Page Counter Event Listeners
navbarPageCounter?.addEventListener('click', () => {
    pageCounterDisplay.style.display = 'none';
    pageInputWrapper?.classList.remove('hidden');
    pageInputWrapper?.classList.add('active');
    if (navbarPageInput) {
        navbarPageInput.value = currentPageNavbar.textContent;
        navbarPageInput.max = pageCountNavbar.textContent;
        setTimeout(() => navbarPageInput.focus(), 50);
    }
});

navbarGoBtn?.addEventListener('click', jumpToPageFromNavbar);
navbarPageInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        jumpToPageFromNavbar();
    }
});

// Hide input when clicking outside
document.addEventListener('click', (e) => {
    if (navbarPageCounter && !navbarPageCounter.contains(e.target)) {
        pageInputWrapper?.classList.remove('active');
        pageInputWrapper?.classList.add('hidden');
        if (pageCounterDisplay) pageCounterDisplay.style.display = 'flex';
    }
});

// Hide context menus on click outside
document.addEventListener('click', (e) => {
    // ✅ لا تخفي إذا كان النقر داخل الـ context menu نفسه
    if (contextMenu && !contextMenu.contains(e.target) && !e.target.closest('.pdf-card')) {
        contextMenu?.classList.add('hidden');
    }
    if (emptyContextMenu && !emptyContextMenu.contains(e.target)) {
        emptyContextMenu?.classList.add('hidden');
    }
});

// Empty space context menu - ✅ يظهر في أي مكان فارغ
mainContainer?.addEventListener('contextmenu', (e) => {
    // ✅ Check if clicked on empty space or header
    const target = e.target;
    const isEmptySpace = 
        target === mainContainer || 
        target === pdfGrid || 
        target === readGrid || 
        target === emptyState ||
        target === emptyReadState ||
        target.closest('.empty-state') || 
        target.closest('.section-title') || 
        target.classList.contains('library-header') ||
        target.closest('.library-header') ||
        target === document.querySelector('header') ||
        target === document.querySelector('header h1');
    
    // ✅ أو إذا لم يكن النقر على بطاقة PDF
    const isNotOnCard = !target.closest('.pdf-card');
    
    if (isEmptySpace || (isNotOnCard && target.closest('#main-container'))) {
        e.preventDefault();
        contextMenu?.classList.add('hidden');
        emptyContextMenu.style.left = e.pageX + 'px';
        emptyContextMenu.style.top = e.pageY + 'px';
        emptyContextMenu.classList.remove('hidden');
        console.log('✅ Empty context menu opened');
    }
});

// ✅ Double Click في مكان فارغ = فتح ملف
mainContainer?.addEventListener('dblclick', (e) => {
    const target = e.target;
    const isEmptySpace = 
        target === mainContainer || 
        target === pdfGrid || 
        target === readGrid || 
        target === emptyState ||
        target === emptyReadState ||
        target.closest('.empty-state') || 
        target.closest('.section-title') || 
        target.classList.contains('library-header') ||
        target.closest('.library-header') ||
        target === document.querySelector('header') ||
        target === document.querySelector('header h1');
    
    const isNotOnCard = !target.closest('.pdf-card');
    
    if (isEmptySpace || (isNotOnCard && target.closest('#main-container'))) {
        console.log('✅ Double click on empty space - opening file dialog');
        addPdfFiles();
    }
});

// Add PDF from empty context menu
document.getElementById('ctx-add-pdf')?.addEventListener('click', async () => {
    emptyContextMenu?.classList.add('hidden');
    await addPdfFiles();
});

// ✅ Open Storage Folder
document.getElementById('ctx-open-storage')?.addEventListener('click', () => {
    emptyContextMenu?.classList.add('hidden');
    window.electronAPI.openStorageFolder();
    console.log('📂 Opening BooksStorage folder...');
});

// Context menu actions
document.getElementById('ctx-rename')?.addEventListener('click', () => {
    openRenameModal(currentContextPdf);
    contextMenu.classList.add('hidden');
});

document.getElementById('ctx-mark-read')?.addEventListener('click', () => {
    currentContextPdf.read = !currentContextPdf.read;
    saveAndRender();
    contextMenu.classList.add('hidden');
});

document.getElementById('ctx-delete')?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete this file?')) {
        try {
            // ✅ حذف الملف من BooksStorage
            await window.electronAPI.deletePdfFromStorage(currentContextPdf.path);
            console.log(`🗑️ Deleted book: ${currentContextPdf.name}`);
            
            // ✅ حذف من المصفوفة
            pdfs = pdfs.filter(p => p.path !== currentContextPdf.path);
            
            await saveAndRender();
        } catch (error) {
            console.error('❌ Error deleting book:', error);
            alert('Failed to delete the book. Please try again.');
        }
    }
    contextMenu.classList.add('hidden');
});

// Function to add PDF files
async function addPdfFiles() {
    try {
        const filePaths = await window.electronAPI.selectPdf();
        if (filePaths && filePaths.length > 0) {
            for (const originalPath of filePaths) {
                // ✅ نسخ الكتاب إلى BooksStorage
                console.log(`📚 Copying book to storage: ${originalPath}`);
                const storagePath = await window.electronAPI.copyPdfToStorage(originalPath);
                
                // ✅ التحقق من أن الكتاب غير موجود
                if (!pdfs.some(p => p.path === storagePath)) {
                    const name = storagePath.split(/[\\/]/).pop();
                    pdfs.push({
                        path: storagePath, // ✅ استخدام المسار الجديد في BooksStorage
                        name,
                        read: false,
                        dateAdded: Date.now(),
                        addedAt: new Date().toISOString()
                    });
                    console.log(`✅ Book added to library: ${name}`);
                }
            }
            saveAndRender();
        }
    } catch (error) {
        console.error('Error selecting PDF:', error);
        alert('Failed to add PDF: ' + error.message);
    }
}

// Event Listeners
closeViewerBtn?.addEventListener('click', closeViewer);

// ✅ Window Controls في الـ Viewer Navbar
const viewerMinBtn = document.getElementById('viewer-min-btn');
const viewerMaxBtn = document.getElementById('viewer-max-btn');

viewerMinBtn?.addEventListener('click', () => {
    window.electronAPI.minimize();
});

viewerMaxBtn?.addEventListener('click', () => {
    window.electronAPI.maximize();
});

zoomInBtn?.addEventListener('click', () => zoomIn());
zoomOutBtn?.addEventListener('click', () => zoomOut());
zoomResetBtn?.addEventListener('click', () => resetZoom());

// Page navigation
pageInfoDisplay?.addEventListener('click', togglePageInput);
pageJumpBtn?.addEventListener('click', jumpToPage);
pageInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') jumpToPage();
});

// Invert colors
invertColorsBtn?.addEventListener('click', toggleInvertColors);

// ============================================
// PDF OPERATIONS
// ============================================

async function saveAndRender() {
    localStorage.setItem('pdfs', JSON.stringify(pdfs));
    await renderGrid();
}

async function renderGrid() {
    if (!pdfGrid || !readGrid) return;
    
    console.log(`🎨 renderGrid() called - pdfs.length = ${pdfs.length}`);
    
    pdfGrid.innerHTML = '';
    readGrid.innerHTML = '';
    
    // ✅ إزالة التكرار قبل الرسم (طبقة حماية إضافية)
    const uniquePdfs = [];
    const seen = new Set();
    pdfs.forEach(p => {
        const fileName = p.path.split(/[\\/]/).pop().toLowerCase();
        if (!seen.has(fileName)) {
            uniquePdfs.push(p);
            seen.add(fileName);
        } else {
            console.warn(`⚠️ Removing duplicate in renderGrid: ${p.name}`);
        }
    });
    
    if (uniquePdfs.length !== pdfs.length) {
        console.log(`🔧 Removed ${pdfs.length - uniquePdfs.length} duplicates in renderGrid`);
        pdfs = uniquePdfs;
        localStorage.setItem('pdfs', JSON.stringify(pdfs));
    }
    
    // ✅ التحقق من وجود الكتب وإزالة المفقودة
    const validPdfs = [];
    for (const pdf of uniquePdfs) {
        const exists = await window.electronAPI.checkFileExists(pdf.path);
        if (exists) {
            validPdfs.push(pdf);
        } else {
            console.warn(`⚠️ Book not found, removing: ${pdf.name}`);
        }
    }
    
    // ✅ تحديث القائمة إذا تم حذف أي كتاب
    if (validPdfs.length !== uniquePdfs.length) {
        pdfs = validPdfs;
        localStorage.setItem('pdfs', JSON.stringify(pdfs));
    }
    
    console.log(`✅ Final books to render: ${validPdfs.length}`);
    
    const unreadPdfs = validPdfs.filter(p => !p.read);
    const readPdfs = validPdfs.filter(p => p.read);
    
    if (unreadPdfs.length === 0) {
        emptyState?.classList.remove('hidden');
    } else {
        emptyState?.classList.add('hidden');
        unreadPdfs.forEach(pdf => {
            const card = createPdfCard(pdf);
            pdfGrid.appendChild(card);
        });
    }
    
    const readSection = document.getElementById('read-section');
    if (readPdfs.length === 0) {
        readSection?.classList.add('hidden');
    } else {
        readSection?.classList.remove('hidden');
        emptyReadState?.classList.add('hidden');
        readPdfs.forEach(pdf => {
            const card = createPdfCard(pdf);
            readGrid.appendChild(card);
        });
    }
}

function createPdfCard(pdf) {
    const card = document.createElement('div');
    card.className = 'pdf-card';
    card.title = pdf.name;

    const thumbContainer = document.createElement('div');
    thumbContainer.className = 'thumbnail-container';
    
    // A4 aspect ratio: 210mm × 297mm = 1:1.414
    const canvas = document.createElement('canvas');
    canvas.width = 420;  // A4 width
    canvas.height = 594; // A4 height (420 * 1.414)
    thumbContainer.appendChild(canvas);

    const info = document.createElement('div');
    info.className = 'card-info';
    
    const title = document.createElement('div');
    title.className = 'pdf-title';
    title.textContent = pdf.name.replace('.pdf', '');
    
    info.appendChild(title);
    
    card.appendChild(thumbContainer);
    card.appendChild(info);

    // Generate thumbnail asynchronously
    generateThumbnail(pdf.path, canvas);

    card.addEventListener('click', (e) => {
        if (e.button === 0) {
            openViewer(pdf.path);
        }
    });
    
    card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        currentContextPdf = pdf;
        
        const markReadBtn = document.getElementById('ctx-mark-read');
        if (markReadBtn) {
            const icon = markReadBtn.querySelector('i');
            const text = markReadBtn.querySelector('span');
            if (pdf.read) {
                icon.className = 'fas fa-book-open ctx-icon';
                text.textContent = 'Mark as Unread';
            } else {
                icon.className = 'fas fa-check ctx-icon';
                text.textContent = 'Mark as Read';
            }
        }
        
        if (contextMenu) {
            contextMenu.style.left = e.pageX + 'px';
            contextMenu.style.top = e.pageY + 'px';
            contextMenu.classList.remove('hidden');
        }
    });

    return card;
}

async function generateThumbnail(filePath, canvas) {
    const ctx = canvas.getContext('2d');
    
    // Show loading state
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    try {
        if (typeof pdfjsLib === 'undefined') {
            console.error('PDF.js library not loaded');
            throw new Error('PDF.js library not loaded');
        }
        
        console.log('Reading PDF:', filePath);
        const buffer = await window.electronAPI.readPdf(filePath);
        
        if (!buffer || buffer.byteLength === 0) {
            console.error('Empty buffer received for:', filePath);
            throw new Error('Empty buffer received');
        }
        
        console.log('Buffer size:', buffer.byteLength);
        const data = new Uint8Array(buffer);

        const loadingTask = pdfjsLib.getDocument({
            data: data,
            cMapUrl: './node_modules/pdfjs-dist/cmaps/',
            cMapPacked: true,
            standardFontDataUrl: './node_modules/pdfjs-dist/standard_fonts/'
        });
        
        console.log('Loading PDF document...');
        const pdf = await loadingTask.promise;
        console.log('PDF loaded, pages:', pdf.numPages);
        
        const page = await pdf.getPage(1);
        console.log('First page loaded');
        
        // ✅ ملء الغلاف بالكامل - استخدام object-fit: cover
        const viewport = page.getViewport({ scale: 1.0 });
        const scale = Math.max(canvas.width / viewport.width, canvas.height / viewport.height);
        const scaledViewport = page.getViewport({ scale });
        
        // ✅ حساب الموقع لتوسيط الصفحة (crop من الأعلى/الأسفل أو اليسار/اليمين)
        // ✅ حساب الموقع لتوسيط الصفحة (crop من الأعلى/الأسفل أو اليسار/اليمين)
        const xOffset = (canvas.width - scaledViewport.width) / 2;
        const yOffset = (canvas.height - scaledViewport.height) / 2;
        
        // ✅ مسح Canvas بخلفية شفافة (بدون gradient)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(xOffset, yOffset);

        const renderContext = {
            canvasContext: ctx,
            viewport: scaledViewport,
            background: 'transparent'
        };
        
        console.log('Rendering page...');
        await page.render(renderContext).promise;
        console.log('Page rendered successfully');
        ctx.restore();
        
    } catch (error) {
        console.error('Error generating thumbnail for', filePath, ':', error);
        
        // Show error state with better styling
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(1, '#0d0d0d');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw PDF icon using simple shapes
        ctx.fillStyle = '#333';
        ctx.fillRect(canvas.width / 2 - 30, canvas.height / 2 - 40, 60, 70);
        ctx.fillStyle = '#444';
        ctx.fillRect(canvas.width / 2 - 25, canvas.height / 2 - 30, 50, 10);
        ctx.fillRect(canvas.width / 2 - 25, canvas.height / 2 - 15, 50, 10);
        ctx.fillRect(canvas.width / 2 - 25, canvas.height / 2, 50, 10);
        
        // Draw text
        ctx.fillStyle = '#666';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PDF Preview', canvas.width / 2, canvas.height / 2 + 50);
    }
}

async function openViewer(filePath) {
    try {
        console.log('Opening PDF viewer for:', filePath);
        
        // Save current PDF path
        currentPdfPath = filePath;
        lastOpenedPdf = filePath; // ✅ حفظ آخر PDF للعودة إليه بـ Esc
        
        // ✅ إخفاء title-bar الرئيسي عند فتح PDF
        const titleBar = document.getElementById('title-bar');
        if (titleBar) titleBar.style.display = 'none';
        
        if (typeof pdfjsLib === 'undefined') {
            alert('PDF.js library not loaded. Please refresh the application.');
            console.error('PDF.js not loaded');
            return;
        }
        
        // Show viewer and loading screen
        viewerOverlay?.classList.remove('hidden');
        const loadingScreen = document.getElementById('loading-screen');
        const progressBar = document.getElementById('progress-bar');
        const loadingCurrent = document.getElementById('loading-current');
        const loadingTotal = document.getElementById('loading-total');
        
        if (loadingScreen) loadingScreen.classList.remove('hidden');
        if (progressBar) progressBar.style.width = '0%';
        
        console.log('Reading PDF file...');
        const buffer = await window.electronAPI.readPdf(filePath);
        
        if (!buffer || buffer.byteLength === 0) {
            throw new Error('Failed to read PDF file');
        }
        
        console.log('Buffer received, size:', buffer.byteLength);
        const data = new Uint8Array(buffer);
        
        if (progressBar) progressBar.style.width = '20%';
        
        console.log('Loading PDF document...');
        const loadingTask = pdfjsLib.getDocument({
            data: data,
            cMapUrl: './node_modules/pdfjs-dist/cmaps/',
            cMapPacked: true,
            standardFontDataUrl: './node_modules/pdfjs-dist/standard_fonts/'
        });
        
        pdfDoc = await loadingTask.promise;
        console.log('PDF loaded successfully. Pages:', pdfDoc.numPages);
        
        if (progressBar) progressBar.style.width = '40%';
        if (loadingTotal) loadingTotal.textContent = pdfDoc.numPages;
        
        if (pageCountSpan) pageCountSpan.textContent = pdfDoc.numPages;
        if (currentPageSpan) currentPageSpan.textContent = '1';
        
        // ✅ تحديث عداد الـ Navbar العلوي
        if (pageCountNavbar) pageCountNavbar.textContent = pdfDoc.numPages;
        if (currentPageNavbar) currentPageNavbar.textContent = '1';
        
        // ✅ تهيئة الزوم: البداية بـ Fit to Width
        scale = getFitToWidthScale();
        currentZoomMode = 'fitWidth';
        updateZoomDisplay();
        
        console.log('Rendering all pages with scale:', scale);
        await renderAllPages(progressBar, loadingCurrent, loadingTotal);
        
        // Hide loading screen with animation
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                
                // Wait for fade out animation
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 300);
                  // Restore reading position after everything is loaded
                restoreReadingPosition();
                
                // ✅ تطبيق Dark Mode المحفوظ لهذا PDF
                applyPdfDarkMode();
                
                // Start auto-save
                startAutoSave();
            }, 300);
        }
        
    } catch (error) {
        console.error('Error opening PDF:', error);
        alert('Failed to open PDF: ' + error.message);
        viewerOverlay?.classList.add('hidden');
    }
}

async function renderAllPages(progressBar, loadingCurrent, loadingTotal) {
    if (!pdfDoc || !pdfPagesContainer) return;
    
    // Clear container
    pdfPagesContainer.innerHTML = '';
    renderedPages.clear();
    
    const totalPages = pdfDoc.numPages;
    const initialLoadCount = Math.min(3, totalPages); // Load first 3 pages only
    
    // ✅ احسب العرض والارتفاع الدقيق من أول صفحة
    let defaultWidth = 0;
    let defaultHeight = 0;
    
    if (totalPages > 0) {
        try {
            const firstPage = await pdfDoc.getPage(1);
            const viewport = firstPage.getViewport({ scale: scale });
            defaultWidth = viewport.width;
            defaultHeight = viewport.height;
            console.log(`📏 Default page size: ${defaultWidth}x${defaultHeight} (scale: ${scale})`);
        } catch (error) {
            console.error('Error calculating default page size:', error);
            // استخدم ارتفاع افتراضي بناءً على نسبة A4
            const containerWidth = viewerContent.clientWidth - 100;
            defaultWidth = containerWidth;
            defaultHeight = containerWidth * 1.414; // نسبة A4
        }
    }
    
    // Create placeholders for all pages with exact dimensions
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const pageContainer = document.createElement('div');
        pageContainer.className = 'pdf-page loading';
        pageContainer.id = `page-${pageNum}`;
        pageContainer.dataset.pageNum = pageNum;
        
        // ✅ تعيين العرض والارتفاع الدقيق (مثل الصفحة المحملة)
        if (defaultWidth > 0 && defaultHeight > 0) {
            pageContainer.style.width = `${defaultWidth}px`;
            pageContainer.style.height = `${defaultHeight}px`;
            pageContainer.style.minHeight = `${defaultHeight}px`;
        }
        
        pdfPagesContainer.appendChild(pageContainer);
    }
    
    // Render only first 3 pages initially for fast loading
    for (let pageNum = 1; pageNum <= initialLoadCount; pageNum++) {
        await renderPage(pageNum);
        
        // Update progress (40% to 100% for initial pages)
        const progress = 40 + (pageNum / initialLoadCount) * 60;
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (loadingCurrent) loadingCurrent.textContent = pageNum;
    }
    
    // Set up Intersection Observer for lazy loading remaining pages
    setupLazyLoading();
}

// Lazy Loading Setup
let lazyLoadObserver = null; // ✅ حفظ الـ observer للاستخدام لاحقاً

function setupLazyLoading() {
    if (!pdfDoc || !pdfPagesContainer) return;
    
    // ✅ إزالة الـ observer القديم إن وُجد
    if (lazyLoadObserver) {
        lazyLoadObserver.disconnect();
    }
    
    const options = {
        root: viewerContent,
        rootMargin: '2000px', // ✅ زيادة المسافة للصفحات البعيدة
        threshold: 0.01
    };
    
    lazyLoadObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const pageContainer = entry.target;
                const pageNum = parseInt(pageContainer.dataset.pageNum);
                
                // ✅ Render page if not already rendered
                if (!renderedPages.has(pageNum) && pageContainer.classList.contains('loading')) {
                    console.log(`📄 Lazy loading page ${pageNum}`);
                    renderPage(pageNum).then(() => {
                        // ✅ Stop observing after successful render
                        lazyLoadObserver.unobserve(pageContainer);
                    });
                }
            }
        });
    }, options);
    
    // Observe all unrendered pages
    const totalPages = pdfDoc.numPages;
    const initialLoadCount = Math.min(3, totalPages);
    
    for (let pageNum = initialLoadCount + 1; pageNum <= totalPages; pageNum++) {
        const pageContainer = document.getElementById(`page-${pageNum}`);
        if (pageContainer && pageContainer.classList.contains('loading')) {
            lazyLoadObserver.observe(pageContainer);
        }
    }
    
    console.log(`🔍 Lazy loading setup for ${totalPages - initialLoadCount} pages`);
}

async function renderPage(pageNum) {
    if (!pdfDoc) return;
    
    const pageContainer = document.getElementById(`page-${pageNum}`);
    if (!pageContainer) return;
    
    // If already rendering this page, skip
    if (pageContainer.dataset.rendering === 'true') return;
    
    pageContainer.dataset.rendering = 'true';
    
    try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Set canvas size to actual viewport size - NO LIMITS!
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Set inline styles to ensure canvas displays at full size
        canvas.style.maxWidth = 'none';
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Remove loading class and add canvas
        pageContainer.classList.remove('loading');
        pageContainer.innerHTML = '';
        
        // ✅ إزالة minHeight بعد التحميل
        pageContainer.style.minHeight = '';
        
        // ✅ إعادة تعيين data-page-num
        pageContainer.dataset.pageNum = pageNum;
        
        pageContainer.appendChild(canvas);
        
        // Add page number overlay
        const pageNumber = document.createElement('div');
        pageNumber.className = 'page-number';
        pageNumber.textContent = `Page ${pageNum}`;
        pageContainer.appendChild(pageNumber);
        
        renderedPages.add(pageNum);
        pageContainer.dataset.rendering = 'false';
        
    } catch (error) {
        console.error(`Error rendering page ${pageNum}:`, error);
        pageContainer.classList.remove('loading');
        pageContainer.innerHTML = `<p style="color: #666; text-align: center; padding: 2rem;">Error loading page ${pageNum}</p>`;
        pageContainer.dataset.rendering = 'false';
    }
}

async function reRenderAllPages() {
    if (!pdfDoc || !pdfPagesContainer) return;
    
    // Save current scroll position and center point
    const scrollTop = viewerContent.scrollTop;
    const scrollLeft = viewerContent.scrollLeft;
    const centerY = scrollTop + (viewerContent.clientHeight / 2);
    const centerX = scrollLeft + (viewerContent.clientWidth / 2);
    
    // Get old dimensions
    const oldHeight = pdfPagesContainer.scrollHeight;
    const oldWidth = pdfPagesContainer.scrollWidth;
    
    // ✅ Get visible pages only (في viewport الحالي)
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + viewerContent.clientHeight;
    const visiblePageNums = [];
    
    Array.from(renderedPages).forEach(pageNum => {
        const pageEl = document.getElementById(`page-${pageNum}`);
        if (pageEl) {
            const rect = pageEl.getBoundingClientRect();
            const pageTop = pageEl.offsetTop;
            const pageBottom = pageTop + pageEl.offsetHeight;
            
            // Check if page is in viewport
            if (pageBottom > viewportTop && pageTop < viewportBottom) {
                visiblePageNums.push(pageNum);
            }
        }
    });
    
    // ✅ Re-render only visible pages (بدون loading indicator)
    for (const pageNum of visiblePageNums) {
        const pageContainer = document.getElementById(`page-${pageNum}`);
        if (pageContainer && !pageContainer.classList.contains('loading')) {
            // ✅ لا نضيف 'loading' class - نتجنب عرض "Loading..."
            pageContainer.innerHTML = '';
            await renderPage(pageNum);
        }
    }
    
    // Calculate new scroll position to maintain center point
    requestAnimationFrame(() => {
        const newHeight = pdfPagesContainer.scrollHeight;
        const newWidth = pdfPagesContainer.scrollWidth;
        
        const scaleRatio = newHeight / oldHeight;
        const newScrollTop = (centerY * scaleRatio) - (viewerContent.clientHeight / 2);
        const newScrollLeft = (centerX * scaleRatio) - (viewerContent.clientWidth / 2);
        
        viewerContent.scrollTop = Math.max(0, newScrollTop);
        viewerContent.scrollLeft = Math.max(0, newScrollLeft);
    });
    
    // Setup lazy loading again for unrendered pages
    setupLazyLoading();
}

function updateCurrentPage() {
    if (!viewerContent || !pdfDoc) return;
    
    const pages = pdfPagesContainer?.querySelectorAll('.pdf-page');
    
    if (!pages || pages.length === 0) return;
    
    let currentPage = 1;
    let closestPage = null;
    let smallestDistance = Infinity;
    
    const containerRect = viewerContent.getBoundingClientRect();
    const viewportCenter = containerRect.top + containerRect.height / 2;
    
    // ✅ البحث عن الصفحة الأقرب لمركز الشاشة
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const rect = page.getBoundingClientRect();
        
        // حساب مركز الصفحة
        const pageCenter = rect.top + rect.height / 2;
        const distance = Math.abs(pageCenter - viewportCenter);
        
        // ✅ اختر الصفحة الأقرب
        if (distance < smallestDistance) {
            smallestDistance = distance;
            closestPage = parseInt(page.dataset.pageNum) || (i + 1);
        }
        
        // ✅ إذا كانت الصفحة تحتوي على المركز تماماً، اختارها مباشرة
        if (rect.top <= viewportCenter && rect.bottom >= viewportCenter) {
            currentPage = parseInt(page.dataset.pageNum) || (i + 1);
            closestPage = null; // لا حاجة للبديل
            break;
        }
    }
    
    // ✅ استخدم الصفحة الأقرب إذا لم توجد صفحة مباشرة
    if (closestPage !== null) {
        currentPage = closestPage;
    }
    
    // ✅ تحديث رقم الصفحة في الواجهة
    if (currentPageSpan) {
        currentPageSpan.textContent = currentPage;
    }
    
    // ✅ تحديث رقم الصفحة في الـ Navbar العلوي
    if (currentPageNavbar) {
        currentPageNavbar.textContent = currentPage;
    }
    
    // ✅ تحديث قيمة input أيضاً إذا كان مفتوحاً
    if (pageInput && pageInputContainer?.classList.contains('active')) {
        pageInput.value = currentPage;
    }
    
    // ✅ تحديث navbar input إذا كان مفتوحاً
    if (navbarPageInput && pageInputWrapper?.classList.contains('active')) {
        navbarPageInput.value = currentPage;
    }
}

// ============================================
// Zoom Functions - Free Zoom System (بدون حدود)
// ============================================

function zoomIn() {
    if (!viewerContent || !pdfPagesContainer || !pdfDoc) return;
    
    // ✅ حفظ الموقع الحالي
    const currentPageData = getCurrentPageAndOffset();
    
    // ✅ التكبير بمقدار ثابت
    scale = Math.min(scale + ZOOM_STEP, MAX_ZOOM);
    currentZoomMode = 'custom'; // تحويل للوضع المخصص
    
    console.log(`🔍 Zoom In: ${(scale * 100).toFixed(0)}%`);
    
    updateZoomDisplay();
    reRenderAllPages();
    
    // ✅ استعادة الموقع
    waitForPagesToRender().then(() => {
        restorePagePosition(currentPageData);
    });
}

function zoomOut() {
    if (!viewerContent || !pdfPagesContainer || !pdfDoc) return;
    
    // ✅ حفظ الموقع الحالي
    const currentPageData = getCurrentPageAndOffset();
    
    // ✅ التصغير بمقدار ثابت
    scale = Math.max(scale - ZOOM_STEP, MIN_ZOOM);
    currentZoomMode = 'custom'; // تحويل للوضع المخصص
    
    console.log(`🔍 Zoom Out: ${(scale * 100).toFixed(0)}%`);
    
    updateZoomDisplay();
    reRenderAllPages();
    
    // ✅ استعادة الموقع
    waitForPagesToRender().then(() => {
        restorePagePosition(currentPageData);
    });
}

function resetZoom() {
    setZoomToFitWidth();
}

// ✅ دالة جديدة: ضبط الزوم لملء العرض
function setZoomToFitWidth() {
    if (!viewerContent || !pdfPagesContainer || !pdfDoc) return;
    
    const currentPageData = getCurrentPageAndOffset();
    
    scale = getFitToWidthScale();
    currentZoomMode = 'fitWidth';
    
    console.log(`🔍 Zoom: Fit to Width (${(scale * 100).toFixed(0)}%)`);
    
    updateZoomDisplay();
    reRenderAllPages();
    
    waitForPagesToRender().then(() => {
        restorePagePosition(currentPageData);
    });
}

// ✅ دالة جديدة: ضبط الزوم لملء الشاشة
function setZoomToFitScreen() {
    if (!viewerContent || !pdfPagesContainer || !pdfDoc) return;
    
    const currentPageData = getCurrentPageAndOffset();
    
    scale = getFitToScreenScale();
    currentZoomMode = 'fitScreen';
    
    console.log(`🔍 Zoom: Fit to Screen (${(scale * 100).toFixed(0)}%)`);
    
    updateZoomDisplay();
    reRenderAllPages();
    
    waitForPagesToRender().then(() => {
        restorePagePosition(currentPageData);
    });
}

// ✅ وظيفة جديدة: حفظ رقم الصفحة الحالية والموقع داخلها
function getCurrentPageAndOffset() {
    if (!viewerContent || !pdfPagesContainer) return { pageNum: 1, offsetRatio: 0 };
    
    const viewerRect = viewerContent.getBoundingClientRect();
    const viewerCenterY = viewerRect.top + (viewerRect.height / 2);
    
    // البحث عن الصفحة الأقرب لمركز الشاشة
    let closestPage = 1;
    let closestDistance = Infinity;
    let closestPageElement = null;
    
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const pageElement = document.getElementById(`page-${i}`);
        if (pageElement) {
            const pageRect = pageElement.getBoundingClientRect();
            const pageCenterY = pageRect.top + (pageRect.height / 2);
            const distance = Math.abs(pageCenterY - viewerCenterY);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestPage = i;
                closestPageElement = pageElement;
            }
        }
    }
    
    // حساب النسبة المئوية داخل الصفحة
    let offsetRatio = 0;
    if (closestPageElement) {
        const pageRect = closestPageElement.getBoundingClientRect();
        const relativeY = viewerCenterY - pageRect.top;
        offsetRatio = relativeY / pageRect.height;
    }
    
    return { pageNum: closestPage, offsetRatio };
}

// ✅ وظيفة جديدة: استعادة موقع الصفحة بعد تغيير الزوم
function restorePagePosition(pageData) {
    if (!viewerContent || !pdfPagesContainer) return;
    
    console.log('🔄 Attempting to restore page:', pageData.pageNum);
    
    const pageElement = document.getElementById(`page-${pageData.pageNum}`);
    if (!pageElement) {
        console.warn('⚠️ Page element not found:', pageData.pageNum);
        return;
    }
    
    // استخدام scrollIntoView للذهاب للصفحة بشكل دقيق
    const viewerRect = viewerContent.getBoundingClientRect();
    const pageRect = pageElement.getBoundingClientRect();
    
    // حساب الموقع الدقيق داخل الصفحة
    const offsetInPage = pageRect.height * Math.max(0, Math.min(1, pageData.offsetRatio));
    
    // حساب scroll position المطلوب
    const currentScrollTop = viewerContent.scrollTop;
    const pageTopRelativeToScroll = pageElement.offsetTop;
    const targetScrollTop = pageTopRelativeToScroll + offsetInPage - (viewerContent.clientHeight / 2);
    
    // التمرير بشكل فوري (بدون smooth)
    viewerContent.scrollTop = targetScrollTop;
    
    console.log(`✅ Restored to page ${pageData.pageNum}, offset ratio: ${pageData.offsetRatio.toFixed(3)}, scrollTop: ${targetScrollTop.toFixed(0)}`);
}

// ✅ وظيفة جديدة: الانتظار حتى تنتهي إعادة رسم جميع الصفحات
function waitForPagesToRender() {
    return new Promise((resolve) => {
        // الانتظار لفريم واحد لبدء الرسم
        requestAnimationFrame(() => {
            // ثم الانتظار حتى تنتهي جميع الصفحات من الرسم
            const checkInterval = setInterval(() => {
                // التحقق من أن الصفحة الحالية قد رُسمت
                const targetPage = parseInt(currentPageSpan?.textContent || '1');
                const pageElement = document.getElementById(`page-${targetPage}`);
                
                if (pageElement) {
                    const canvas = pageElement.querySelector('canvas');
                    // إذا كان Canvas موجود ولديه محتوى (عرض > 0)
                    if (canvas && canvas.width > 0) {
                        clearInterval(checkInterval);
                        // انتظار فريم إضافي للتأكد
                        requestAnimationFrame(() => {
                            resolve();
                        });
                    }
                }
            }, 50); // فحص كل 50ms
            
            // timeout احتياطي بعد 2 ثانية
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 2000);
        });
    });
}

function getFitToWidthScale() {
    // Calculate scale to fit page width to screen width
    const viewerWidth = viewerContent.clientWidth - 120;
    const pageWidth = 595; // Standard PDF page width in points (A4)
    const fitScale = viewerWidth / pageWidth;
    console.log('Fit to width scale calculated:', fitScale);
    return fitScale;
}

// ✅ دالة جديدة: حساب التكبير لملء الشاشة بالكامل
function getFitToScreenScale() {
    // Calculate scale to fit the entire page to screen (both width and height)
    const viewerWidth = viewerContent.clientWidth - 80;
    const viewerHeight = viewerContent.clientHeight - 80;
    const pageWidth = 595; // Standard PDF page width in points (A4)
    const pageHeight = 842; // Standard PDF page height in points (A4)
    
    const widthScale = viewerWidth / pageWidth;
    const heightScale = viewerHeight / pageHeight;
    
    // ✅ استخدام أصغر قيمة للتأكد من ظهور الصفحة كاملة بدون تجاوز
    const fitScale = Math.min(widthScale, heightScale);
    console.log('Fit to screen scale calculated:', fitScale);
    return fitScale;
}

function updateZoomDisplay() {
    if (zoomPercentSpan) {
        const percent = Math.round(scale * 100);
        
        // ✅ عرض الوضع الحالي (Fit Width, Fit Screen, أو Custom)
        let modeName = '';
        if (currentZoomMode === 'fitWidth') {
            modeName = ' (Fit Width)';
        } else if (currentZoomMode === 'fitScreen') {
            modeName = ' (Fit Screen)';
        } // إذا كان custom، لا نضيف شيء
        
        zoomPercentSpan.textContent = percent;
        zoomPercentSpan.title = `Zoom: ${percent}%${modeName}`;
    }
}

function closeViewer() {
    console.log('🔴 closeViewer() called');
    
    // Save reading position before closing
    saveReadingPosition();
    
    // Stop auto-save
    stopAutoSave();
    
    // ✅ إظهار title-bar الرئيسي عند إغلاق PDF
    const titleBar = document.getElementById('title-bar');
    if (titleBar) {
        console.log('✅ Showing title-bar');
        titleBar.style.display = 'flex';
    }
    
    console.log('✅ Adding closing animation to viewerOverlay');
    // Add closing animation
    viewerOverlay?.classList.add('closing');
    
    // Wait for animation to complete before hiding
    setTimeout(() => {
        console.log('✅ Hiding viewerOverlay after animation');
        viewerOverlay?.classList.remove('closing');
        viewerOverlay?.classList.add('hidden');
        pdfDoc = null;
        currentPdfPath = null;
        if (pdfPagesContainer) {
            pdfPagesContainer.innerHTML = '';
        }
        renderedPages.clear();
        currentZoomMode = 'fitWidth';
        scale = 1.0;
        updateZoomDisplay();
        
        // ✅ Refresh library عند إغلاق PDF
        refreshLibrary();
        
        console.log('✅ PDF Viewer closed successfully');
    }, 300);
}

// ============================================
// Dark Mode in PDF Viewer
// ============================================

function toggleInvertColors() {
    if (!pdfPagesContainer || !currentPdfPath) return;
    
    // ✅ تبديل Dark Mode
    const isDarkMode = pdfPagesContainer.classList.toggle('inverted');
    invertColorsBtn?.classList.toggle('active', isDarkMode);
    
    // ✅ حفظ حالة Dark Mode لهذا الـ PDF
    pdfDarkModeSettings[currentPdfPath] = isDarkMode;
    localStorage.setItem('pdfDarkModeSettings', JSON.stringify(pdfDarkModeSettings));
    
    console.log(`🌙 Dark Mode ${isDarkMode ? 'ON' : 'OFF'} for: ${currentPdfPath}`);
}

// ✅ تطبيق Dark Mode المحفوظ عند فتح PDF
function applyPdfDarkMode() {
    if (!pdfPagesContainer || !currentPdfPath) return;
    
    const isDarkMode = pdfDarkModeSettings[currentPdfPath] || false;
    
    if (isDarkMode) {
        pdfPagesContainer.classList.add('inverted');
        invertColorsBtn?.classList.add('active');
    } else {
        pdfPagesContainer.classList.remove('inverted');
        invertColorsBtn?.classList.remove('active');
    }
    
    console.log(`🌙 Applied saved Dark Mode (${isDarkMode}) for: ${currentPdfPath}`);
}

// ============================================
// Page Navigation Functions
// ============================================

// ✅ تفعيل أداة التحديد
function enableHighlightTool() {
    isHighlightMode = true;
    isEraserMode = false;
    highlightToolBtn?.classList.add('active');
    eraserToolBtn?.classList.remove('active');
    colorPicker?.classList.add('active');
    enableHighlightOnAllPages();
    createCustomCursor();
}

// ✅ إلغاء تفعيل أداة التحديد
function disableHighlightTool() {
    isHighlightMode = false;
    highlightToolBtn?.classList.remove('active');
    colorPicker?.classList.remove('active');
    disableHighlightOnAllPages();
    hideCustomCursor(); // إخفاء المؤشر
    hideColorPalette(); // إخفاء لوحة الألوان إذا كانت مفتوحة
}

function toggleHighlightMode() {
    isHighlightMode = !isHighlightMode;
    
    if (isHighlightMode) {
        isEraserMode = false;
        highlightToolBtn?.classList.add('active');
        eraserToolBtn?.classList.remove('active');
        colorPicker?.classList.add('active');
        enableHighlightOnAllPages();
        createCustomCursor(); // إنشاء المؤشر المخصص
    } else {
        highlightToolBtn?.classList.remove('active');
        colorPicker?.classList.remove('active');
        disableHighlightOnAllPages();
        hideCustomCursor(); // إخفاء المؤشر
    }
}

function toggleEraserMode() {
    isEraserMode = !isEraserMode;
    
    if (isEraserMode) {
        isHighlightMode = false;
        eraserToolBtn?.classList.add('active');
        highlightToolBtn?.classList.remove('active');
        colorPicker?.classList.remove('active');
        enableEraserOnAllPages();
        createCustomCursor(); // إنشاء المؤشر المخصص
    } else {
        eraserToolBtn?.classList.remove('active');
        disableEraserOnAllPages();
        hideCustomCursor(); // إخفاء المؤشر
    }
}

function enableHighlightOnAllPages() {
    const pages = document.querySelectorAll('.pdf-page');
    pages.forEach(page => {
        let canvas = page.querySelector('.highlight-canvas');
        if (!canvas) {
            canvas = createHighlightCanvas(page);
        }
        if (canvas) {
            canvas.classList.add('drawing');
            canvas.classList.remove('erasing');
        }
    });
}

function enableEraserOnAllPages() {
    const pages = document.querySelectorAll('.pdf-page');
    pages.forEach(page => {
        let canvas = page.querySelector('.highlight-canvas');
        if (!canvas) {
            canvas = createHighlightCanvas(page);
        }
        if (canvas) {
            canvas.classList.add('erasing');
            canvas.classList.remove('drawing');
        }
    });
}

function disableHighlightOnAllPages() {
    const canvases = document.querySelectorAll('.highlight-canvas');
    canvases.forEach(canvas => {
        canvas.classList.remove('drawing');
    });
}

function disableEraserOnAllPages() {
    const canvases = document.querySelectorAll('.highlight-canvas');
    canvases.forEach(canvas => {
        canvas.classList.remove('erasing');
    });
}

// ✅ معالج الضغط خارج اللوحة
function handlePaletteOutsideClick(e) {
    if (activeColorPalette && !activeColorPalette.contains(e.target)) {
        hideColorPalette();
    }
}

// ✅ الحصول على ملاحظة التحديد
function getCurrentHighlightNote(pageNum, highlightId) {
    if (!currentPdfPath || !highlights[currentPdfPath]?.[pageNum]) return '';
    
    const highlightDataArray = highlights[currentPdfPath][pageNum];
    if (!Array.isArray(highlightDataArray)) return '';
    
    const highlightData = highlightDataArray.find(h => h.id === highlightId);
    return highlightData?.note || '';
}

// ✅ تحديث ملاحظة التحديد
function updateHighlightNote(pageNum, highlightId, note) {
    if (!currentPdfPath || !highlights[currentPdfPath]?.[pageNum]) return;
    
    const highlightDataArray = highlights[currentPdfPath][pageNum];
    if (!Array.isArray(highlightDataArray)) return;
    
    const highlightData = highlightDataArray.find(h => h.id === highlightId);
    if (highlightData) {
        highlightData.note = note.trim();
        localStorage.setItem('pdfHighlights', JSON.stringify(highlights));
        
        // تحديث القائمة الجانبية
        if (!highlightsSidebar?.classList.contains('hidden')) {
            updateHighlightsList();
        }
    }
}

// ✅ متغيرات لوحة الألوان
let activeColorPalette = null;
let currentSelectedHighlight = null;

// ✅ الحصول على لون التحديد الحالي
function getCurrentHighlightColor(pageNum, highlightId) {
    if (!currentPdfPath || !highlights[currentPdfPath] || !highlights[currentPdfPath][pageNum]) {
        return currentHighlightColor;
    }
    
    const highlightDataArray = highlights[currentPdfPath][pageNum];
    if (Array.isArray(highlightDataArray)) {
        const found = highlightDataArray.find(h => h.id === highlightId);
        return found ? found.color : currentHighlightColor;
    }
    
    return currentHighlightColor;
}

// ✅ إظهار لوحة الألوان للتحديد الجديد (قبل الحفظ)
function showColorPaletteForNewHighlight(x, y, pageNum, rectBounds, canvas, ctx, startX, startY, endX, endY) {
    hideColorPalette();
    
    const palette = document.createElement('div');
    palette.className = 'floating-color-palette';
    
    // ✅ حفظ البيانات للاستخدام عند الإغلاق
    palette.dataset.pageNum = pageNum;
    palette.dataset.canvas = canvas;
    palette.dataset.rectBounds = JSON.stringify(rectBounds);
    
    // ✅ ألوان ساطعة ومتباينة جداً للثيم الداكن
    const colors = [
        { hex: '#FFD700', name: 'Gold' },           // ذهبي ساطع
        { hex: '#FF1493', name: 'Hot Pink' },       // وردي ساخن
        { hex: '#00FF00', name: 'Lime' },           // أخضر نيون
        { hex: '#00BFFF', name: 'Sky Blue' },       // أزرق سماوي
        { hex: '#FF00FF', name: 'Magenta' },        // أرجواني ساطع
        { hex: '#FFFF00', name: 'Yellow' },         // أصفر نيون
        { hex: '#FF4500', name: 'Red Orange' },     // برتقالي أحمر
        { hex: '#00FFFF', name: 'Cyan' }            // سماوي نيون
    ];
    
    palette.innerHTML = `
        <div class="palette-header">
            <span>New Highlight</span>
            <button class="palette-close-btn" title="Close">×</button>
        </div>
        <div class="palette-colors">
            ${colors.map(c => {
                const isSelected = currentHighlightColor === c.hex;
                return `<button class="palette-color-btn ${isSelected ? 'selected' : ''}" data-color="${c.hex}" style="background: ${c.hex};" title="${c.name}"></button>`;
            }).join('')}
        </div>
        <div class="palette-note-section">
            <label class="palette-note-label">
                <i class="fas fa-sticky-note"></i>
                <span>Add Note (Optional)</span>
            </label>
            <textarea 
                class="palette-note-input" 
                placeholder="Why did you highlight this? Add your thoughts..."
                maxlength="500"
                rows="3"
            ></textarea>
            <div class="palette-note-counter">
                <span class="char-count">0</span>/500
            </div>
        </div>
    `;
    
    // ✅ تحسين موقع القائمة (إذا كانت المسافة قليلة من الأعلى، تظهر تحت)
    document.body.appendChild(palette);
    activeColorPalette = palette;
    
    // الحصول على أبعاد القائمة
    const paletteRect = palette.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // تحديد الموقع الأمثل
    let finalX = x;
    let finalY = y;
    
    // إذا كانت المسافة من الأعلى أقل من 250px، اعرض القائمة تحت
    if (y < 250) {
        palette.style.transform = 'translate(-50%, 20px)'; // تحت المؤشر
    } else {
        palette.style.transform = 'translate(-50%, -120%)'; // فوق المؤشر (الافتراضي)
    }
    
    // تعديل الموقع الأفقي إذا كان خارج الشاشة
    if (x - paletteRect.width / 2 < 10) {
        finalX = paletteRect.width / 2 + 10;
    } else if (x + paletteRect.width / 2 > window.innerWidth - 10) {
        finalX = window.innerWidth - paletteRect.width / 2 - 10;
    }
    
    palette.style.left = `${finalX}px`;
    palette.style.top = `${finalY}px`;
    
    // ✅ Event Listener لعداد الأحرف
    const noteInput = palette.querySelector('.palette-note-input');
    const charCount = palette.querySelector('.char-count');
    
    // ✅ منع إغلاق اللوحة عند النقر على حقل النوت
    noteInput?.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    noteInput?.addEventListener('input', (e) => {
        charCount.textContent = e.target.value.length;
    });
    
    // Event Listeners
    const colorBtns = palette.querySelectorAll('.palette-color-btn');
    colorBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const selectedColor = btn.dataset.color;
            
            // ✅ حذف المستطيل المؤقت
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // ✅ إعادة رسم التحديدات القديمة
            const pageNum = parseInt(canvas.closest('.pdf-page').dataset.pageNum);
            if (highlights[currentPdfPath]?.[pageNum]) {
                const highlightDataArray = highlights[currentPdfPath][pageNum];
                if (Array.isArray(highlightDataArray)) {
                    highlightDataArray.forEach(h => {
                        if (h.rect) {
                            drawFilledRectangle(ctx, h.rect.x, h.rect.y, 
                                h.rect.x + h.rect.width, h.rect.y + h.rect.height, h.color);
                        }
                    });
                }
            }
            
            // ✅ رسم التحديد الجديد باللون المختار
            drawFilledRectangle(ctx, startX, startY, endX, endY, selectedColor);
            
            // ✅ الحصول على الملاحظة من الـ input
            const note = noteInput?.value?.trim() || '';
            
            // ✅ حفظ التحديد باللون والملاحظة
            currentHighlightColor = selectedColor;
            savePageHighlight(canvas, pageNum, rectBounds, note);
            
            hideColorPalette();
        });
    });
    
    const closeBtn = palette.querySelector('.palette-close-btn');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // ✅ إذا أغلق المستخدم اللوحة، احفظ باللون الافتراضي مع الملاحظة
        const note = noteInput?.value?.trim() || '';
        savePageHighlight(canvas, pageNum, rectBounds, note);
        hideColorPalette();
    });
    
    // ✅ حفظ التحديد تلقائياً عند النقر خارج اللوحة
    setTimeout(() => {
        const outsideClickHandler = (e) => {
            if (activeColorPalette && !activeColorPalette.contains(e.target)) {
                // ✅ حفظ التحديد باللون الحالي مع الملاحظة
                const note = noteInput?.value?.trim() || '';
                savePageHighlight(canvas, pageNum, rectBounds, note);
                hideColorPalette();
                document.removeEventListener('click', outsideClickHandler);
            }
        };
        document.addEventListener('click', outsideClickHandler);
    }, 100);
}

// ✅ إظهار لوحة الألوان فوق المنطقة المحددة
function showColorPalette(x, y, pageNum, rectBounds, highlightId = null) {
    // إخفاء لوحة الألوان السابقة
    hideColorPalette();
    
    // إنشاء لوحة الألوان
    const palette = document.createElement('div');
    palette.className = 'floating-color-palette';
    // ✅ ألوان ساطعة ومتباينة جداً للثيم الداكن
    const colors = [
        { hex: '#FFD700', name: 'Gold' },           // ذهبي ساطع
        { hex: '#FF1493', name: 'Hot Pink' },       // وردي ساخن
        { hex: '#00FF00', name: 'Lime' },           // أخضر نيون
        { hex: '#00BFFF', name: 'Sky Blue' },       // أزرق سماوي
        { hex: '#FF00FF', name: 'Magenta' },        // أرجواني ساطع
        { hex: '#FFFF00', name: 'Yellow' },         // أصفر نيون
        { hex: '#FF4500', name: 'Red Orange' },     // برتقالي أحمر
        { hex: '#00FFFF', name: 'Cyan' }            // سماوي نيون
    ];
    
    // ✅ الحصول على الملاحظة الحالية (إن وجدت)
    const currentNote = highlightId ? getCurrentHighlightNote(pageNum, highlightId) : '';
    
    palette.innerHTML = `
        <div class="palette-header">
            <span>${highlightId ? 'Edit Highlight' : 'New Highlight'}</span>
            <button class="palette-close-btn" title="Close">×</button>
        </div>
        <div class="palette-colors">
            ${colors.map(c => {
                const isSelected = (highlightId ? 
                    (getCurrentHighlightColor(pageNum, highlightId) === c.hex) : 
                    (currentHighlightColor === c.hex)
                );
                return `<button class="palette-color-btn ${isSelected ? 'selected' : ''}" data-color="${c.hex}" style="background: ${c.hex};" title="${c.name}"></button>`;
            }).join('')}
        </div>
        <div class="palette-note-section">
            <label class="palette-note-label">
                <i class="fas fa-sticky-note"></i>
                <span>Add Note (Optional)</span>
            </label>
            <textarea 
                class="palette-note-input" 
                placeholder="Why did you highlight this? Add your thoughts..."
                maxlength="500"
                rows="3"
            >${currentNote}</textarea>
            <div class="palette-note-counter">
                <span class="char-count">${currentNote.length}</span>/500
            </div>
        </div>
        ${highlightId ? `
        <div class="palette-footer">
            <button class="palette-delete-btn" title="Delete this highlight">
                <i class="fas fa-trash-alt"></i> Delete Highlight
            </button>
        </div>
        ` : ''}
    `;
    
    // ✅ تحسين موقع القائمة (إذا كانت المسافة قليلة من الأعلى، تظهر تحت)
    document.body.appendChild(palette);
    activeColorPalette = palette;
    
    // الحصول على أبعاد القائمة
    const paletteRect = palette.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // تحديد الموقع الأمثل
    let finalX = x;
    let finalY = y;
    
    // إذا كانت المسافة من الأعلى أقل من 300px، اعرض القائمة تحت
    if (y < 300) {
        palette.style.transform = 'translate(-50%, 20px)'; // تحت المؤشر
    } else {
        palette.style.transform = 'translate(-50%, -120%)'; // فوق المؤشر (الافتراضي)
    }
    
    // تعديل الموقع الأفقي إذا كان خارج الشاشة
    if (x - paletteRect.width / 2 < 10) {
        finalX = paletteRect.width / 2 + 10;
    } else if (x + paletteRect.width / 2 > window.innerWidth - 10) {
        finalX = window.innerWidth - paletteRect.width / 2 - 10;
    }
    
    palette.style.left = `${finalX}px`;
    palette.style.top = `${finalY}px`;
    
    // حفظ معلومات الهايلايت الحالي
    currentSelectedHighlight = { pageNum, rectBounds, highlightId };
    
    // ✅ Event Listener لعداد الأحرف
    const noteInput = palette.querySelector('.palette-note-input');
    const charCount = palette.querySelector('.char-count');
    
    // ✅ منع إغلاق اللوحة عند النقر على حقل النوت
    noteInput?.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    noteInput?.addEventListener('input', (e) => {
        charCount.textContent = e.target.value.length;
        
        // حفظ الملاحظة تلقائياً عند التعديل (إذا كان تحديد موجود)
        if (highlightId) {
            updateHighlightNote(pageNum, highlightId, e.target.value);
        }
    });
    
    // إضافة Event Listeners
    const colorBtns = palette.querySelectorAll('.palette-color-btn');
    colorBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newColor = btn.dataset.color;
            
            if (highlightId) {
                // تغيير لون تحديد موجود
                changeExistingHighlightColor(pageNum, highlightId, newColor);
            } else {
                // تغيير لون التحديد الحالي (قبل الحفظ)
                currentHighlightColor = newColor;
                
                // تحديث المؤشر المخصص
                if (customCursor && isHighlightMode) {
                    updateCustomCursor(e.clientX, e.clientY);
                }
            }
            
            hideColorPalette();
        });
    });
    
    const closeBtn = palette.querySelector('.palette-close-btn');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hideColorPalette();
    });
    
    // ✅ زر الحذف (في حالة تحديد موجود)
    if (highlightId) {
        const deleteBtn = palette.querySelector('.palette-delete-btn');
        deleteBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this highlight?')) {
                deleteHighlight(pageNum, highlightId);
                hideColorPalette();
            }
        });
    }
    
    // إغلاق عند الضغط خارج اللوحة
    setTimeout(() => {
        document.addEventListener('click', handlePaletteOutsideClick);
    }, 100);
}

// ✅ إخفاء لوحة الألوان
function hideColorPalette() {
    if (activeColorPalette) {
        activeColorPalette.remove();
        activeColorPalette = null;
        currentSelectedHighlight = null;
        document.removeEventListener('click', handlePaletteOutsideClick);
    }
}

// ✅ تغيير لون الهايلايت
function changeHighlightColor(pageNum, rectBounds, newColor) {
    const pageElement = document.getElementById(`page-${pageNum}`);
    if (!pageElement) return;
    
    const canvas = pageElement.querySelector('.highlight-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // إعادة رسم الهايلايت بلون جديد
    // أولاً: محو المنطقة القديمة
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(rectBounds.x, rectBounds.y, rectBounds.width, rectBounds.height);
    ctx.restore();
    
    // ثانياً: رسم بلون جديد
    drawFilledRectangle(ctx, rectBounds.x, rectBounds.y, 
        rectBounds.x + rectBounds.width, 
        rectBounds.y + rectBounds.height, 
        newColor);
    
    // حفظ التغييرات
    savePageHighlight(canvas, pageNum, rectBounds);
}

// ✅ تغيير لون تحديد موجود بناءً على ID
function changeExistingHighlightColor(pageNum, highlightId, newColor) {
    if (!currentPdfPath || !highlights[currentPdfPath]?.[pageNum]) return;
    
    const highlightDataArray = highlights[currentPdfPath][pageNum];
    if (!Array.isArray(highlightDataArray)) return;
    
    // البحث عن التحديد المطلوب
    const highlightIndex = highlightDataArray.findIndex(h => h.id === highlightId);
    if (highlightIndex === -1) return;
    
    // تحديث اللون
    highlightDataArray[highlightIndex].color = newColor;
    
    // حفظ التغييرات
    localStorage.setItem('pdfHighlights', JSON.stringify(highlights));
    
    // إعادة رسم جميع التحديدات في الصفحة
    const pageElement = document.getElementById(`page-${pageNum}`);
    if (pageElement) {
        const canvas = pageElement.querySelector('.highlight-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // إعادة رسم كل التحديدات بألوانها الجديدة
            highlightDataArray.forEach(highlightData => {
                // ✅ استخدام النسب المئوية للتكيف مع الزوم
                if (highlightData.normalizedRect) {
                    const rect = highlightData.normalizedRect;
                    const color = highlightData.color || currentHighlightColor;
                    
                    // تحويل النسب إلى pixels
                    const x = rect.x * canvas.width;
                    const y = rect.y * canvas.height;
                    const width = rect.width * canvas.width;
                    const height = rect.height * canvas.height;
                    
                    drawFilledRectangle(ctx, x, y, x + width, y + height, color);
                } else if (highlightData.rect) {
                    // ✅ الصيغة القديمة (للتوافق مع البيانات القديمة)
                    const rect = highlightData.rect;
                    const color = highlightData.color || currentHighlightColor;
                    drawFilledRectangle(ctx, rect.x, rect.y, rect.x + rect.width, rect.y + rect.height, color);
                }
            });
        }
    }
    
    // تحديث قائمة الهايلايتات
    updateHighlightsList();
}

function createHighlightCanvas(pageElement) {
    const pageNum = parseInt(pageElement.dataset.pageNum);
    const pdfCanvas = pageElement.querySelector('canvas');
    
    if (!pdfCanvas) return null;
    
    const canvas = document.createElement('canvas');
    canvas.className = 'highlight-canvas';
    canvas.width = pdfCanvas.width;
    canvas.height = pdfCanvas.height;
    canvas.style.width = pdfCanvas.style.width;
    canvas.style.height = pdfCanvas.style.height;
    
    const ctx = canvas.getContext('2d');
    
    // Load existing highlights for this page
    loadHighlightsForPage(canvas, ctx, pageNum);
    
    // ✅ نظام Rectangle Selection - رسم مستطيل تحديد
    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let savedImageData = null; // لحفظ الحالة السابقة
    
    canvas.addEventListener('mousedown', (e) => {
        if (!isHighlightMode && !isEraserMode) return;
        
        const rect = canvas.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        // ✅ التحقق من النقر على تحديد موجود
        if (isHighlightMode && highlights[currentPdfPath]?.[pageNum]) {
            const highlightDataArray = highlights[currentPdfPath][pageNum];
            const highlightsToCheck = Array.isArray(highlightDataArray) ? highlightDataArray : [highlightDataArray];
            
            // البحث عن التحديد المنقور
            for (let i = highlightsToCheck.length - 1; i >= 0; i--) {
                const highlightData = highlightsToCheck[i];
                const rect = highlightData.rect;
                
                if (rect && clickX >= rect.x && clickX <= rect.x + rect.width &&
                    clickY >= rect.y && clickY <= rect.y + rect.height) {
                    // تم النقر على تحديد موجود - إظهار لوحة الألوان
                    showColorPalette(e.clientX, e.clientY, pageNum, rect, highlightData.id);
                    return; // عدم بدء رسم جديد
                }
            }
        }
        
        isDrawing = true;
        startX = clickX;
        startY = clickY;
        
        // حفظ الحالة الحالية قبل الرسم
        savedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        
        const rect = canvas.getBoundingClientRect();
        const currentX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const currentY = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        // استعادة الحالة السابقة (لإزالة المستطيل المؤقت)
        if (savedImageData) {
            ctx.putImageData(savedImageData, 0, 0);
        }
        
        if (isHighlightMode) {
            // ✅ رسم إطار المستطيل فقط (مؤقت)
            drawRectangleOutline(ctx, startX, startY, currentX, currentY, currentHighlightColor);
        } else if (isEraserMode) {
            // ✅ الممحاة الذكية - حذف المستطيلات المحددة فوراً عند اللمس
            eraseHighlight(ctx, currentX, currentY, pageNum, true);
        }
    });
    
    canvas.addEventListener('mouseup', (e) => {
        if (!isDrawing) return;
        
        const rect = canvas.getBoundingClientRect();
        const endX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const endY = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        // استعادة الحالة السابقة
        if (savedImageData) {
            ctx.putImageData(savedImageData, 0, 0);
        }
        
        if (isHighlightMode) {
            // التحقق من أن المستطيل ليس صغيراً جداً
            const width = Math.abs(endX - startX);
            const height = Math.abs(endY - startY);
            
            if (width > 5 && height > 5) {
                // ✅ حساب إحداثيات المستطيل
                const rectBounds = {
                    x: Math.min(startX, endX),
                    y: Math.min(startY, endY),
                    width: width,
                    height: height
                };
                
                // ✅ رسم المستطيل المؤقت بلون افتراضي
                drawFilledRectangle(ctx, startX, startY, endX, endY, currentHighlightColor);
                
                // ✅ إظهار لوحة الألوان أولاً لاختيار اللون
                showColorPaletteForNewHighlight(e.clientX, e.clientY, pageNum, rectBounds, canvas, ctx, startX, startY, endX, endY);
            }
            
            // ✅ البقاء في وضع التحديد (لا إلغاء تلقائي)
        }
        
        isDrawing = false;
        savedImageData = null;
        
        // ✅ إعادة تعيين معرف آخر تحديد محذوف (للممحاة)
        lastDeletedHighlightId = null;
    });
    
    canvas.addEventListener('mouseleave', () => {
        if (isDrawing) {
            isDrawing = false;
            savedImageData = null;
            lastDeletedHighlightId = null; // إعادة تعيين
            // حذف المستطيل المؤقت
            if (savedImageData) {
                ctx.putImageData(savedImageData, 0, 0);
            }
        }
    });
    
    // ✅ إضافة نظام حذف عند hover على المستطيل
    addDeleteOnHover(canvas, pageElement, pageNum);
    
    pageElement.appendChild(canvas);
    return canvas;
}

// ✅ رسم إطار المستطيل المؤقت (أثناء السحب)
function drawRectangleOutline(ctx, x1, y1, x2, y2, color) {
    ctx.save();
    
    const width = x2 - x1;
    const height = y2 - y1;
    
    // ✅ إطار واضح بدون تعبئة
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.8;
    ctx.setLineDash([8, 4]); // خط متقطع
    
    ctx.strokeRect(x1, y1, width, height);
    
    ctx.restore();
}

// ✅ رسم المستطيل المملوء النهائي - يحافظ على وضوح النص 100%
function drawFilledRectangle(ctx, x1, y1, x2, y2, color) {
    ctx.save();
    
    const width = x2 - x1;
    const height = y2 - y1;
    
    // ✅ تحويل اللون من HEX إلى RGBA مع شفافية
    // هذا يجعل الخلفية شفافة فقط، وليس النص!
    const rgbaColor = hexToRGBA(color, 0.35); // 35% شفافية للخلفية فقط
    
    // ✅ رسم الخلفية الشفافة
    ctx.fillStyle = rgbaColor;
    ctx.fillRect(x1, y1, width, height);
    
    // ✅ إطار واضح للتباين (شفافية أقل)
    const rgbaBorder = hexToRGBA(color, 0.7); // 70% وضوح للحدود
    ctx.strokeStyle = rgbaBorder;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x1, y1, width, height);
    
    ctx.restore();
}

// ✅ دالة مساعدة: تحويل HEX إلى RGBA
function hexToRGBA(hex, alpha) {
    // إزالة # إذا كانت موجودة
    hex = hex.replace('#', '');
    
    // تحويل إلى RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ✅ الممحاة الذكية - تحذف المستطيلات المحددة فقط
let lastDeletedHighlightId = null; // لتجنب الحذف المتكرر لنفس التحديد

function eraseHighlight(ctx, x, y, pageNum, isMoving = false) {
    // التحقق من وجود تحديدات في الصفحة
    if (!currentPdfPath || !highlights[currentPdfPath]?.[pageNum]) {
        // لا توجد تحديدات - استخدام المسح العادي
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
    }
    
    const highlightDataArray = highlights[currentPdfPath][pageNum];
    const highlightsToCheck = Array.isArray(highlightDataArray) ? highlightDataArray : [highlightDataArray];
    
    // البحث عن التحديد الذي تقع نقطة الممحاة بداخله
    let foundHighlight = null;
    let foundIndex = -1;
    
    for (let i = 0; i < highlightsToCheck.length; i++) {
        const highlightData = highlightsToCheck[i];
        const rect = highlightData.rect;
        
        if (rect && x >= rect.x && x <= rect.x + rect.width &&
            y >= rect.y && y <= rect.y + rect.height) {
            foundHighlight = highlightData;
            foundIndex = i;
            break;
        }
    }
    
    if (foundHighlight && foundIndex !== -1) {
        // ✅ تجنب حذف نفس التحديد مرتين في نفس الحركة
        if (isMoving && lastDeletedHighlightId === foundHighlight.id) {
            return;
        }
        
        // ✅ تسجيل آخر تحديد محذوف
        lastDeletedHighlightId = foundHighlight.id;
        
        // ✅ حذف التحديد المحدد
        if (Array.isArray(highlightDataArray)) {
            highlightDataArray.splice(foundIndex, 1);
            
            // إذا أصبحت القائمة فارغة، احذف الصفحة
            if (highlightDataArray.length === 0) {
                delete highlights[currentPdfPath][pageNum];
            }
        } else {
            delete highlights[currentPdfPath][pageNum];
        }
        
        // حفظ التغييرات
        localStorage.setItem('pdfHighlights', JSON.stringify(highlights));
        
        // إعادة رسم جميع التحديدات المتبقية
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        if (Array.isArray(highlightDataArray) && highlightDataArray.length > 0) {
            highlightDataArray.forEach(highlightData => {
                const rect = highlightData.rect;
                const color = highlightData.color || currentHighlightColor;
                
                if (rect) {
                    drawFilledRectangle(ctx, rect.x, rect.y, 
                        rect.x + rect.width, 
                        rect.y + rect.height, 
                        color);
                }
            });
        }
        
        // تحديث قائمة الهايلايتات
        updateHighlightsList();
    } else {
        // لم يتم العثور على تحديد - استخدام المسح العادي
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function savePageHighlight(canvas, pageNum, rectBounds = null, note = '') {
    if (!currentPdfPath) return;
    
    const highlightDataURL = canvas.toDataURL();
    
    // ✅ الحصول على صورة الـ PDF الأصلية
    const pageElement = document.getElementById(`page-${pageNum}`);
    const pdfCanvas = pageElement?.querySelector('canvas:not(.highlight-canvas)');
    const pdfDataURL = pdfCanvas ? pdfCanvas.toDataURL() : null;
    
    if (!highlights[currentPdfPath]) {
        highlights[currentPdfPath] = {};
    }
    
    // ✅ دعم تحديدات متعددة في نفس الصفحة
    if (!highlights[currentPdfPath][pageNum]) {
        highlights[currentPdfPath][pageNum] = [];
    }
    
    // ✅ إنشاء معرف فريد للتحديد
    const highlightId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // ✅ حفظ الإحداثيات كنسب مئوية (0-1) بدلاً من pixels
    let normalizedRect = null;
    if (rectBounds && canvas.width > 0 && canvas.height > 0) {
        normalizedRect = {
            x: rectBounds.x / canvas.width,
            y: rectBounds.y / canvas.height,
            width: rectBounds.width / canvas.width,
            height: rectBounds.height / canvas.height
        };
    }
    
    const newHighlight = {
        id: highlightId,
        highlight: highlightDataURL,
        pdf: pdfDataURL,
        rect: rectBounds, // الإحداثيات الأصلية (للتوافق مع الكود القديم)
        normalizedRect: normalizedRect, // ✅ النسب المئوية (للتكيف مع الزوم)
        color: currentHighlightColor, // ✅ حفظ اللون المستخدم
        note: note || '', // ✅ حفظ الملاحظة
        originalCanvasWidth: canvas.width, // ✅ حفظ العرض الأصلي
        originalCanvasHeight: canvas.height, // ✅ حفظ الارتفاع الأصلي
        scale: scale, // ✅ حفظ مستوى الزوم الحالي
        timestamp: new Date().toISOString()
    };
    
    // Save to history for undo
    highlightHistory.push({
        pdfPath: currentPdfPath,
        pageNum,
        previousData: JSON.parse(JSON.stringify(highlights[currentPdfPath][pageNum])),
        action: 'add',
        highlightId
    });
    
    // Keep history size manageable
    if (highlightHistory.length > MAX_HISTORY) {
        highlightHistory.shift();
    }
    
    // ✅ إضافة التحديد الجديد للقائمة
    highlights[currentPdfPath][pageNum].push(newHighlight);
    
    localStorage.setItem('pdfHighlights', JSON.stringify(highlights));
    
    // ✅ تحديث قائمة الـ Highlights إذا كانت مفتوحة
    if (!highlightsSidebar?.classList.contains('hidden')) {
        updateHighlightsList();
    }
}

function loadHighlightsForPage(canvas, ctx, pageNum) {
    if (!currentPdfPath || !highlights[currentPdfPath] || !highlights[currentPdfPath][pageNum]) {
        return;
    }
    
    const highlightDataArray = highlights[currentPdfPath][pageNum];
    
    // ✅ دعم الصيغة القديمة (object) والجديدة (array)
    if (Array.isArray(highlightDataArray)) {
        // الصيغة الجديدة - تحديدات متعددة
        highlightDataArray.forEach(highlightData => {
            // ✅ إعادة رسم التحديد باستخدام النسب المئوية
            if (highlightData.normalizedRect && highlightData.color) {
                const rect = highlightData.normalizedRect;
                
                // ✅ تحويل النسب المئوية إلى pixels حسب حجم Canvas الحالي
                const x = rect.x * canvas.width;
                const y = rect.y * canvas.height;
                const width = rect.width * canvas.width;
                const height = rect.height * canvas.height;
                
                // ✅ رسم المستطيل المملوء بنفس اللون
                drawFilledRectangle(ctx, x, y, x + width, y + height, highlightData.color);
            } else {
                // ✅ الصيغة القديمة - استخدام الصورة المحفوظة
                const highlightURL = highlightData.highlight;
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                };
                img.src = highlightURL;
            }
        });
    } else {
        // الصيغة القديمة - تحديد واحد
        const highlightURL = typeof highlightDataArray === 'string' ? highlightDataArray : highlightDataArray.highlight;
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = highlightURL;
    }
}

function undoHighlight() {
    if (highlightHistory.length === 0) return;
    
    const lastAction = highlightHistory.pop();
    const { pdfPath, pageNum, previousData } = lastAction;
    
    if (highlights[pdfPath]) {
        if (previousData === null) {
            delete highlights[pdfPath][pageNum];
        } else {
            highlights[pdfPath][pageNum] = previousData;
        }
        
        localStorage.setItem('pdfHighlights', JSON.stringify(highlights));
        
        // Reload the canvas
        const pageElement = document.querySelector(`[data-page-num="${pageNum}"]`);
        if (pageElement) {
            const canvas = pageElement.querySelector('.highlight-canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                loadHighlightsForPage(canvas, ctx, pageNum);
            }
        }
    }
}

// ✅ وظيفة حذف الهايلايت
function deleteHighlight(pageNum, highlightId = null) {
    if (!currentPdfPath || !highlights[currentPdfPath]) return;
    
    const highlightDataArray = highlights[currentPdfPath][pageNum];
    
    if (highlightId) {
        // ✅ حذف تحديد معين بناءً على ID
        if (Array.isArray(highlightDataArray)) {
            highlights[currentPdfPath][pageNum] = highlightDataArray.filter(h => h.id !== highlightId);
            
            // إذا أصبحت القائمة فارغة، احذف الصفحة من الكائن
            if (highlights[currentPdfPath][pageNum].length === 0) {
                delete highlights[currentPdfPath][pageNum];
            }
        }
    } else {
        // حذف جميع التحديدات في الصفحة
        delete highlights[currentPdfPath][pageNum];
    }
    
    // ✅ حفظ في localStorage
    localStorage.setItem('pdfHighlights', JSON.stringify(highlights));
    
    // ✅ حذف من الـ PDF نفسه (مسح الـ canvas وإعادة رسم المتبقي)
    const pageElement = document.getElementById(`page-${pageNum}`);
    if (pageElement) {
        const highlightCanvas = pageElement.querySelector('.highlight-canvas');
        if (highlightCanvas) {
            const ctx = highlightCanvas.getContext('2d');
            
            // ✅ مسح كامل
            ctx.clearRect(0, 0, highlightCanvas.width, highlightCanvas.height);
            
            // ✅ إعادة رسم التحديدات المتبقية فقط
            if (highlights[currentPdfPath]?.[pageNum]) {
                const remainingHighlights = highlights[currentPdfPath][pageNum];
                if (Array.isArray(remainingHighlights) && remainingHighlights.length > 0) {
                    remainingHighlights.forEach(h => {
                        if (h.rect && h.color) {
                            drawFilledRectangle(ctx, 
                                h.rect.x, 
                                h.rect.y, 
                                h.rect.x + h.rect.width, 
                                h.rect.y + h.rect.height, 
                                h.color
                            );
                        }
                    });
                }
            }
        }
    }
    
    // ✅ تحديث قائمة الهايلايتات في السايدبار
    updateHighlightsList();
}

// ✅ حذف جميع التحديدات في PDF الحالي (Reset)
function clearAllHighlightsInPDF() {
    if (!currentPdfPath || !highlights[currentPdfPath]) return;
    
    // ✅ حذف جميع التحديدات من الكائن
    delete highlights[currentPdfPath];
    
    // ✅ حفظ في localStorage
    localStorage.setItem('pdfHighlights', JSON.stringify(highlights));
    
    // ✅ مسح جميع الـ canvases في جميع الصفحات
    const allPages = document.querySelectorAll('.pdf-page');
    allPages.forEach(pageElement => {
        const highlightCanvas = pageElement.querySelector('.highlight-canvas');
        if (highlightCanvas) {
            const ctx = highlightCanvas.getContext('2d');
            ctx.clearRect(0, 0, highlightCanvas.width, highlightCanvas.height);
        }
    });
    
    // ✅ تحديث قائمة الهايلايتات في السايدبار
    updateHighlightsList();
    
    // ✅ إظهار رسالة نجاح
    console.log('✅ All highlights cleared successfully!');
}

// ✅ إضافة زر حذف عند hover على الهايلايت في الصفحة
function addDeleteOnHover(canvas, pageElement, pageNum) {
    let deleteBtn = null;
    let currentHighlightId = null;
    
    // ✅ تتبع الماوس لكشف التحديد
    canvas.addEventListener('mousemove', (e) => {
        // تجاهل في وضع التحديد أو الممحاة
        if (isHighlightMode || isEraserMode) {
            if (deleteBtn) {
                deleteBtn.remove();
                deleteBtn = null;
            }
            return;
        }
        
        // التحقق من وجود هايلايتات
        if (!highlights[currentPdfPath]?.[pageNum]) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        const highlightDataArray = highlights[currentPdfPath][pageNum];
        const highlightsToCheck = Array.isArray(highlightDataArray) ? highlightDataArray : [highlightDataArray];
        
        // البحث عن التحديد تحت المؤشر (من الأحدث للأقدم)
        let foundHighlight = null;
        for (let i = highlightsToCheck.length - 1; i >= 0; i--) {
            const h = highlightsToCheck[i];
            if (h.rect && x >= h.rect.x && x <= h.rect.x + h.rect.width &&
                y >= h.rect.y && y <= h.rect.y + h.rect.height) {
                foundHighlight = h;
                break;
            }
        }
        
        if (foundHighlight && foundHighlight.id !== currentHighlightId) {
            // ✅ إنشاء زر X جديد
            if (deleteBtn) deleteBtn.remove();
            
            currentHighlightId = foundHighlight.id;
            deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-highlight-overlay-btn';
            deleteBtn.innerHTML = '✕';
            deleteBtn.title = 'Delete this highlight';
            
            // ✅ حساب موقع الزر (أعلى يمين المستطيل)
            const btnX = foundHighlight.rect.x + foundHighlight.rect.width - 8;
            const btnY = foundHighlight.rect.y + 8;
            const btnScreenX = (btnX / canvas.width) * rect.width + rect.left;
            const btnScreenY = (btnY / canvas.height) * rect.height + rect.top;
            
            deleteBtn.style.cssText = `
                position: fixed;
                left: ${btnScreenX}px;
                top: ${btnScreenY}px;
                width: 28px;
                height: 28px;
                background: rgba(255, 255, 255, 0.15);
                border: 2px solid rgba(255, 255, 255, 0.9);
                border-radius: 50%;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 10000;
                font-size: 16px;
                font-weight: bold;
                backdrop-filter: blur(5px);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
                transition: all 0.2s ease;
            `;
            
            deleteBtn.addEventListener('mouseenter', () => {
                deleteBtn.style.transform = 'scale(1.2)';
                deleteBtn.style.background = 'rgba(255, 255, 255, 0.25)';
            });
            
            deleteBtn.addEventListener('mouseleave', () => {
                deleteBtn.style.transform = 'scale(1)';
                deleteBtn.style.background = 'rgba(255, 255, 255, 0.15)';
            });
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteHighlight(pageNum, foundHighlight.id);
                deleteBtn.remove();
                deleteBtn = null;
                currentHighlightId = null;
            });
            
            document.body.appendChild(deleteBtn);
        } else if (!foundHighlight && deleteBtn) {
            // ✅ إزالة الزر إذا غادر المؤشر المستطيل
            deleteBtn.remove();
            deleteBtn = null;
            currentHighlightId = null;
        }
    });
    
    // ✅ تنظيف عند مغادرة الـ canvas
    canvas.addEventListener('mouseleave', () => {
        if (deleteBtn) {
            deleteBtn.remove();
            deleteBtn = null;
            currentHighlightId = null;
        }
    });
}

// ============================================
// Page Navigation Functions
// ============================================

function togglePageInput() {
    const isActive = pageInputContainer?.classList.contains('active');
    
    if (isActive) {
        // Hide input, show display
        pageInputContainer?.classList.remove('active');
        pageInfoDisplay?.classList.remove('editing');
    } else {
        // Show input, hide display
        pageInputContainer?.classList.add('active');
        pageInfoDisplay?.classList.add('editing');
        
        // Focus input and set current page
        if (pageInput && currentPageSpan) {
            pageInput.value = currentPageSpan.textContent;
            pageInput.max = pageCountSpan?.textContent || '1';
            setTimeout(() => pageInput.focus(), 100);
        }
    }
}

async function jumpToPage() {
    const targetPage = parseInt(pageInput?.value || '1');
    const maxPage = parseInt(pageCountSpan?.textContent || '1');
    
    if (!targetPage || targetPage < 1 || targetPage > maxPage) {
        alert(`Please enter a page number between 1 and ${maxPage}`);
        return;
    }
    
    // ✅ البحث عن الصفحة المستهدفة
    const pageElement = document.getElementById(`page-${targetPage}`);
    if (pageElement && viewerContent) {
        // ✅ إخفاء الـ input بعد القفز
        pageInputContainer?.classList.remove('active');
        pageInfoDisplay?.classList.remove('editing');
        
        // ✅ تحديث رقم الصفحة الحالي فوراً (مع "Loading..." إذا لم تكن محملة)
        if (currentPageSpan) {
            if (pageElement.classList.contains('loading') && !renderedPages.has(targetPage)) {
                currentPageSpan.textContent = `${targetPage}...`;
            } else {
                currentPageSpan.textContent = targetPage;
            }
        }
        
        // ✅ تحميل الصفحة إذا لم تكن محملة (Lazy Loading)
        if (pageElement.classList.contains('loading') && !renderedPages.has(targetPage)) {
            await renderPage(targetPage);
            // ✅ تحديث رقم الصفحة بعد التحميل
            if (currentPageSpan) {
                currentPageSpan.textContent = targetPage;
            }
        }
        
        // ✅ القفز لبداية الصفحة (top alignment)
        const pageOffsetTop = pageElement.offsetTop;
        const navbarHeight = 0; // لا يوجد navbar في الأسفل
        const targetScrollTop = pageOffsetTop - navbarHeight - 20; // مسافة 20px من الأعلى
        
        viewerContent.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth'
        });
    }
}

async function jumpToPageFromNavbar() {
    const targetPage = parseInt(navbarPageInput?.value || '1');
    const maxPage = parseInt(pageCountNavbar?.textContent || '1');
    
    if (!targetPage || targetPage < 1 || targetPage > maxPage) {
        alert(`Please enter a page number between 1 and ${maxPage}`);
        return;
    }
    
    // ✅ إخفاء الـ input
    pageInputWrapper?.classList.remove('active');
    pageInputWrapper?.classList.add('hidden');
    if (pageCounterDisplay) pageCounterDisplay.style.display = 'flex';
    
    // ✅ البحث عن الصفحة المستهدفة
    const pageElement = document.getElementById(`page-${targetPage}`);
    if (pageElement && viewerContent) {
        // ✅ تحميل الصفحة فوراً إذا لم تكن محملة
        if (pageElement.classList.contains('loading') && !renderedPages.has(targetPage)) {
            console.log(`🚀 Force loading page ${targetPage} for jump`);
            await renderPage(targetPage);
            
            // ✅ تحميل الصفحات المجاورة أيضاً (للسلاسة)
            const preloadPages = [targetPage - 1, targetPage + 1, targetPage + 2];
            for (const pageNum of preloadPages) {
                if (pageNum > 0 && pageNum <= maxPage && !renderedPages.has(pageNum)) {
                    const preloadElement = document.getElementById(`page-${pageNum}`);
                    if (preloadElement && preloadElement.classList.contains('loading')) {
                        renderPage(pageNum); // بدون await - background loading
                    }
                }
            }
        }
        
        // ✅ القفز الدقيق لبداية الصفحة
        const pageOffsetTop = pageElement.offsetTop;
        const navbarHeight = 65; // ارتفاع الـ navbar العلوي
        const targetScrollTop = pageOffsetTop - navbarHeight - 20; // مسافة 20px من الأعلى
        
        viewerContent.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth'
        });
        
        // ✅ تحديث العدادات بعد القفز
        setTimeout(() => {
            if (currentPageSpan) currentPageSpan.textContent = targetPage;
            if (currentPageNavbar) currentPageNavbar.textContent = targetPage;
        }, 100);
    }
}

async function jumpToPageNumber(pageNum) {
    const pageElement = document.getElementById(`page-${pageNum}`);
    if (pageElement && viewerContent) {
        // ✅ تحميل الصفحة إذا لم تكن محملة
        if (pageElement.classList.contains('loading') && !renderedPages.has(pageNum)) {
            await renderPage(pageNum);
        }
        
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        updateCurrentPage();
    }
}

// ✅ دالة جديدة: القفز بدقة لموقع التحديد
function jumpToHighlight(pageNum, highlightId) {
    const pageElement = document.getElementById(`page-${pageNum}`);
    if (!pageElement || !viewerContent) return;
    
    // الحصول على معلومات التحديد
    if (!currentPdfPath || !highlights[currentPdfPath]?.[pageNum]) {
        // إذا لم تتوفر معلومات التحديد، استخدم القفز العادي
        jumpToPageNumber(pageNum);
        return;
    }
    
    const highlightDataArray = highlights[currentPdfPath][pageNum];
    const highlightsToCheck = Array.isArray(highlightDataArray) ? highlightDataArray : [highlightDataArray];
    
    // البحث عن التحديد المطلوب
    const highlightData = highlightsToCheck.find(h => h.id === highlightId);
    
    if (!highlightData || !highlightData.rect) {
        // إذا لم يتم العثور على rect، استخدم القفز العادي
        jumpToPageNumber(pageNum);
        return;
    }
    
    // ✅ حساب الموقع الدقيق للتحديد داخل الصفحة
    const rect = highlightData.rect;
    const canvas = pageElement.querySelector('canvas');
    
    if (!canvas) {
        jumpToPageNumber(pageNum);
        return;
    }
    
    // حساب النسبة المئوية لموقع التحديد في الصفحة
    const highlightCenterY = rect.y + (rect.height / 2);
    const highlightRatioY = highlightCenterY / canvas.height;
    
    // حساب الموقع المطلوب للـ scroll
    const pageRect = pageElement.getBoundingClientRect();
    const pageOffsetTop = pageElement.offsetTop;
    const pageHeight = pageRect.height;
    
    // موقع التحديد داخل الصفحة
    const highlightOffsetInPage = pageHeight * highlightRatioY;
    
    // الموقع المطلوب للـ scroll (وضع التحديد في منتصف الشاشة)
    const targetScrollTop = pageOffsetTop + highlightOffsetInPage - (viewerContent.clientHeight / 2);
    
    // التمرير بسلاسة
    viewerContent.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
    });
    
    // تحديث رقم الصفحة الحالية
    setTimeout(() => {
        updateCurrentPage();
    }, 300);
}

// ============================================
// Reading Position Management
// ============================================

function saveReadingPosition() {
    if (!currentPdfPath || !viewerContent) return;
    
    const scrollTop = viewerContent.scrollTop;
    const scrollLeft = viewerContent.scrollLeft;
    const currentPage = parseInt(currentPageSpan?.textContent || '1');
    
    readingPositions[currentPdfPath] = {
        scrollTop,
        scrollLeft,
        currentPage,
        scale,
        lastRead: Date.now(), // ✅ آخر وقت قراءة
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('readingPositions', JSON.stringify(readingPositions));
    console.log('Reading position saved:', readingPositions[currentPdfPath]);
}

function restoreReadingPosition() {
    if (!currentPdfPath || !viewerContent) return;
    
    const position = readingPositions[currentPdfPath];
    if (!position) {
        console.log('No saved position for this PDF - Starting from beginning');
        // ✅ البدء من الصفحة الأولى إذا لم يكن هناك موقع محفوظ
        setTimeout(() => {
            if (viewerContent) {
                viewerContent.scrollTop = 0;
                viewerContent.scrollLeft = 0;
            }
        }, 300);
        return;
    }
    
    console.log('Restoring reading position:', position);
    
    // Restore scale if saved
    if (position.scale) {
        scale = position.scale;
        updateZoomDisplay();
    }
    
    // Restore scroll position after rendering
    setTimeout(() => {
        if (viewerContent) {
            viewerContent.scrollTop = position.scrollTop || 0;
            viewerContent.scrollLeft = position.scrollLeft || 0;
        }
    }, 300);
}

// Auto-save position every 3 seconds while viewing
function startAutoSave() {
    stopAutoSave();
    savePositionInterval = setInterval(() => {
        if (!viewerOverlay?.classList.contains('hidden')) {
            saveReadingPosition();
        }
    }, 3000);
}

function stopAutoSave() {
    if (savePositionInterval) {
        clearInterval(savePositionInterval);
        savePositionInterval = null;
    }
}

// Save position on scroll (debounced)
viewerContent?.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        if (!viewerOverlay?.classList.contains('hidden')) {
            saveReadingPosition();
        }
    }, 500);
});

// ============================================
// Highlights Sidebar Functions
// ============================================

function toggleHighlightsSidebar() {
    const isHidden = highlightsSidebar?.classList.contains('hidden');
    
    if (isHidden) {
        highlightsSidebar?.classList.remove('hidden');
        showHighlightsBtn?.classList.add('active');
        updateHighlightsList();
    } else {
        highlightsSidebar?.classList.add('hidden');
        showHighlightsBtn?.classList.remove('active');
    }
}

function updateHighlightsList() {
    if (!highlightsContent || !currentPdfPath) return;
    
    const pdfHighlights = highlights[currentPdfPath];
    
    // إذا لا توجد highlights
    if (!pdfHighlights || Object.keys(pdfHighlights).length === 0) {
        highlightsContent.innerHTML = `
            <div class="empty-highlights">
                <i class="fas fa-bookmark"></i>
                <p>No highlights yet</p>
                <small>Start highlighting to see them here</small>
            </div>
        `;
        return;
    }
    
    // بناء قائمة الـ highlights
    let highlightsHTML = '';
    const pageNums = Object.keys(pdfHighlights).sort((a, b) => parseInt(a) - parseInt(b));
    
    // ✅ عرض جميع التحديدات (حتى لو كانت في نفس الصفحة)
    pageNums.forEach(pageNum => {
        const highlightDataArray = pdfHighlights[pageNum];
        
        // دعم الصيغة القديمة والجديدة
        const highlightsToDisplay = Array.isArray(highlightDataArray) ? highlightDataArray : [highlightDataArray];
        
        highlightsToDisplay.forEach((highlightData, index) => {
            const color = highlightData.color || currentHighlightColor;
            const highlightId = highlightData.id || null;
            
            // دعم الصيغة القديمة والجديدة
            const timestamp = highlightData.timestamp ? new Date(highlightData.timestamp) : new Date();
            const date = timestamp.toLocaleDateString();
            const time = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // ✅ عرض رقم التحديد إذا كان هناك أكثر من تحديد في نفس الصفحة
            const highlightLabel = highlightsToDisplay.length > 1 ? ` (#${index + 1})` : '';
            
            // ✅ الحصول على الملاحظة
            const note = highlightData.note || '';
            const hasNote = note.length > 0;
            
            highlightsHTML += `
                <div class="highlight-item ${hasNote ? 'has-note' : ''}" data-page="${pageNum}" data-highlight-id="${highlightId}" style="--highlight-color: ${color}">
                    <div class="highlight-thumbnail">
                        <canvas class="thumb-canvas" data-pagenum="${pageNum}" data-highlight-index="${index}" width="280" height="100"></canvas>
                    </div>
                    <div class="highlight-info">
                        <div class="highlight-page">
                            <i class="fas fa-file-pdf"></i>
                            Page ${pageNum}${highlightLabel}
                        </div>
                        <div class="highlight-date">${date} ${time}</div>
                        ${hasNote ? `
                        <div class="highlight-note-preview" title="${note.replace(/"/g, '&quot;')}">
                            <i class="fas fa-sticky-note"></i>
                            <span>${note.length > 50 ? note.substring(0, 50) + '...' : note}</span>
                        </div>
                        ` : ''}
                    </div>
                    <div class="highlight-color-indicator" style="background: ${color}"></div>
                    ${hasNote ? `<div class="highlight-note-indicator" title="Has note"><i class="fas fa-sticky-note"></i></div>` : ''}
                    <button class="delete-highlight-btn" data-page="${pageNum}" data-highlight-id="${highlightId}" title="Delete highlight">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
        });
    });
    
    highlightsContent.innerHTML = highlightsHTML;
    
    // ✅ رسم الثومبنيلات على الـ canvas
    document.querySelectorAll('.thumb-canvas').forEach(thumbCanvas => {
        const pageNum = thumbCanvas.dataset.pagenum;
        const highlightIndex = parseInt(thumbCanvas.dataset.highlightIndex);
        const highlightDataArray = pdfHighlights[pageNum];
        
        const highlightsToDisplay = Array.isArray(highlightDataArray) ? highlightDataArray : [highlightDataArray];
        const highlightData = highlightsToDisplay[highlightIndex];
        
        if (!highlightData) return;
        
        // دعم الصيغة القديمة (string) والجديدة (object)
        const highlightURL = typeof highlightData === 'string' ? highlightData : highlightData.highlight;
        const pdfURL = typeof highlightData === 'object' ? highlightData.pdf : null;
        const rectBounds = typeof highlightData === 'object' ? highlightData.rect : null;
        
        const thumbCtx = thumbCanvas.getContext('2d');
        
        // ✅ إذا كانت إحداثيات المستطيل موجودة - عرض المنطقة المحددة فقط
        if (pdfURL && rectBounds && rectBounds.width > 0 && rectBounds.height > 0) {
            const pdfImg = new Image();
            pdfImg.onload = () => {
                // ✅ قص المنطقة المحددة فقط من صورة PDF
                const { x, y, width, height } = rectBounds;
                
                // حساب النسبة للاحتفاظ بالأبعاد
                const scale = Math.min(280 / width, 100 / height);
                const scaledWidth = width * scale;
                const scaledHeight = height * scale;
                const drawX = (280 - scaledWidth) / 2;
                const drawY = (100 - scaledHeight) / 2;
                
                // رسم المنطقة المحددة فقط (cropped)
                thumbCtx.drawImage(
                    pdfImg,
                    x, y, width, height, // المنطقة من الصورة الأصلية
                    drawX, drawY, scaledWidth, scaledHeight // المنطقة في الثومبنيل
                );
            };
            pdfImg.src = pdfURL;
        }
        // ✅ الصيغة القديمة أو بدون إحداثيات - عرض الصفحة كاملة + الهايلايت
        else if (pdfURL) {
            const pdfImg = new Image();
            pdfImg.onload = () => {
                const scale = Math.min(280 / pdfImg.width, 100 / pdfImg.height);
                const width = pdfImg.width * scale;
                const height = pdfImg.height * scale;
                const x = (280 - width) / 2;
                const y = (100 - height) / 2;
                
                // رسم PDF أولاً
                thumbCtx.drawImage(pdfImg, x, y, width, height);
                
                // ثم رسم الهايلايت فوقه
                const highlightImg = new Image();
                highlightImg.onload = () => {
                    thumbCtx.drawImage(highlightImg, x, y, width, height);
                };
                highlightImg.src = highlightURL;
            };
            pdfImg.src = pdfURL;
        } else {
            // الصيغة القديمة جداً - رسم الهايلايت فقط
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(280 / img.width, 100 / img.height);
                const width = img.width * scale;
                const height = img.height * scale;
                const x = (280 - width) / 2;
                const y = (100 - height) / 2;
                
                thumbCtx.drawImage(img, x, y, width, height);
            };
            img.src = highlightURL;
        }
    });
    
    // ✅ إضافة Event Listeners لأزرار الحذف
    document.querySelectorAll('.delete-highlight-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // منع الانتقال للصفحة
            const pageNum = parseInt(btn.dataset.page);
            const highlightId = btn.dataset.highlightId;
            
            if (confirm('Delete this highlight?')) {
                deleteHighlight(pageNum, highlightId);
            }
        });
    });
    
    // إضافة Event Listeners للانتقال
    document.querySelectorAll('.highlight-item').forEach(item => {
        item.addEventListener('click', () => {
            const pageNum = parseInt(item.dataset.page);
            const highlightId = item.dataset.highlightId;
            
            // ✅ القفز بدقة لموقع التحديد (وليس وسط الصفحة)
            jumpToHighlight(pageNum, highlightId);
            
            // إغلاق السايد بار بعد الانتقال
            setTimeout(() => {
                highlightsSidebar?.classList.add('hidden');
                showHighlightsBtn?.classList.remove('active');
            }, 300);
        });
    });
}

// ============================================
// ✅ KEYBOARD SHORTCUTS - اختصارات لوحة المفاتيح
// ============================================

document.addEventListener('keydown', function(e) {
    console.log('⌨️ Key pressed:', e.key);
    
    // ==========================================
    // ✅ ESC KEY - أولوية قصوى
    // ==========================================
    if (e.key === 'Escape') {
        console.log('🔴 ESC detected!');
        e.preventDefault();
        e.stopPropagation();
        
        // تحقق من حالة PDF
        const isPdfOpen = viewerOverlay && !viewerOverlay.classList.contains('hidden');
        console.log('📄 PDF Open Status:', isPdfOpen);
        
        // 1. إغلاق Dialogs/Menus أولاً
        if (updateDialog && !updateDialog.classList.contains('hidden')) {
            console.log('✅ Closing Update Dialog');
            updateDialog.classList.add('hidden');
            return;
        }
        
        if (settingsMenu && !settingsMenu.classList.contains('hidden')) {
            console.log('✅ Closing Settings Menu');
            settingsMenu.classList.add('hidden');
            return;
        }
        
        if (contextMenu && !contextMenu.classList.contains('hidden')) {
            console.log('✅ Closing Context Menu');
            contextMenu.classList.add('hidden');
            return;
        }
        
        if (emptyContextMenu && !emptyContextMenu.classList.contains('hidden')) {
            console.log('✅ Closing Empty Context Menu');
            emptyContextMenu.classList.add('hidden');
            return;
        }
        
        // 2. إذا كان PDF مفتوح
        if (isPdfOpen) {
            // تحقق من input box
            if (pageInputWrapper && !pageInputWrapper.classList.contains('hidden')) {
                console.log('✅ Closing input box');
                pageInputWrapper.classList.remove('active');
                pageInputWrapper.classList.add('hidden');
                if (pageCounterDisplay) {
                    pageCounterDisplay.style.display = 'flex';
                }
                return;
            }
            
            // أغلق PDF
            console.log('🔴 Closing PDF - Calling closeViewer()');
            try {
                closeViewer();
                console.log('✅ closeViewer() executed successfully');
            } catch (error) {
                console.error('❌ Error closing viewer:', error);
            }
            return;
        }
        
        // 3. إذا كنا في المكتبة، افتح آخر PDF
        if (!isPdfOpen && lastOpenedPdf) {
            console.log('🔴 Opening last PDF:', lastOpenedPdf);
            try {
                openViewer(lastOpenedPdf);
                console.log('✅ openViewer() executed successfully');
            } catch (error) {
                console.error('❌ Error opening viewer:', error);
            }
            return;
        }
        
        console.log('⚠️ ESC pressed but no action (no last PDF)');
        return;
    }
    
    // ==========================================
    // باقي الاختصارات
    // ==========================================
    
    // تجاهل إذا كان المستخدم يكتب
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    // تحقق من أن PDF مفتوح
    const isPdfOpen = viewerOverlay && !viewerOverlay.classList.contains('hidden');
    if (!isPdfOpen) return;
    
    // + أو = - تكبير
    if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
    }
    
    // - - تصغير
    if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
    }
    
    // 0 - Fit to Width
    if (e.key === '0') {
        e.preventDefault();
        resetZoom();
    }
    
    // Ctrl + I - عكس الألوان
    if (e.ctrlKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        toggleInvertColors();
    }
});

// ============================================
// Library Refresh Function
// ============================================

function refreshLibrary() {
    console.log('🔄 Refreshing library...');
    
    // إعادة تحميل البيانات من localStorage
    pdfs = JSON.parse(localStorage.getItem('pdfs') || '[]');
    
    // ✅ تحديث موقع الكتاب فقط (بدون رسم كامل)
    // البحث عن الكتاب الحالي وتحديث حالته
    if (currentPdfPath) {
        const pdf = pdfs.find(p => p.path === currentPdfPath);
        if (pdf) {
            // البحث عن البطاقة في الشبكة
            const allCards = [...document.querySelectorAll('.pdf-card')];
            const card = allCards.find(c => {
                const titleElement = c.querySelector('.pdf-title');
                return titleElement && titleElement.textContent === pdf.name.replace('.pdf', '');
            });
            
            if (card) {
                const targetGrid = pdf.read ? readGrid : pdfGrid;
                const currentGrid = card.parentElement;
                
                // ✅ نقل البطاقة فقط إذا تغيرت حالتها
                if (targetGrid && currentGrid !== targetGrid) {
                    // إضافة animation للانتقال
                    card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.9)';
                    
                    setTimeout(() => {
                        targetGrid.appendChild(card);
                        
                        // إعادة الظهور
                        setTimeout(() => {
                            card.style.opacity = '1';
                            card.style.transform = 'scale(1)';
                        }, 50);
                        
                        // تحديث empty states
                        updateEmptyStates();
                        
                        // إظهار/إخفاء قسم Already Read
                        const readSection = document.getElementById('read-section');
                        const readCards = readGrid?.querySelectorAll('.pdf-card');
                        if (readCards && readCards.length > 0) {
                            readSection?.classList.remove('hidden');
                        } else {
                            readSection?.classList.add('hidden');
                        }
                    }, 300);
                }
            }
        }
    }
    
    console.log('✅ Library refreshed (card moved only)');
}

// ============================================
// Search Functionality
// ============================================

const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
let currentSearchQuery = '';

// Search input event
searchInput?.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.trim().toLowerCase();
    
    // إظهار/إخفاء زر المسح
    if (currentSearchQuery) {
        clearSearchBtn?.classList.remove('hidden');
    } else {
        clearSearchBtn?.classList.add('hidden');
    }
    
    // تطبيق البحث
    applySearch();
});

// Clear search button
clearSearchBtn?.addEventListener('click', () => {
    searchInput.value = '';
    currentSearchQuery = '';
    clearSearchBtn?.classList.add('hidden');
    applySearch();
});

function applySearch() {
    const allCards = document.querySelectorAll('.pdf-card');
    
    allCards.forEach(card => {
        const title = card.querySelector('.pdf-title')?.textContent.toLowerCase() || '';
        
        if (!currentSearchQuery || title.includes(currentSearchQuery)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
    
    // تحديث empty states
    updateEmptyStates();
}

function updateEmptyStates() {
    const unreadCards = pdfGrid?.querySelectorAll('.pdf-card:not([style*="display: none"])');
    const readCards = readGrid?.querySelectorAll('.pdf-card:not([style*="display: none"])');
    
    // Unread section
    if (unreadCards && unreadCards.length === 0) {
        emptyState?.classList.remove('hidden');
        if (currentSearchQuery) {
            emptyState.querySelector('h2').textContent = 'No results found';
            emptyState.querySelector('p').textContent = `No PDFs match "${currentSearchQuery}"`;
        } else {
            emptyState.querySelector('h2').textContent = 'No PDFs in your library';
            emptyState.querySelector('p').textContent = 'Right-click anywhere to add PDFs';
        }
    } else {
        emptyState?.classList.add('hidden');
    }
    
    // Read section
    if (readCards && readCards.length === 0) {
        emptyReadState?.classList.remove('hidden');
    } else {
        emptyReadState?.classList.add('hidden');
    }
}

// ============================================
// Rename Modal - Modern UI
// ============================================

const renameModal = document.getElementById('rename-modal');
const renameInput = document.getElementById('rename-input');
const renameCurrentName = document.getElementById('rename-current-name');
const renameCoverImg = document.getElementById('rename-cover-img');
const renameCancelBtn = document.getElementById('rename-cancel');
const renameConfirmBtn = document.getElementById('rename-confirm');

let currentRenamePdf = null;

async function openRenameModal(pdf) {
    currentRenamePdf = pdf;
    
    // ✅ إزالة .pdf نهائياً من اسم الكتاب
    const nameWithoutExt = pdf.name.replace(/\.pdf$/i, '');
    
    // Set input value (بدون .pdf)
    renameInput.value = nameWithoutExt;
    
    // Set current name display (بدون .pdf)
    if (renameCurrentName) {
        renameCurrentName.textContent = nameWithoutExt;
    }
    
    // ✅ تحميل صورة الغلاف
    try {
        const thumbnail = await generateThumbnail(pdf.path);
        if (thumbnail) {
            renameCoverImg.src = thumbnail;
            renameCoverImg.classList.add('loaded');
        }
    } catch (error) {
        console.error('Error loading cover:', error);
        renameCoverImg.classList.remove('loaded');
    }
    
    // Show modal
    renameModal.classList.remove('hidden');
    
    // Focus input and select all
    setTimeout(() => {
        renameInput.focus();
        renameInput.select();
    }, 150);
}

function closeRenameModal() {
    renameModal.classList.add('hidden');
    currentRenamePdf = null;
    renameCoverImg.classList.remove('loaded');
    renameCoverImg.src = '';
}

async function confirmRename() {
    if (!currentRenamePdf) return;
    
    let newName = renameInput.value.trim();
    
    // ✅ منع الاسم الفارغ
    if (!newName) {
        alert('⚠️ Please enter a valid name');
        renameInput.focus();
        return;
    }
    
    // ✅ إزالة أي .pdf أو فورمات آخر من الإدخال
    newName = newName.replace(/\.(pdf|epub|doc|docx|txt)$/i, '');
    
    if (!newName) {
        alert('⚠️ Please enter a valid name');
        renameInput.focus();
        return;
    }
    
    // ✅ إضافة .pdf تلقائياً
    const newFileName = newName + '.pdf';
    
    // ✅ إعادة تسمية الملف في BooksStorage
    try {
        const newPath = await window.electronAPI.renamePdfInStorage(
            currentRenamePdf.path,
            newFileName
        );
        
        // ✅ تحديث البيانات
        currentRenamePdf.path = newPath;
        currentRenamePdf.name = newFileName;
        
        saveAndRender();
        closeRenameModal();
        
        console.log(`✅ Renamed to: ${newFileName}`);
    } catch (error) {
        console.error('Error renaming PDF:', error);
        alert('❌ Failed to rename: ' + error.message);
    }
}

// ✅ Event Listeners
renameCancelBtn?.addEventListener('click', closeRenameModal);
renameConfirmBtn?.addEventListener('click', confirmRename);

// ✅ Close on overlay click
renameModal?.addEventListener('click', (e) => {
    if (e.target === renameModal || e.target.classList.contains('rename-modal-overlay')) {
        closeRenameModal();
    }
});

// ✅ Enter to confirm, Escape to cancel
renameInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        confirmRename();
    } else if (e.key === 'Escape') {
        e.preventDefault();
        closeRenameModal();
    }
});

// ============================================
// ✨ DRAG & DROP SUPPORT
// ============================================

// منع السلوك الافتراضي للمتصفح
document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

// إضافة مؤشر بصري عند السحب فوق النافذة
let dragCounter = 0;

mainContainer?.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter++;
    if (dragCounter === 1) {
        mainContainer.classList.add('drag-active');
        console.log('🎯 Drag entered - counter:', dragCounter);
    }
});

mainContainer?.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter--;
    if (dragCounter === 0) {
        mainContainer.classList.remove('drag-active');
        console.log('🎯 Drag left - counter:', dragCounter);
    }
});

mainContainer?.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

// معالجة الملفات المسحوبة
mainContainer?.addEventListener('drop', async (e) => {
    e.preventDefault();
    dragCounter = 0;
    mainContainer.classList.remove('drag-active');
    
    // ✅ التحقق من وجود ملفات
    if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) {
        console.warn('⚠️ No files dropped');
        return;
    }
    
    console.log('📥 Files dropped:', e.dataTransfer.files.length);
    
    // ✅ في Electron، الملفات لها خاصية path
    const files = [];
    for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        console.log(`File ${i}:`, {
            name: file.name,
            type: file.type,
            size: file.size,
            path: file.path || 'no path'
        });
        
        // التحقق من نوع الملف
        if (file.type === 'application/pdf' || 
            (file.name && file.name.toLowerCase().endsWith('.pdf')) ||
            (file.path && file.path.toLowerCase().endsWith('.pdf'))) {
            files.push(file);
        }
    }
    
    if (files.length === 0) {
        alert('⚠️ Please drop PDF files only');
        return;
    }
    
    console.log(`✅ Valid PDF files: ${files.length}`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // إضافة الملفات إلى المكتبة
    for (const file of files) {
        try {
            // ✅ الحصول على المسار الفعلي للملف
            const filePath = file.path;
            
            if (!filePath) {
                console.error('❌ File path not available. Electron webPreferences may need adjustment.');
                errorCount++;
                continue;
            }
            
            console.log(`📄 Processing: ${filePath}`);
            
            // نسخ الملف إلى BooksStorage
            const storagePath = await window.electronAPI.copyPdfToStorage(filePath);
            
            // التحقق من عدم وجود تكرار
            if (!pdfs.some(p => p.path === storagePath)) {
                const name = storagePath.split(/[\\/]/).pop();
                pdfs.push({
                    path: storagePath,
                    name,
                    read: false,
                    dateAdded: Date.now(),
                    addedAt: new Date().toISOString()
                });
                console.log(`✅ Added: ${name}`);
                successCount++;
            } else {
                console.log(`⚠️ Already exists: ${file.name}`);
            }
        } catch (error) {
            console.error(`❌ Error adding ${file.name}:`, error);
            errorCount++;
        }
    }
      if (successCount > 0) {
        saveAndRender();
        
        // إظهار رسالة نجاح
        const notification = document.createElement('div');
        notification.className = 'drop-notification';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>Added ${successCount} PDF${successCount > 1 ? 's' : ''} to library</span>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);    }
    
    if (errorCount > 0) {
        alert(`⚠️ Failed to add ${errorCount} file${errorCount > 1 ? 's' : ''}. Check console for details.`);
    }
});

// ============================================
// ✨ OPEN EXTERNAL PDF FROM SYSTEM
// ============================================

// استقبال ملفات PDF من النظام (عند النقر المزدوج على ملف PDF)
window.electronAPI.onOpenExternalPdf(async (filePath) => {
    console.log(`📂 Opening external PDF: ${filePath}`);
    
    try {
        // التحقق من وجود الملف
        const exists = await window.electronAPI.checkFileExists(filePath);
        if (!exists) {
            alert('❌ File not found');
            return;
        }
        
        // فتح الملف مباشرة في واجهة القراءة
        currentPdfPath = filePath;
        lastOpenedPdf = null; // لأنه ليس من المكتبة
        
        // فتح الـ Viewer
        viewerOverlay?.classList.remove('hidden');
        mainContainer?.classList.add('hidden');
        
        // تحميل الـ PDF
        await loadPdf(filePath);
        
        console.log('✅ External PDF opened successfully');
    } catch (error) {
        console.error('❌ Error opening external PDF:', error);
        alert('Failed to open PDF: ' + error.message);
    }
});
