import { join } from 'path'
import { BrowserWindow, app, shell } from 'electron'

let mainWindow: BrowserWindow | null = null

function getIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(__dirname, '../../resources/icon.png')
}

function loadContent(win: BrowserWindow): void {
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Dezem — Gestão de Frota',
    icon: getIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  mainWindow = win

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null
    }
  })

  win.on('ready-to-show', () => {
    win.maximize()
    win.show()
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  win.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame) {
        return
      }
      if (errorCode === -3) {
        return // ERR_ABORTED: navegação cancelada normalmente
      }

      console.error(
        `[Window] Falha ao carregar "${validatedURL}": [${errorCode}] ${errorDescription}`,
      )
      console.warn('[Window] Tentando recarregar em 1s...')
      setTimeout(() => {
        if (!win.isDestroyed()) {
          loadContent(win)
        }
      }, 1000)
    },
  )

  loadContent(win)

  return win
}

export async function reloadAppWindow(): Promise<void> {
  const win = mainWindow
  if (!win || win.isDestroyed()) {
    createWindow()
    return
  }
  win.reload()
}
