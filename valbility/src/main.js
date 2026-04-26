// Created by Mark Zhdan
// https://github.com/markzhdan/Valbility
// https://twitter.com/Valbility

//Electron Required
const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  shell,
  Tray,
} = require("electron");
const path = require("path");

// Local Data
const config = require("./data/store");
const { ProcessesListener } = require("./listeners/process-listener");
const { WindowChangeListener } = require("./listeners/window-change-listener");
const { Mixer } = require("./mixer");

// Node Modules
const { autoUpdater } = require("electron-updater");
const { uIOhook, UiohookKey } = require("uiohook-napi");

// Updater flags - Needed so it doesn't update twice
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
const isDevMode = false;

let valorantMixer = new Mixer("VALORANT", "VALORANT");
const defaultTrayIconPath = path.join(
  __dirname,
  "../../valbility/assets/icons/16_16.png"
);
const focusMuteTrayIconPath = path.join(
  __dirname,
  "../../valbility/assets/icons/16_16_focus.png"
);

const styles = {
  VALORANT: {
    text: "Playing",
    color: "forestgreen",
  },
  RiotClient: {
    text: "Client",
    color: "goldenrod",
  },
  Offline: {
    text: "Offline",
    color: "gray",
  },
};

let mainWindow = null;
let tray = null;
let isQuitting = false;
let isValorantFocused = false;
let isRiotClientStarted = false;
let isGameHotkeyDown = false;
let isGlobalKeyListenerStarted = false;

const createWindow = () => {
  // Creates the browser window.
  mainWindow = new BrowserWindow({
    title: "Valbility",
    icon: path.join(__dirname, "../../valbility/assets/icons/256_256.ico"),
    width: 400,
    height: 190,
    resizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      devTools: isDevMode,
      sandbox: false,
      nodeIntegration: false, // is default value after Electron v5
      contextIsolation: true, // protect against prototype pollution
      enableRemoteModule: false, // turn off remote
    },
  });

  // IPC listeners
  ipcMain.on("config-get", async (event, value) => {
    event.returnValue = config.get(value);
  });
  ipcMain.on("config-set", async (e, key, value) => {
    config.set(key, value);
  });
  ipcMain.on("mute-processes", (e, key, status) => {
    config.set(key, status);
    applyMuteState();
  });

  ipcMain.on("refresh-mute-state", () => {
    applyMuteState();
    updateTrayIcon();
  });

  ipcMain.on("register-new-hotkey", async (e, configKey, newKey) => {
    const oldKey = config.get(configKey);
    const canListenToKey = getUiohookKeyCode(newKey) !== null;

    // Resets keybind back to original keybind if invalid key to prevent app crashing.
    if (canListenToKey) {
      config.set(configKey, newKey);
    } else {
      mainWindow.webContents.send("update-keybind-text", oldKey, configKey);
    }
  });

  ipcMain.on("get-app-version", async (event) => {
    event.returnValue = app.getVersion();
  });

  ipcMain.on("close-or-minizmize-app", (e, functionality) => {
    if (functionality === "minimize-btn") {
      hideToTray();
    } else {
      mainWindow.close();
    }
  });

  ipcMain.on("open-url", (e, url) => {
    shell.openExternal(url);
  });

  ipcMain.on("reset-config-to-default", (e) => {
    // Clears config and reloads window to reset UI
    config.clear();
    mainWindow.webContents.reloadIgnoringCache();

    // Unmutes processes
    valorantMixer.unmute();
    isValorantFocused = false;
    isRiotClientStarted = false;
    updateTrayIcon();
  });

  // Load main html to app window
  mainWindow.loadFile(path.join(__dirname, "public/index.html"));

  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    hideToTray();
  });

  mainWindow.on("minimize", (event) => {
    event.preventDefault();
    hideToTray();
  });
};

