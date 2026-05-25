# AI Reference: Android Translucent Keyboard Avoidance

> [!IMPORTANT]
> **READ THIS BEFORE IMPLEMENTING OR MODIFYING KEYBOARD AVOIDANCE OR LAYOUTS.**
> This repository uses a translucent window theme on Android alongside Expo's default edge-to-edge rendering. Traditional keyboard avoidance methods will fail or behave inconsistently.

---

## The Core Technical Challenge

1. **Native Translucency**: The Android theme (`android:windowIsTranslucent = true` inside `styles.xml`) prevents Android's native `adjustResize` window manager behavior from functioning correctly on most screens.
2. **Edge-to-Edge Mode**: Expo SDK 53+ enables edge-to-edge rendering by default on Android.
3. **The Resulting Bug**: Standard React Native `<KeyboardAvoidingView>` with `behavior="height"` or `behavior="padding"` on Android **fails to detect keyboard shifts** (calculating `0` height updates) or gets stuck leaving massive blank bottom margins when closed.

---

## The Established Pattern

To ensure flawless Gboard avoidance on Android without native resizing bugs, **always use manual height listeners** instead of `<KeyboardAvoidingView>` on Android. 

### Implementation Recipe

```javascript
import React, { useEffect, useRef } from 'react';
import { Animated, Keyboard, Platform, KeyboardAvoidingView } from 'react-native';

const MyScreen = ({ headerHeight }) => {
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    // Use DidShow/DidHide on Android since WillShow/WillHide do not exist
    const showListener = Keyboard.addListener('keyboardDidShow', (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height + 12, // +12px spacing offset to keep input snug but not squished
        duration: 200,
        useNativeDriver: false, // Must be false for padding/layout animations
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

  // Conditionally select the container type per platform
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

## Guidelines for Future AI Updates

- **Do NOT Install Keyboard Handling Libraries**: The project has uninstalled `react-native-keyboard-controller`. Do not re-install or push external packages unless explicitly requested.
- **Do NOT use `behavior="padding"` directly inside standard `<KeyboardAvoidingView>` on Android**: It will not trigger layout updates properly under translucency.
- **Always Verify Clean Layout Reset**: Ensure that when the keyboard closes, there are no remaining margins, black backgrounds, or dead spacing at the bottom of the screens.
