# Fahdu Migration Decisions (React Native 0.79 / Expo SDK 53)

This document tracks libraries and dependencies from the previous version that were explicitly excluded or replaced during the migration.

## 🚫 Libraries NOT to Install

| Library | Reason | Alternative / Status |
| :--- | :--- | :--- |
| `firebase-admin` | Not required for the mobile client. | Use standard Firebase client SDKs. |
| `react-native-sound` | Deprecated/Native conflicts. | Use `expo-av` (already installed). |
| `react-native-video-controls` | Redundant with modern video players. | Use `expo-video` (already installed). |
| `react-native-pdf-thumbnail` | Incompatible with RN 0.79 native build. | Use server-side generation or `react-native-pdf`. |
| `react-native-reanimated-table` | Not required for the new version. | N/A |
| `react-native-phonepe-pg` | Not required. | N/A |
| `react-native-callkeep` | Explicitly requested to remove. | N/A |
| `@redux-devtools/extension` | Not required for production/new version. | N/A |
| `reactotron-react-native` | Debugging tool, not needed. | N/A |
| `reactotron-redux` | Debugging tool, not needed. | N/A |

## 🛠 Critical Build Fixes Applied

### 1. `react-native-capture-protection`
- **Issue:** Variant ambiguity between `base` and `callbackTiramisu`.
- **Fix:** Added `missingDimensionStrategy 'react-native-capture-protection', 'base'` to `android/app/build.gradle`.

### 2. Android SDK Compatibility
- **Issue:** Some modern dependencies (like new `expo-dev-client` versions) require Android API 36.
- **Fix:** Reverted to Expo SDK 53-compatible versions (~4.0.28) to stay on the stable **Android API 35** required by RN 0.79.

### 3. Kotlin Version
- **Issue:** Metadata mismatch between dependencies (expected 2.2.0, found 2.0.0).
- **Fix:** Synchronized project Kotlin version to **2.0.21** (stable for SDK 53) and ensured compatible library versions.
