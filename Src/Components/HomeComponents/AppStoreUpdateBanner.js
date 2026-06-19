import React, {memo, useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  Animated,
} from 'react-native';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import DeviceInfo from 'react-native-device-info';
import Feather from 'react-native-vector-icons/Feather';

const IOS_BUNDLE_ID = 'com.giniedigital.fahdu';
const ITUNES_LOOKUP_URL = `https://itunes.apple.com/lookup?bundleId=${IOS_BUNDLE_ID}`;


/**
 * Compares two semver version strings (e.g. "3.0.2" vs "3.0.1").
 * Returns true if storeVersion is greater than installedVersion.
 */
function isNewerVersion(storeVersion, installedVersion) {
  const storeParts = storeVersion.split('.').map(Number);
  const installedParts = installedVersion.split('.').map(Number);

  for (let i = 0; i < Math.max(storeParts.length, installedParts.length); i++) {
    const s = storeParts[i] || 0;
    const c = installedParts[i] || 0;
    if (s > c) return true;
    if (s < c) return false;
  }
  return false;
}

const AppStoreUpdateBanner = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');
  const [storeVersion, setStoreVersion] = useState('');
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Only run on iOS
    if (Platform.OS !== 'ios') return;

    const checkForStoreUpdate = async () => {
      try {
        const response = await fetch(ITUNES_LOOKUP_URL);
        const data = await response.json();

        if (data?.resultCount > 0 && data?.results?.[0]) {
          const latestVersion = data.results[0].version;
          const trackViewUrl = data.results[0].trackViewUrl;
          const installedVersion = DeviceInfo.getVersion();

          console.log(
            `[AppStoreUpdate] Store: ${latestVersion}, Installed: ${installedVersion}`,
          );

          if (isNewerVersion(latestVersion, installedVersion)) {
            setStoreVersion(latestVersion);
            setStoreUrl(trackViewUrl);
            setUpdateAvailable(true);
          }
        }
      } catch (error) {
        console.log('[AppStoreUpdate] Check failed:', error?.message);
      }
    };

    // Delay the check slightly so it doesn't block initial feed render
    const timeout = setTimeout(checkForStoreUpdate, 4000);
    return () => clearTimeout(timeout);
  }, []);

  // Animate in when update becomes available
  useEffect(() => {
    if (updateAvailable) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [updateAvailable]);

  const handleDismiss = () => {
    // Animate out — session-only dismiss, banner will reappear on next app launch
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setUpdateAvailable(false);
    });
  };

  const handleUpdate = () => {
    if (storeUrl) {
      Linking.openURL(storeUrl).catch(err =>
        console.log('[AppStoreUpdate] Failed to open store:', err),
      );
    }
  };

  if (!updateAvailable) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{translateY: slideAnim}],
          opacity: opacityAnim,
        },
      ]}>
      <View style={styles.iconContainer}>
        <View style={styles.iconBadge}>
          <Feather name="arrow-up-circle" size={18} color="#fff" />
        </View>
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>New version available</Text>
        <Text style={styles.subtitle}>
          Fahdu v{storeVersion} is on the App Store
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.updateButton}
          onPress={handleUpdate}>
          <Text style={styles.updateText}>Update</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.dismissButton}
          onPress={handleDismiss}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Feather name="x" size={16} color="#71717A" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    marginHorizontal: responsiveWidth(3),
    marginTop: responsiveWidth(2),
    marginBottom: responsiveWidth(1),
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  iconContainer: {
    marginRight: 10,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#18181B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.6),
    color: '#18181B',
    letterSpacing: -0.1,
  },
  subtitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.35),
    color: '#71717A',
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  updateButton: {
    backgroundColor: '#18181B',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  updateText: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.45),
    color: '#FFFFFF',
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default memo(AppStoreUpdateBanner);
