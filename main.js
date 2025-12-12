const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// ✅ مجلد BooksStorage لتخزين نسخ الكتب
const BOOKS_STORAGE_PATH = path.join(app.getPath('userData'), 'BooksStorage');

// إنشاء المجلد إذا لم يكن موجوداً
if (!fs.existsSync(BOOKS_STORAGE_PATH)) {
    fs.mkdirSync(BOOKS_STORAGE_PATH, { recursive: true });
    console.log('📁 Created BooksStorage folder:', BOOKS_STORAGE_PATH);
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false, // Frameless window
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false
        },
        backgroundColor: '#1a1a1a',
        show: false
    });

    win.maximize(); // Start maximized

    win.loadFile('index.html');

    win.once('ready-to-show', () => {
        win.show();
    });

    // Open external links in default browser
    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
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
