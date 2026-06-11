# AI Reference: Android Keyboard Avoidance (adjustNothing + Manual Padding)

> [!IMPORTANT]
> **READ THIS BEFORE IMPLEMENTING OR MODIFYING KEYBOARD AVOIDANCE OR LAYOUTS.**
> This repository uses `adjustNothing` + manual keyboard height tracking on Android.
> Do NOT switch back to `adjustResize` — it is broken by the translucent boot theme.

---

## The Core Technical Challenge

1. **Native Translucency**: The Android `BootTheme` (`android:windowIsTranslucent=true` + `android:windowFullscreen=true` in `styles.xml`) is required by `react-native-bootsplash` to prevent splash flicker.
2. **These flags break `adjustResize`**: On stock-Android-like OEMs (OnePlus, Nothing, Pixel, Samsung), the OS skips window resizing when the activity is fullscreen/translucent. Xiaomi/MIUI ignores this and resizes anyway — causing **inconsistent behavior** across devices.
3. **Edge-to-Edge Mode**: Expo SDK 53+ enables edge-to-edge rendering by default on Android, adding further complexity.

### Why `adjustResize` Failed

| Device | `adjustResize` works? | Result |
|--------|----------------------|--------|
| Xiaomi/MIUI | ✅ Yes (MIUI overrides) | Input snug to keyboard |
| OnePlus/OxygenOS | ❌ No | Gap between keyboard and input |
| Nothing/NothingOS | ❌ No | Gap between keyboard and input |
| Pixel (stock) | ❌ No | Gap between keyboard and input |

---

## The Established Pattern: `adjustNothing` + Manual Height

The manifest is set to `adjustNothing`, meaning Android does **nothing** when the keyboard opens. We handle everything in JavaScript:

### AndroidManifest.xml
```xml
android:windowSoftInputMode="adjustNothing"
```

### app.json
```json
"softwareKeyboardLayoutMode": "pan"
```

### Implementation Recipe (ChatWindow.js pattern)

```javascript
import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Keyboard, Platform, KeyboardAvoidingView } from 'react-native';

const MyScreen = ({ headerHeight }) => {
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showListener = Keyboard.addListener('keyboardDidShow', (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });

    const hideListener = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  // Reset on navigation away to prevent stale padding
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (Platform.OS === 'android') {
          keyboardHeight.setValue(0);
        }
      };
    }, []),
  );

  const Container = Platform.OS === 'android' ? Animated.View : KeyboardAvoidingView;

  const containerProps = Platform.OS === 'android'
    ? { style: { flex: 1, paddingBottom: keyboardHeight } }
    : { style: { flex: 1 }, behavior: 'padding', keyboardVerticalOffset: headerHeight };

  return (
    <Container {...containerProps}>
      {/* Screen layout content */}
    </Container>
  );
};
```

---

## Key Rules

### Do NOT:
- **Switch to `adjustResize`** — it's broken by the translucent boot theme on most OEMs
- **Add `adjustPan`** — it causes the OS to scroll the whole window, often hiding the header
- **Install keyboard handling libraries** (e.g., `react-native-keyboard-controller`) — unless explicitly requested
- **Add manual padding inside child components** (e.g., `ChatWindowInput`) — the parent container handles all keyboard offset
- **Use `KeyboardAvoidingView` on Android** — it doesn't work correctly under translucency

### Do:
- **Use `Animated.View` on Android** with `paddingBottom: keyboardHeight`
- **Use `KeyboardAvoidingView` on iOS** with `behavior: 'padding'`
- **Reset `keyboardHeight` to 0** when navigating away (via `useFocusEffect` cleanup)
- **Use `useSafeAreaInsets()`** for static safe area padding in child components (gesture nav bar)
- **Always verify on multiple OEMs** — test on at least Xiaomi + OnePlus/Nothing/Pixel
