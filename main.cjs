const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    center: true,
    title: 'Attendance Dashboard',
    backgroundColor: '#1e1e2f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    show: false, // Show after ready-to-show for smoothness
    icon: path.join(__dirname, 'public', 'icon.png'),
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  // Load Vite dev server in development, or index.html in production
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5175');
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('web-contents-created', (_, contents) => {
  contents.on('context-menu', (e) => e.preventDefault());
}); 