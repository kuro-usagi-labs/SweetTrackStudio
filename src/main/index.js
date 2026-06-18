import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setupDb } from './db'
import { sendNotification } from './notifications'
import { startOAuthFlow, fetchYoutubeData, fetchYoutubeAnalytics } from './youtube_api'
import fs from 'fs'

process.on('uncaughtException', (err) => {
  fs.writeFileSync('d:/SweetTrackStudio/crash.log', err.stack || err.toString())
  console.error('Uncaught Exception:', err)
})

process.on('unhandledRejection', (reason) => {
  fs.writeFileSync('d:/SweetTrackStudio/crash.log', reason?.stack || reason?.toString() || 'Unhandled Rejection')
  console.error('Unhandled Rejection:', reason)
})

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: true,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      height: 64
    },
    icon: join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.openDevTools()

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER] ${message} (Line ${line})`)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.disableHardwareAcceleration()

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.sweettrack.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC Handlers
  ipcMain.on('ping', () => console.log('pong'))
  ipcMain.on('send-notification', (_, { title, body }) => {
    sendNotification(title, body)
  })

  ipcMain.handle('start-youtube-oauth', async (_, { clientId, clientSecret }) => {
    return await startOAuthFlow(clientId, clientSecret);
  });

  ipcMain.handle('fetch-youtube-data', async (_, accessToken) => {
    return await fetchYoutubeData(accessToken);
  });

  ipcMain.handle('fetch-youtube-analytics', async (_, { accessToken, videoIds }) => {
    return await fetchYoutubeAnalytics(accessToken, videoIds);
  });

  setupDb()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
