const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs   = require('fs');

// Dev = explicitly flagged OR no dist build present yet
const distIndex = path.join(__dirname, '../dist/index.html');
const isDev = process.env.NODE_ENV === 'development' || !fs.existsSync(distIndex);

// Single-instance lock: if another instance is already running, focus it and exit
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let win  = null;
let tray = null;

function createWindow() {
  win = new BrowserWindow({
    width:    500,
    height:   720,
    minWidth: 360,
    minHeight: 500,
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
    },
    title: 'Eyes on the Prize',
    show:  false,
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  win.once('ready-to-show', () => win.show());

  // Hide to tray instead of closing
  win.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      win.hide();
      tray.displayBalloon({
        title:   'Eyes on the Prize',
        content: 'Still monitoring in the background. Right-click the tray icon to quit.',
        iconType: 'info',
      });
    }
  });
}

function getTrayIcon() {
  const iconPath = path.join(__dirname, '../public/tray-icon.png');
  try {
    const img = nativeImage.createFromPath(iconPath);
    if (!img.isEmpty()) return img.resize({ width: 16, height: 16 });
  } catch {}
  return nativeImage.createEmpty();
}

function createTray() {
  tray = new Tray(getTrayIcon());
  tray.setToolTip('Eyes on the Prize');

  const menu = Menu.buildFromTemplate([
    { label: 'Show',  click: () => { win.show(); win.focus(); } },
    { type: 'separator' },
    { label: 'Quit',  click: () => { app.isQuitting = true; app.quit(); } },
  ]);

  tray.setContextMenu(menu);
  tray.on('click', () => win.isVisible() ? win.focus() : win.show());
}

// Second launch → focus the existing window instead of starting a new process
app.on('second-instance', () => {
  if (win) { win.show(); win.focus(); }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
});

// Keep the process alive when the window is hidden
app.on('window-all-closed', (e) => e.preventDefault());

app.on('before-quit', () => { app.isQuitting = true; });
