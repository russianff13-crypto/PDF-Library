const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectPdf: () => ipcRenderer.invoke('select-pdf'),
    readPdf: (filePath) => ipcRenderer.invoke('read-pdf', filePath),
    copyPdfToStorage: (originalPath) => ipcRenderer.invoke('copy-pdf-to-storage', originalPath),
    saveTempFile: (fileName, buffer) => ipcRenderer.invoke('save-temp-file', fileName, buffer),
    renamePdfInStorage: (oldPath, newName) => ipcRenderer.invoke('rename-pdf-in-storage', oldPath, newName),
    deletePdfFromStorage: (filePath) => ipcRenderer.invoke('delete-pdf-from-storage', filePath),
    checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),
    openStorageFolder: () => ipcRenderer.invoke('open-storage-folder'),
    getBooksFromStorage: () => ipcRenderer.invoke('get-books-from-storage'),
    minimize: () => ipcRenderer.invoke('minimize-window'),
    maximize: () => ipcRenderer.invoke('maximize-window'),
    close: () => ipcRenderer.invoke('close-window'),    // Auto-updater
    checkForUpdates: (silent) => ipcRenderer.invoke('check-for-updates', silent),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_, info) => callback(info)),
    onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (_, progress) => callback(progress)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', () => callback()),
    // ✨ فتح PDF من النظام
    onOpenExternalPdf: (callback) => ipcRenderer.on('open-external-pdf', (_, filePath) => callback(filePath))
});
