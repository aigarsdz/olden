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
    if (mainWindow.isVisible()) {
      if (app.hide) {
        // NOTE: to get focus back to the previous window on MacOS we need to
        // hide the app not only the window.
        app.hide();
      } else {
        // NOTE: Windows doesn't have app.hide method, but combination of
        // window.blur and window.hide does the same thing.
        mainWindow.blur();
        mainWindow.hide()
      }
    } else {
      mainWindow.show();
    }
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
  // mainWindow.webContents.openDevTools();

  ipcMain.on('hideWindow', (event) => {
    if (app.hide) {
        app.hide();
      } else {
        mainWindow.blur();
        mainWindow.hide()
      }
  });
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On MacOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
