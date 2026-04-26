const muteGameButton = document.getElementById("mute-game-checkbox");
const focusMuteButton = document.getElementById("focus-mute-checkbox");

const toggleGameKey = document.getElementById("toggle-game-key");

const settingsButton = document.getElementById("settings-button");
const settingsIcon = document.getElementById("settings-icon");
const menuPopup = document.getElementById("menu-popup");
const resetButton = document.getElementById("reset-button");

const statusText = document.getElementById("game-status");
const versionText = document.getElementById("version");
const updaterText = document.getElementById("updater");

const externalLinkURLS = [
  "https://twitter.com/valbility", // Twitter
  "https://github.com/markzhdan/valbility", // GitHub
  "http://valbility.com/", // Website
];

window.addEventListener("DOMContentLoaded", () => {
  versionText.innerText = `Version • ${window.electronAPI.getValbilityVersion()}`;
});

muteGameButton.addEventListener("click", () => {
  audioButtonsClicked("is-game-muted", muteGameButton.checked);
});
focusMuteButton.addEventListener("click", () => {
  window.electronAPI.config.set("is-focus-muted", focusMuteButton.checked);
  window.electronAPI.refreshMuteState();
});
function audioButtonsClicked(key, status) {
  // Sets user config to button status [ON/OFF]
  window.electronAPI.config.set(key, status);
  // Applies the direct mute state immediately.
  window.electronAPI.muteProcesses(key, status);
}

toggleGameKey.addEventListener("click", async () => {
  addNewHotkey(toggleGameKey, "toggle-game-keybind");
});
async function addNewHotkey(button, configKey) {
  let newKeybind = await newHotkeyPress();
  button.value = formatKeyInput(newKeybind);
  button.blur();

  window.electronAPI.registerNewHotkey(configKey, newKeybind);
}

settingsButton.addEventListener("click", () => {
  if (menuPopup.style.visibility === "visible") {
    menuPopup.style.visibility = "hidden";
  } else {
    menuPopup.style.visibility = "visible";
  }
});
document.body.addEventListener("click", (event) => {
  if (event.target === settingsButton || event.target === settingsIcon) {
    console.log("pressed");
    return;
  }
  console.log("hidden");
  menuPopup.style.visibility = "hidden";
});

resetButton.addEventListener("click", () => {
  window.electronAPI.resetConfigToDefault();
});

const linkButtons = document.querySelectorAll("a.link");
linkButtons.forEach(function (button, i) {
  button.addEventListener("click", () =>
    window.electronAPI.openURL(externalLinkURLS[i])
  );
});

const navButtons = document.querySelectorAll("button.nav-button");
navButtons.forEach(function (button, i) {
  button.addEventListener("click", () =>
    window.electronAPI.closeOrMinimizeApp(button.id)
  );
});

window.electronAPI.updateStatusStyle((e, text, color) => {
  statusText.innerText = text;
  statusText.style.color = color;
});

window.electronAPI.updateUpdaterMessage((e, message) => {
  updaterText.innerText = message;
});

window.electronAPI.updateKeybindText((e, keyValue, keyFunctionality) => {
  if (keyFunctionality === "toggle-game-keybind") {
    toggleGameKey.value = formatKeyInput(keyValue);
  }
});

window.electronAPI.updateAudioToggle((e, configKey, status) => {
  if (configKey === "is-game-muted") {
    muteGameButton.checked = status;
  }
});

// Waits and returns next keypress
function newHotkeyPress() {
  return new Promise((resolve) => {
    document.addEventListener("keydown", onKeyHandler);
    function onKeyHandler(event) {
      document.removeEventListener("keydown", onKeyHandler);
      // Returns string of key - "PageDown".
      resolve(event.key);
    }
  });
}

function formatKeyInput(newKey) {
  try {
    const newKeybindArray = newKey.match(/[A-Z][a-z]+|[0-9]+/g);
    return newKeybindArray.join(" ").toUpperCase();
  } catch {
    return newKey.toUpperCase();
  }
}
