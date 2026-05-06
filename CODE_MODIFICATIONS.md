# Fahdu Code Modifications Log

This file tracks all manual changes made to the JavaScript source code after syncing the "Latest Business Logic" from the old project.

## 🕒 Last Updated: 2026-05-06

### 🛠 Core Entry & Redux Cleanup
- **File:** `index.js`
  - Removed `ReactotronConfig` import and initialization to prevent bundling errors.
- **File:** `Redux/Store/index.js`
  - Removed Reactotron enhancer from the Redux store configuration.
- **File:** `Main.js`
  - Commented out the deprecated/missing `dynamicLinks()` call in the deep linking logic.

### 📄 Document Picker Migration (to `@react-native-documents/picker`)
Replaced the incompatible `react-native-document-picker` with `@react-native-documents/picker` for Android 14+ compatibility.
- **File:** `Src/Screens/CreatePost.js`
  - Removed unused `react-native-document-picker` import.
- **File:** `Src/Components/ChatWindowComponents/ChatWindowClipModal.js`
  - Replaced `DocumentPicker` import and updated `pickSingle` to `pick`.

### 🎥 Video Player Migration (to `expo-video`)
The old `react-native-video-controls` was replaced with `expo-video` for better stability in SDK 53.
- **File:** `Src/Components/CreatePostComponents/CreatePostVideoPreview.js`
  - Replaced `VideoPlayer` with `VideoView` and `useVideoPlayer`.
- **File:** `Src/Components/ChatWindowComponents/ChatWindowVideoModal.js`
  - Replaced `VideoPlayer` with `VideoView` and `useVideoPlayer`.
- **File:** `Src/Components/ChatWindowComponents/ChatWindowFullSizedImageModal.js`
  - Removed unused `react-native-video-controls` import.

### 🗑 Deleted Components & Cleanup
- **File:** `Src/Components/HomeComponents/BrandPreviewModal.js`
  - Deleted file as requested (obsolete).
- **File:** `Src/Screens/DetailedDashboard.js`
  - Removed all imports and JSX usage of `BrandPreviewModal`.
  - Commented out `toggleBrandPreviewModal` dispatch actions.

### ⚙️ Build Fixes
- **File:** `android/app/build.gradle`
  - Added `missingDimensionStrategy 'react-native-capture-protection', 'base'` to fix variant ambiguity.
  - Applied `com.google.firebase.crashlytics` plugin.
- **File:** `android/build.gradle`
  - Set `kotlinVersion = "2.0.21"`.
  - Added Firebase Crashlytics classpath.

### 🎥 Extended Video Player Migration (to `expo-video`)
Finalized the migration by removing all remaining `react-native-video` references.
- **File:** `Src/Components/HomeComponents/HomeVideoPlayer.js`
  - Completely refactored to use `expo-video` for the main home feed video player.
- **File:** `Src/Components/HomeComponents/SharedPost.js`
  - Removed unused `react-native-video` import.
- **File:** `Src/Components/HomeComponents/BrandCards.js`
  - Removed unused `react-native-video` import.
- **File:** `Src/Components/HomeComponents/PostCards.js`
  - Removed unused `react-native-video` import.
- **File:** `Src/Components/NewOtherProfileComponents/OtherProfilePostCard.js`
  - Removed unused `react-native-video` import.
- **File:** `Src/Components/NewOtherProfileComponents/OtherProfileReels.js`
  - Migrated full-screen reels to `expo-video`.
- **File:** `Src/Components/CreatorSpotlightFeed.js`
  - Migrated spotlight preview videos to `expo-video`.
- **File:** `Src/Components/PostComponents/MyProfilePostCard.js`
  - Removed unused `react-native-video` import.
- **File:** `Src/Screens/ChatMediaPreviewScreen.js`
  - Migrated chat video preview to `expo-video`.
  - Removed `react-native-pdf-thumbnail` and replaced with a static PDF icon fallback (`Assets/Images/pdf-thumbnail.png`) to avoid native library dependencies.

### 🗑 Deleted Components & Cleanup
- **File:** `Src/Components/HomeComponents/BrandCards.js`
  - Deleted file (obsolete).
- **File:** `Src/Screens/Home.js`
  - Removed `BrandCards` and `BrandBottomSheet` imports.
  - Removed `brandPostRender` function.

### ⚙️ Build Fixes (Extended)
- **File:** `android/build.gradle`
  - Added `allprojects` block to resolve dependency conflicts.
  - Added `maven` repository for `@notifee/react-native` local libs (Reference from old project).
  - Added Zego and JitPack maven repositories.

### 💳 Payment Integration Cleanup
- **File:** `Src/Cashfree/PhonePe.js`
  - Commented out `react-native-phonepe-pg` requirement to prevent runtime crashes (library not installed).
- **File:** `Src/Screens/Wallet.js`
  - Removed PhonePe-related imports and Redux mutations.
- **File:** `android/build.gradle`
  - Removed PhonePe maven repository as it's not being used.
