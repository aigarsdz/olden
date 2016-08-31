'use strict';

const {
  app,
  Menu,
  Tray,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  clipboard } = require('electron');

let mainWindow = null;
let tray       = null;
let visible    = false;

if (app.dock) {
  app.dock.hide();
}

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    frame: false,
    height: 396,
    resizable: false,
    width: 300,
    center: true,
    skipTaskbar: true,
    show: visible,
    title: 'Brownie'
  });

  globalShortcut.register('Alt+Space', () => {
    visible ? mainWindow.hide() : mainWindow.show();

    visible = !visible;
  });

  tray = new Tray('./img/cookie.png');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Clear clipboard history', click(item, focusedWindow) {
      mainWindow.webContents.send('clearClipboardHistory');
    }}
  ]);

  tray.setToolTip('Brownie')
  tray.setContextMenu(contextMenu)

  mainWindow.loadURL('file://' + __dirname + '/index.html');
  mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.webContents.openDevTools();

  ipcMain.on('hideWindow', (event) => {
    mainWindow.hide();

    visible = false;
  });
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
