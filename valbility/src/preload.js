const { contextBridge, ipcRenderer } = require("electron");
const config = require("./data/store");

contextBridge.exposeInMainWorld("electronAPI", {
  // Renderer to main functions
  muteProcesses: (key, status) =>
    ipcRenderer.send("mute-processes", key, status),
  refreshMuteState: () => ipcRenderer.send("refresh-mute-state"),
  registerNewHotkey: (configKey, newKey) =>
    ipcRenderer.send("register-new-hotkey", configKey, newKey),
  getValbilityVersion() {
    return ipcRenderer.sendSync("get-app-version");
  },
  closeOrMinimizeApp: (functionality) =>
    ipcRenderer.send("close-or-minizmize-app", functionality),
  openURL: (url) => ipcRenderer.send("open-url", url),
  resetConfigToDefault: () => ipcRenderer.send("reset-config-to-default"),

  // Electron-store config default IPC model
  config: {
    get(key) {
      return ipcRenderer.sendSync("config-get", key);
    },
    set(property, value) {
      ipcRenderer.send("config-set", property, value);
    },
  },

  // Main to renderer functions
  updateStatusStyle: (text, color) =>
    ipcRenderer.on("update-status-style", text, color),
  updateKeybindText: (keyValue, keyFunctionality) =>
    ipcRenderer.on("update-keybind-text", keyValue, keyFunctionality),
  updateUpdaterMessage: (message) =>
    ipcRenderer.on("update-updater-message", message),
  updateAudioToggle: (status) => ipcRenderer.on("update-audio-toggle", status),
});

window.addEventListener("DOMContentLoaded", () => {
  const muteGameElement = document.getElementById("mute-game-checkbox");
  const focusMuteElement = document.getElementById("focus-mute-checkbox");
  const toggleGameKey = document.getElementById("toggle-game-key");

  muteGameElement.checked = config.get("is-game-muted");
  focusMuteElement.checked = config.get("is-focus-muted");
  toggleGameKey.value = formatKeyInput(config.get("toggle-game-keybind"));
});

function formatKeyInput(newKey) {
  try {
    const newKeybindArray = newKey.match(/[A-Z][a-z]+|[0-9]+/g);
    return newKeybindArray.join(" ").toUpperCase();
  } catch {
    return newKey.toUpperCase();
  }
}
