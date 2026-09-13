# ROK Desk Tablet (Android)

Sideload APK for lounge Android pads. Fullscreen WebView of the desk — judge, player, player extended, commentary, walk-up, floor clock, stream clock.

Not on Play Store. Drop the APK in Discord. Same Wi‑Fi as the TO / production PC.

## Install on a pad

1. Download [ROK-Desk-Tablet-0.1.apk](https://github.com/ROK-CJAY/ROK-DESK/raw/main/android-tablet/ROK-Desk-Tablet-0.1.apk) (also in this folder on `main`).
2. Open the file (from Discord or Files). Allow **Install unknown apps** for that app if Android asks.
3. Open **ROK Desk Tablet**.
4. On the desk Home screen, pick title / table / surface and **scan the QR**. Or type the LAN IP and port **8080**.

Stay awake is on while the pad is open. **Change** returns to setup.

## Build

Needs JDK 17 and Android SDK 34.

```bash
export ANDROID_SDK_ROOT=/path/to/sdk
printf 'sdk.dir=%s\n' "$ANDROID_SDK_ROOT" > android-tablet/local.properties
cd android-tablet
./gradlew assembleRelease
```

APK: `android-tablet/app/build/outputs/apk/release/app-release.apk`

Keystore: `android-tablet/keystore/rok-desk-tablet.jks` (password `rokdesk`, alias `rokdesk`). Keep this key for updates or Android treats the next APK as a different app.

## License

Same lounge / personal-use notice as ROK Desk. Shown on first-run setup.
