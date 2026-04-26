# Valbility

This repository is a maintained fork of [markzhdan/Valbility](https://github.com/markzhdan/Valbility).

Valbility is a small Windows desktop utility for VALORANT audio control. This fork removes the original microphone voice-activity features and focuses on game audio muting, focus-based muting, tray behavior, and a system-level audio hotkey.

## Fork Changes

- Removed microphone voice-activity detection.
- Removed VALORANT voice-key automation.
- Removed the voice chat mute control.
- Changed `Mute Game` to be a direct mute toggle.
- Added `Focus Mute` as a separate option for muting VALORANT while it is not focused.
- Added a system-level global hotkey for `Mute Game` using `uiohook-napi`.
- Added tray behavior:
  - Minimize hides the app to the system tray.
  - Close hides the app to the system tray.
  - Double-clicking the tray icon toggles show/hide.
  - The tray menu can show or quit the app.

## Features

- **Mute Game**: Directly mutes or unmutes VALORANT game audio.
- **Focus Mute**: Automatically mutes VALORANT when it is not the active foreground window.
- **Audio Hotkey**: Toggles `Mute Game` globally, even when the app window is not focused.
- **Tray Mode**: Keeps the app running in the background from the system tray.
- **Process/Window Detection**: Tracks VALORANT and Riot Client process/window state.

> [!NOTE]
>
> For the global hotkey to work while VALORANT is running as administrator, Valbility should also be run as administrator.

## Getting Started

This project is only intended for Windows x64.

```powershell
cd valbility
npm install
npm start
```

To build the Windows installer:

```powershell
cd valbility
npm run build
```

## Built With

- [Electron](https://www.electronjs.org/)
- [Node.js](https://nodejs.org/)
- [active-win](https://www.npmjs.com/package/active-win)
- [electron-store](https://www.npmjs.com/package/electron-store)
- [ps-list](https://www.npmjs.com/package/ps-list)
- [native-sound-mixer](https://www.npmjs.com/package/native-sound-mixer)
- [uiohook-napi](https://www.npmjs.com/package/uiohook-napi)
- [electron-builder](https://www.electron.build/)

## Repository

- Fork: [LisnXy/Valbility](https://github.com/LisnXy/Valbility)
- Original project: [markzhdan/Valbility](https://github.com/markzhdan/Valbility)

## License

Distributed under the MIT License. See [LICENSE.txt](LICENSE.txt) for more information.

## Acknowledgments

Original project by [Mark Zhdan](https://github.com/markzhdan).

Inspiration and related projects from the original README:

- [Assist](https://github.com/HeyM1ke/Assist)
- [Process Listener](https://www.npmjs.com/package/process-listener)
- [Active Window Listener](https://www.npmjs.com/package/active-window-listener)

## Disclaimer

Valbility was created under Riot Games' "Legal Jibber Jabber" policy using assets owned by Riot Games.
Riot Games does not endorse or sponsor this project.

> [!WARNING]
>
> Use of this application is at the user's own risk. This fork cannot guarantee that use of the application will not affect your account status.
