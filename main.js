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

// Hide the icon from the dock if the OS has it.
if (app.dock) {
  app.dock.hide();
}

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    frame: false,
    height: 396,
    width: 300,
    backgroundColor: '#2B2F3B',
    resizable: false,
    center: true,
    skipTaskbar: true,
    show: false,
    title: 'Brownie'
  });

  // The trigger used to show/hide the app window.
  // TODO: allow user to set a custom shortcut.
  globalShortcut.register('Alt+Space', () => {
    mainWindow.isVisible() ? app.hide() : mainWindow.show();
  });

  tray = new Tray('./img/owl_full_black_18.png');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Clear clipboard history', click(item, focusedWindow) {
      mainWindow.webContents.send('clearClipboardHistory');
    }},
    { type: 'separator' },
    { label: 'Quit Brownie', click(item, focusedWindow) {
      app.quit();
    }}
  ]);

  tray.setToolTip('Brownie')
  tray.setContextMenu(contextMenu)

  mainWindow.loadURL('file://' + __dirname + '/index.html');
  mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.webContents.openDevTools();

  ipcMain.on('hideWindow', (event) => app.hide());
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
