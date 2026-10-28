# Android expo-image cookie regression

Reproduction repository: [leonskim/expo-image-cookie-repro](https://github.com/leonskim/expo-image-cookie-repro).

Standalone adaptation of [alessbelli/test-expo-image-cookies](https://github.com/alessbelli/test-expo-image-cookies), originally linked from [expo/expo#43229](https://github.com/expo/expo/issues/43229).

Pins Expo 58.0.21, expo-image 58.0.18, React Native 0.88.1, and React 19.3.0. A local Node server replaces the external worker so results do not depend on a deployed service or credentials.

## What it demonstrates

1. A credentialed React Native `fetch` receives `Set-Cookie: demo_session=valid; HttpOnly; Path=/`.
2. A second fetch confirms the server receives that cookie.
3. An `expo-image` request to the same origin must send the cookie to load a protected SVG. The server returns HTTP 401 if it is missing.
4. The app displays the server-observed image cookie and HTTP status. Both the image cache and HTTP cache are disabled. A unique URL identifies each run. No image Cookie header is supplied by JavaScript.

The patch restores the `CookieManager` bridge removed in [expo/expo#44431](https://github.com/expo/expo/pull/44431), while keeping `OkHttpClientProvider.createClient()` and its interceptors. It overrides the resulting client's cookie jar.

## Run the unpatched baseline

Use an Android emulator, Node, JDK 17, and an Android SDK. Set `JAVA_HOME` and `ANDROID_HOME` for your machine. The backend only listens on host loopback; adb reverse exposes it to the emulator.

```sh
npm ci
npm test
npm run android:prebuild
npm run android:build
```

In two terminals, keep `npm run server` and `npm start` running. Then:

```sh
adb -s emulator-5554 reverse tcp:4317 tcp:4317
adb -s emulator-5554 reverse tcp:8093 tcp:8093
adb -s emulator-5554 install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Launch `Image Cookie Repro` (`dev.repro.imagecookies`). The app runs automatically; use **Run repro** to repeat. Expected baseline: fetch HTTP 200 with the session cookie, image HTTP 401 with no cookie.

## Run with the native patch

```sh
npm run patch:apply
npm run android:build
adb -s emulator-5554 install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Restart the app. Expected patched result: fetch and image both HTTP 200; the server receives `demo_session=valid` on the image request.

`expo.autolinking.android.buildFromSource` includes `expo-image` for both builds. An Expo Go binary cannot demonstrate this Kotlin patch. `npm run patch:revert` restores the baseline source; rebuild and reinstall after reverting. `npm ci` also restores unpatched dependencies.

## Evidence

Before/after captures and observed server requests are stored in `evidence/`. Both captures use the same Android emulator and identical JavaScript; only the native cookie bridge changes.

Verified on Android API 36 (arm64): the unpatched image request returned **401** with no cookie; the patched request returned **200** with `demo_session=valid`. The fetch control returned 200 in both captures. The fixture test passed.

- [Before screenshot](evidence/before.png)
- [After screenshot](evidence/after.png)
- [Request records, versions, and source hashes](evidence/results.json)

`npm ci` installs the unpatched baseline. Apply the patch explicitly with `npm run patch:apply`; use `npm run patch:revert` and rebuild to return to the baseline.

Sources: [original cookie fix #43257](https://github.com/expo/expo/pull/43257), [client factory change #44431](https://github.com/expo/expo/pull/44431).
