const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectPdf: () => ipcRenderer.invoke('select-pdf'),
    readPdf: (filePath) => ipcRenderer.invoke('read-pdf', filePath),
    copyPdfToStorage: (originalPath) => ipcRenderer.invoke('copy-pdf-to-storage', originalPath),
    renamePdfInStorage: (oldPath, newName) => ipcRenderer.invoke('rename-pdf-in-storage', oldPath, newName),
    deletePdfFromStorage: (filePath) => ipcRenderer.invoke('delete-pdf-from-storage', filePath),
    checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),
    openStorageFolder: () => ipcRenderer.invoke('open-storage-folder'),
    getBooksFromStorage: () => ipcRenderer.invoke('get-books-from-storage'),
    minimize: () => ipcRenderer.invoke('minimize-window'),
    maximize: () => ipcRenderer.invoke('maximize-window'),
    close: () => ipcRenderer.invoke('close-window')
});
