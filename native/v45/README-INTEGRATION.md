# Higher Self Android v45 native delta

Copy these files into the existing `com.higherself.app` Capacitor wrapper. Do not replace `HSCalendarPlugin.java`, `HSSpeechPlugin.java`, or `HSSayPlugin.java`. Do not copy a keystore. Signing stays on the packaging machine: `android/app/build.gradle` still reads `../signing/keystore.properties` only when that file is already there.

Web deployment is unchanged. `APP_VERSION` and `sw.js` stay on 43. The Android package version in this delta is `versionCode 45` / `versionName 45.0.0`. The in-app footer shows 45 only when the page is running in the Android shell (or `?android=1`).

## New files

| From this delta | Place in the wrapper |
| --- | --- |
| `android/app/src/main/java/com/higherself/app/HSBackupPlugin.java` | same path |
| `android/app/src/main/java/com/higherself/app/HSBiometricPlugin.java` | same path |

## Replace these files (they are the v44 file plus the v45 edits)

| From this delta | Place in the wrapper |
| --- | --- |
| `android/app/src/main/java/com/higherself/app/MainActivity.java` | same path. Registers calendar, speech, read-aloud, then HSBackup and HSBiometric. |
| `android/app/build.gradle` | same path. Version 45 and `androidx.biometric:biometric:1.1.0`. Signing block unchanged. |
| `android/app/src/main/AndroidManifest.xml` | same path. Adds `USE_BIOMETRIC`. |
| `android/app/src/main/res/values/strings.xml` | same path. Prompt strings only. |
| `scripts/sync-www.js` | same path. |

## sync-www.js

Leave `HS_APP` and `HS_EXCLUDES` unset on the packaging machine. The script still reads `/workspace/growth-app` and `/workspace/hs-excludes.txt` when those variables are unset and the excludes file exists. That is the same local packaging outcome as v44.

On a machine without `/workspace/hs-excludes.txt`, the copy runs without `-X` so staging still gets `index.html`, `planner-gaps.js`, `sw.js`, `manifest.webmanifest`, `icons`, and `themes`. Set `HS_APP` to the app directory when it is not `/workspace/growth-app`.

## What the new plugins do

`HSBackup.saveEncrypted({ name, text })` opens Android `ACTION_CREATE_DOCUMENT`. The person picks Google Drive, Files, or another document provider. The plugin writes the bytes it was given. Those bytes are the existing encrypted `.hsbak` envelope. Higher Self does not sign in to Google, does not hold an OAuth client, and does not upload by itself. A Drive REST API would need a Google Cloud project and an OAuth client; this build does not add those.

`HSBiometric` wraps the passphrase with an Android Keystore AES/GCM key. The key requires biometric authentication. On API 24 and newer the key is invalidated when fingerprints change; the plugin then deletes the key and the ciphertext and the app falls back to the passphrase. The passphrase is never written in the clear and is not logged. Below API 23 the feature is unavailable. The unlock screen shows fingerprint only when `status().enabled` is true. Cancel, lockout, and "Use passphrase" leave password unlock in place.

## Compile

`HSBiometricPlugin` keeps the Keystore invalidation fallback. `Cipher.doFinal` does not declare `KeyPermanentlyInvalidatedException`, so the callback no longer catches that type directly around `doFinal`. A helper unwraps it from the cause chain, rethrows it, and the caller deletes the key and ciphertext only for that case. A padding or block-size error does not delete the key. `Cipher.init` in `unlock` still catches invalidation and falls back to the passphrase.

On this machine, with Android SDK 34 and build-tools 34.0.0, `:app:compileReleaseJavaWithJavac` succeeded for the overlaid wrapper. That is not a signed APK. There is still no device, fingerprint, or Google account here.

## Not verified on a device

This environment has no phone, fingerprint, or Google account. The document-provider sheet and the biometric prompt need a device. A signed upgrade APK still has to be built on the packaging machine.
