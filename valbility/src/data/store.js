const Store = require("electron-store");

module.exports = new Store({
  defaults: {
    "toggle-game-keybind": "PageDown",
    "is-game-muted": false,
    "is-focus-muted": false,
  },
});
