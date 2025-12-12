const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

// ✅ Auto-updater configuration
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// ✅ مجلد BooksStorage لتخزين نسخ الكتب
const BOOKS_STORAGE_PATH = path.join(app.getPath('userData'), 'BooksStorage');

// إنشاء المجلد إذا لم يكن موجوداً
if (!fs.existsSync(BOOKS_STORAGE_PATH)) {
    fs.mkdirSync(BOOKS_STORAGE_PATH, { recursive: true });
    console.log('📁 Created BooksStorage folder:', BOOKS_STORAGE_PATH);
}

// ✅ متغير لتخزين ملفات PDF المفتوحة من النظام
let pendingPdfToOpen = null;

// ✅ دعم فتح ملفات PDF من النظام (Windows)
if (process.platform === 'win32' && process.argv.length >= 2) {
    const filePath = process.argv[1];
    if (filePath && filePath.toLowerCase().endsWith('.pdf')) {
        pendingPdfToOpen = filePath;
    }
}

// ✅ دعم فتح ملفات PDF من النظام (macOS)
app.on('open-file', (event, filePath) => {
    event.preventDefault();
    if (filePath && filePath.toLowerCase().endsWith('.pdf')) {
        pendingPdfToOpen = filePath;
        // إذا كان التطبيق جاهز، افتح الملف مباشرة
        const allWindows = BrowserWindow.getAllWindows();
        if (allWindows.length > 0) {
            allWindows[0].webContents.send('open-external-pdf', filePath);
        }
    }
});

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false, // Frameless window
        icon: path.join(__dirname, 'icon.png'), // App icon
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            // ✅ تفعيل الوصول للملفات في Drag & Drop
            enableRemoteModule: true
        },        backgroundColor: '#1a1a1a',
        show: false,
        title: 'Kita PDF Reader'
    });

    win.maximize(); // Start maximized

    win.loadFile('index.html');    win.once('ready-to-show', () => {
        win.show();
        
        // ✅ إذا كان هناك ملف PDF تم فتحه من النظام، أرسله للواجهة
        if (pendingPdfToOpen) {
            setTimeout(() => {
                win.webContents.send('open-external-pdf', pendingPdfToOpen);
                pendingPdfToOpen = null;
            }, 1000); // انتظر ثانية حتى يكتمل تحميل الواجهة
        }
    });

    // Open external links in default browser
    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
    
    // ✅ دعم Drag & Drop لملفات PDF
    win.webContents.on('will-navigate', (event, url) => {
        event.preventDefault();
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers
ipcMain.handle('select-pdf', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'PDFs', extensions: ['pdf'] }]
    });
    return result.filePaths;
});

// ✅ نسخ الكتاب إلى BooksStorage
ipcMain.handle('copy-pdf-to-storage', async (event, originalPath) => {
    try {
        // ✅ التأكد من وجود المجلد (حماية إضافية)
        if (!fs.existsSync(BOOKS_STORAGE_PATH)) {
            fs.mkdirSync(BOOKS_STORAGE_PATH, { recursive: true });
            console.log('📁 Created BooksStorage folder');
        }
        
        // ✅ التحقق من وجود الملف الأصلي
        if (!fs.existsSync(originalPath)) {
            console.error(`❌ Source file does not exist: ${originalPath}`);
            throw new Error(`File not found: ${originalPath}`);
        }
        
        const fileName = path.basename(originalPath);
        const destinationPath = path.join(BOOKS_STORAGE_PATH, fileName);
        
        // ✅ إذا كان الملف موجود بالفعل، أضف رقم للاسم
        let finalPath = destinationPath;
        let counter = 1;
        while (fs.existsSync(finalPath)) {
            const ext = path.extname(fileName);
            const nameWithoutExt = path.basename(fileName, ext);
            finalPath = path.join(BOOKS_STORAGE_PATH, `${nameWithoutExt} (${counter})${ext}`);
            counter++;
        }
        
        // ✅ نسخ الملف
        fs.copyFileSync(originalPath, finalPath);
        console.log(`✅ Copied book to storage: ${path.basename(finalPath)}`);
        
        return finalPath;
    } catch (error) {
        console.error('❌ Error copying PDF to storage:', error);
        throw error;
    }
});

// ✅ إعادة تسمية الكتاب في BooksStorage
ipcMain.handle('rename-pdf-in-storage', async (event, oldPath, newName) => {
    try {
        if (!fs.existsSync(oldPath)) {
            throw new Error('File not found');
        }
        
        const dir = path.dirname(oldPath);
        const newPath = path.join(dir, newName);
        
        // ✅ إعادة التسمية
        fs.renameSync(oldPath, newPath);
        console.log(`✏️ Renamed: ${path.basename(oldPath)} → ${newName}`);
        
        return newPath;
    } catch (error) {
        console.error('Error renaming PDF:', error);
        throw error;
    }
});

