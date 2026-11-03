# Douvi iOS Bridge icon

The approved green D/bridge logo is stored in `assets/bridge-icon.png`. This is the original PNG, including the transparent area around its dark green tile. The earlier `assets/bridge-icon.svg` is historical artwork and is not used by the application.

The current icon exports use the pinned Tauri CLI (`2.12.4`). From the repository root:

```sh
npm run tauri -- icon ../../assets/bridge-icon.png --output ../../icon-export
```

Copy the following outputs into their consuming paths. The command also creates assets for other platforms; only the files below are used by this Windows application.

| Export | Application path | Use |
| --- | --- | --- |
| `128x128.png` | `apps/desktop/public/brand-icon.png` | Workbench branding |
| `32x32.png` | `apps/desktop/public/favicon.png` | Browser preview icon |
| `128x128@2x.png` | `apps/desktop/src-tauri/icons/icon.png` | Tauri window icon |
| `icon.ico` | `apps/desktop/src-tauri/icons/icon.ico` | Windows executable, NSIS installer and uninstaller |

NSIS `installerIcon` and `uninstallerIcon` are configured explicitly; the application bundle icon alone does not replace the installer's default icon. The Windows smoke test reads the real PE icon resources and requires every frame in every icon group to match the source ICO bytes exactly. This checks all six sizes without relying on legacy GDI PNG decoding. The browser and native WebView2 checks also require the workbench logo to load.

Version `0.1.0-dev.2` introduces this branding. Its Windows installer must pass a new build and installed-app smoke run before it is described as verified. The `0.1.0-dev.1` receipt describes the earlier installer.