// Waits for Electron initialization and creates browser window.
app.whenReady().then(() => {
  createWindow();
  createTray();
  startGlobalKeyListener();

  const listener = new ProcessesListener([
    "RiotClientServices.exe",
    "VALORANT.exe",
  ]);

  listener.started(async ({ name }) => {
    if (name === "VALORANT.exe") {
      updateStyle(styles.VALORANT);

      valorantMixer.appStarted = true;
      await valorantMixer.ensureSessionIsSet();

      applyMuteState();
    } else {
      isRiotClientStarted = true;
      if (!valorantMixer.appStarted) updateStyle(styles.RiotClient);
    }
  });

  listener.exited(async ({ name }) => {
    if (name === "VALORANT.exe") {
      valorantMixer.unmute();

      valorantMixer.resetSession();
      valorantMixer.appStarted = false;

      updateStyle(isRiotClientStarted ? styles.RiotClient : styles.Offline);
    } else {
      isRiotClientStarted = false;
      if (valorantMixer.appStarted) {
        updateStyle(styles.VALORANT);
      } else {
        updateStyle(styles.Offline);
      }
    }
  });

  const changeListener = new WindowChangeListener();

  changeListener.changed(({ windowInfo }) => {
    isValorantFocused = isValorantWindow(windowInfo);
    applyMuteState();
  });

  // OS X / macOS specific.
  app.on("activate", () => {
    if (!mainWindow) {
      createWindow();
    } else {
      showMainWindow();
    }
  });

  // Opens dev tools
  mainWindow.on("ready-to-show", () => {
    if (isDevMode) {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  });

  autoUpdater.checkForUpdates();
});

autoUpdater.on("update-available", (info) => {
  mainWindow.webContents.send(
    "update-updater-message",
    "Downloading update..."
  );
  let downloadMessage = autoUpdater.downloadUpdate();
  mainWindow.webContents.send("update-updater-message", downloadMessage);
});
autoUpdater.on("update-not-available", (info) => {
  mainWindow.webContents.send(
    "update-updater-message",
    "Valbility is up to date"
  );
  setTimeout(() => {
    mainWindow.webContents.send("update-updater-message", "");
  }, "2000");
});
autoUpdater.on("update-downloaded", (info) => {
  mainWindow.webContents.send("update-updater-message", "Restart to update!");
});
autoUpdater.on("error", (info) => {
  console.log(info);
  mainWindow.webContents.send("update-updater-message", info);
});

// OS X / macOS specific.
app.on("window-all-closed", () => {
  if (process.platform === "darwin") {
    return;
  }

  if (isQuitting) {
    valorantMixer.unmute();
    app.quit();
  }
});

// Volume unmute and global key listener cleanup
app.on("will-quit", () => {
  stopGlobalKeyListener();
});

// App's specific main process code (helper functions):
function updateStyle(style) {
  // Delay to ensure style change.
  setTimeout(() => {
    mainWindow.webContents.send("update-status-style", style.text, style.color);
  }, 1000);
}

function isValorantWindow(windowInfo) {
  return (
    windowInfo.title.includes("VALORANT") &&
    windowInfo.name.includes("VALORANT") &&
    windowInfo.path.endsWith("VALORANT-Win64-Shipping.exe")
  );
}

function shouldFocusMute() {
  return config.get("is-focus-muted") && !isValorantFocused;
}

function applyMuteState() {
  const shouldMuteGame = config.get("is-game-muted") || shouldFocusMute();

  shouldMuteGame ? valorantMixer.mute() : valorantMixer.unmute();
}

function createTray() {
  tray = new Tray(getTrayIconPath());
  tray.setToolTip("Valbility");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Show Valbility",
        click: showMainWindow,
      },
      {
        label: "Quit",
        click: quitApp,
      },
    ])
  );
  tray.on("double-click", toggleMainWindow);
}

function getTrayIconPath() {
  return config.get("is-focus-muted")
    ? focusMuteTrayIconPath
    : defaultTrayIconPath;
}

function updateTrayIcon() {
  if (!tray) {
    return;
  }

  tray.setImage(getTrayIconPath());
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow();
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function hideToTray() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.hide();
}

function toggleMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }

  if (mainWindow.isVisible()) {
    hideToTray();
  } else {
    showMainWindow();
  }
}

function quitApp() {
  isQuitting = true;
  valorantMixer.unmute();
  app.quit();
}

function startGlobalKeyListener() {
  if (isGlobalKeyListenerStarted) {
    return;
  }

  uIOhook.on("keydown", handleGlobalKeyDown);
  uIOhook.on("keyup", handleGlobalKeyUp);
  uIOhook.start();
  isGlobalKeyListenerStarted = true;
}

function stopGlobalKeyListener() {
  if (!isGlobalKeyListenerStarted) {
    return;
  }

  uIOhook.off("keydown", handleGlobalKeyDown);
  uIOhook.off("keyup", handleGlobalKeyUp);
  uIOhook.stop();
  isGlobalKeyListenerStarted = false;
}

function handleGlobalKeyDown(event) {
  if (isGameHotkeyDown || event.keycode !== getCurrentGameHotkeyCode()) {
    return;
  }

  isGameHotkeyDown = true;
  toggleGameMute();
}

function handleGlobalKeyUp(event) {
  if (event.keycode === getCurrentGameHotkeyCode()) {
    isGameHotkeyDown = false;
  }
}

function getCurrentGameHotkeyCode() {
  return getUiohookKeyCode(config.get("toggle-game-keybind"));
}

function getUiohookKeyCode(key) {
  const normalizedKey = normalizeKeyName(key);
  return UiohookKey[normalizedKey] ?? null;
}

function normalizeKeyName(key) {
  const aliases = {
    " ": "Space",
    Control: "Ctrl",
    ArrowLeft: "ArrowLeft",
    ArrowUp: "ArrowUp",
    ArrowRight: "ArrowRight",
    ArrowDown: "ArrowDown",
    Esc: "Escape",
  };

  if (aliases[key]) {
    return aliases[key];
  }

  if (key.length === 1) {
    return key.toUpperCase();
  }

  return key;
}

function toggleGameMute() {
  const isGameMuted = !config.get("is-game-muted");
  config.set("is-game-muted", isGameMuted);
  applyMuteState();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-audio-toggle", "is-game-muted", isGameMuted);
  }
}
