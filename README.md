# WeCare

A caregiver app for iOS and Android, built with Expo and React Native in `mobile/`.
The original Next.js web prototype remains in the root directory.

## Preview the native app on your phone

Install **Expo Go** on your iPhone or Android phone. From this repository:

```bash
npm run mobile
```

Keep your phone and computer on the same Wi-Fi network. Scan the terminal QR code
with the iPhone Camera app, or the scanner in Expo Go on Android.

If dependencies are missing, run `npm --prefix mobile ci` first.

The native flow is personal information → medication search → information →
prescription details → the recipient’s schedule. It uses native screens, keyboards,
pickers, back navigation, and on-device storage. The catalog currently contains the
Cephalexin examples from Figma. Phone data is separate from the web prototype.

## Development

```bash
npm run mobile:typecheck
npm --prefix mobile run lint
npm run mobile:ios       # requires Xcode and an iOS simulator
npm run mobile:android   # requires Android Studio and an emulator
```

The Expo SDK version in `mobile/package.json` must match your Expo Go version.
See [Expo Go](https://expo.dev/go) for supported versions.

For installable app builds, use the `preview` or `production` profiles in
`mobile/eas.json` with [EAS Build](https://docs.expo.dev/build/introduction/).
Signing and store submission require your own Expo/Apple/Google accounts.
No store builds or submissions have been made.

## Original web prototype

```bash
npm ci
npm run dev
```

Open http://localhost:3000/setup/care-recipient for the setup flow,
or http://localhost:3000/home for the original dashboard.

The `device/` directory contains the separate hardware prototype.