// ✅ حذف الكتاب من BooksStorage
ipcMain.handle('delete-pdf-from-storage', async (event, filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ File not found, already deleted: ${filePath}`);
            return true; // اعتبره محذوف
        }
        
        // ✅ حذف الملف
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted book from storage: ${path.basename(filePath)}`);
        
        return true;
    } catch (error) {
        console.error('❌ Error deleting PDF from storage:', error);
        throw error;
    }
});

// ✅ التحقق من وجود الملف
ipcMain.handle('check-file-exists', async (event, filePath) => {
    try {
        return fs.existsSync(filePath);
    } catch (error) {
        return false;
    }
});

// ✅ فتح مجلد BooksStorage
ipcMain.handle('open-storage-folder', async () => {
    try {
        // ✅ إنشاء المجلد إذا لم يكن موجوداً
        if (!fs.existsSync(BOOKS_STORAGE_PATH)) {
            fs.mkdirSync(BOOKS_STORAGE_PATH, { recursive: true });
            console.log('📁 Created BooksStorage folder');
        }
        
        shell.openPath(BOOKS_STORAGE_PATH);
        console.log('📂 Opened BooksStorage folder:', BOOKS_STORAGE_PATH);
    } catch (error) {
        console.error('❌ Error opening storage folder:', error);
    }
});

// ✅ قراءة جميع ملفات PDF من BooksStorage
ipcMain.handle('get-books-from-storage', async () => {
    try {
        // ✅ التأكد من وجود المجلد
        if (!fs.existsSync(BOOKS_STORAGE_PATH)) {
            fs.mkdirSync(BOOKS_STORAGE_PATH, { recursive: true });
            console.log('📁 Created BooksStorage folder');
            return []; // المجلد فارغ
        }
        
        const files = fs.readdirSync(BOOKS_STORAGE_PATH);
        const pdfFiles = files
            .filter(file => file.toLowerCase().endsWith('.pdf'))
            .map(file => ({
                name: file,
                path: path.join(BOOKS_STORAGE_PATH, file)
            }));
        
        console.log(`📚 Found ${pdfFiles.length} book(s) in BooksStorage`);
        return pdfFiles;
    } catch (error) {
        console.error('❌ Error reading BooksStorage:', error);
        return [];
    }
});

ipcMain.handle('read-pdf', async (event, filePath) => {
    try {
        const buffer = fs.readFileSync(filePath);
        return buffer;
    } catch (error) {
        console.error('Error reading PDF:', error);
        throw error;
    }
});

// Window Control Handlers
ipcMain.handle('minimize-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.minimize();
});

ipcMain.handle('maximize-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win.isMaximized()) {
        win.unmaximize();
    } else {
        win.maximize();
    }
});

ipcMain.handle('close-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.close();
});

// ═══════════════════════════════════════════════════════════
// 🔄 AUTO-UPDATER HANDLERS
// ═══════════════════════════════════════════════════════════

// Check for updates
ipcMain.handle('check-for-updates', async () => {
    try {
        const result = await autoUpdater.checkForUpdates();
        return {
            success: true,
            updateAvailable: result.updateInfo.version !== app.getVersion(),
            currentVersion: app.getVersion(),
            latestVersion: result.updateInfo.version,
            releaseNotes: result.updateInfo.releaseNotes
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});

// Download update
ipcMain.handle('download-update', async () => {
    try {
        await autoUpdater.downloadUpdate();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ✅ IPC Handler: تثبيت التحديث وإعادة التشغيل
ipcMain.handle('install-update', () => {
    console.log('🔄 Installing update and restarting...');
    // quitAndInstall(isSilent, isForceRunAfter)
    // false = show update installation
    // true = force restart after install
    autoUpdater.quitAndInstall(false, true);
});

// Auto-updater events
autoUpdater.on('update-available', (info) => {
    console.log('🎉 Update available:', info.version);
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('update-available', {
            version: info.version,
            releaseNotes: info.releaseNotes
        });
    });
});

autoUpdater.on('update-not-available', () => {
    console.log('✅ App is up to date');
});

autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent * 10) / 10; // تقريب لرقم عشري واحد
    const speedMB = (progressObj.bytesPerSecond / 1024 / 1024).toFixed(2);
    const downloadedMB = (progressObj.transferred / 1024 / 1024).toFixed(2);
    const totalMB = (progressObj.total / 1024 / 1024).toFixed(2);
    
    console.log(`📥 Download progress: ${percent}% - ${speedMB} MB/s`);
    
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('download-progress', {
            percent: percent,
            speedMB: parseFloat(speedMB),
            downloadedMB: parseFloat(downloadedMB),
            totalMB: parseFloat(totalMB)
        });
    });
});

autoUpdater.on('update-downloaded', () => {
    console.log('✅ Update downloaded');
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('update-downloaded');
    });
});

autoUpdater.on('error', (error) => {
    console.error('❌ Update error:', error);
});
