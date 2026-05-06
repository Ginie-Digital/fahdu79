import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { responsiveFontSize, responsiveWidth, responsiveHeight } from 'react-native-responsive-dimensions';
import YoutubePlayer from 'react-native-youtube-iframe';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Constants for perfect alignment
const TABS_PADDING = 4;
const TABS_MARGIN_HORIZONTAL = 28;
const CONTAINER_WIDTH = SCREEN_WIDTH - (TABS_MARGIN_HORIZONTAL * 2);
const TAB_WIDTH = (CONTAINER_WIDTH - (TABS_PADDING * 2)) / 2;

const VIDEOS = {
  audio: {
    id: 'aC84poX3k9Q',
    title: 'Audio Call',
  },
  video: {
    id: '1zGzEzWQ460',
    title: 'Video Call',
  },
};

const HowCallsWorkSheet = ({ visible, onClose, initialTab = 'audio' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(initialTab === 'audio' ? 0 : 1)).current;
  const [isRendered, setIsRendered] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const currentVideo = VIDEOS[activeTab];

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      setVideoReady(false); // Reset loader on open
      setActiveTab(initialTab);
      tabIndicatorAnim.setValue(initialTab === 'audio' ? 0 : 1);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 24,
          stiffness: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsRendered(false);
      });
    }
  }, [visible, initialTab]);

  const handleTabSwitch = useCallback((tab) => {
    if (tab === activeTab) return;
    
    setVideoReady(false); // Show loader when switching tabs
    setActiveTab(tab);
    ReactNativeHapticFeedback.trigger('impactLight');
    Animated.spring(tabIndicatorAnim, {
      toValue: tab === 'audio' ? 0 : 1,
      damping: 20,
      stiffness: 150,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  if (!isRendered) return null;

  const translateX = tabIndicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TAB_WIDTH],
  });

  return (
    <View style={styles.overlay} pointerEvents={visible ? "auto" : "none"}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.handleBar} />

        <View style={styles.header}>
          <View style={{ width: 32 }} />
          <Text style={styles.headerTitle}>How it works?</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabsWrapper}>
          <View style={styles.tabContainer}>
            <Animated.View 
              style={[
                styles.tabIndicator, 
                { 
                  width: TAB_WIDTH,
                  transform: [{ translateX }]
                }
              ]} 
            />
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => handleTabSwitch('audio')}
              activeOpacity={0.9}
            >
              <Text style={[styles.tabText, activeTab === 'audio' && styles.tabTextActive]}>
                Audio Call
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => handleTabSwitch('video')}
              activeOpacity={0.9}
            >
              <Text style={[styles.tabText, activeTab === 'video' && styles.tabTextActive]}>
                Video Call
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.videoPlayerWrapper}>
          <View style={styles.videoContainer}>
            <View style={{ width: YOUTUBE_WIDTH, height: YOUTUBE_HEIGHT, transform: [{ scale: VIDEO_SCALE }], justifyContent: 'center', alignItems: 'center' }}>
              <YoutubePlayer
                key={currentVideo.id}
                height={YOUTUBE_HEIGHT}
                width={YOUTUBE_WIDTH}
                videoId={currentVideo.id}
                play={visible}
                onReady={() => setVideoReady(true)}
                webViewProps={{
                  allowsInlineMediaPlayback: true,
                  style: { backgroundColor: 'transparent' }
                }}
              />
            </View>
            {!videoReady && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#888" />
                <Text style={styles.loadingText}>Loading video...</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

export default HowCallsWorkSheet;

const VIDEO_WIDTH = SCREEN_WIDTH - 48;
const ACTUAL_VIDEO_HEIGHT = VIDEO_WIDTH * (9 / 16); 

// YouTube Iframe requires minimum ~200px height. We render a larger 16:9 player
// internally (400x225) to satisfy the API, then scale it down perfectly to fit our UI.
const YOUTUBE_WIDTH = 400; // Safely large
const YOUTUBE_HEIGHT = YOUTUBE_WIDTH * (9 / 16); // 225
const VIDEO_SCALE = VIDEO_WIDTH / YOUTUBE_WIDTH;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: responsiveHeight(88),
  },
  handleBar: {
    width: 36,
    height: 5,
    backgroundColor: '#E5E5E5',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  headerTitle: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(2.6),
    color: '#000000',
    textAlign: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Rubik-Medium',
  },
  tabsWrapper: {
    marginBottom: 24,
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    width: CONTAINER_WIDTH,
    height: 52,
    backgroundColor: '#F4F4F4',
    borderRadius: 26,
    padding: TABS_PADDING,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    height: 44,
    top: TABS_PADDING,
    left: TABS_PADDING,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  tabText: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.8),
    color: '#888888',
  },
  tabTextActive: {
    color: '#000000',
    fontFamily: 'Rubik-Bold',
  },
  videoPlayerWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  videoContainer: {
    width: VIDEO_WIDTH,
    height: ACTUAL_VIDEO_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: 24,
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.6),
    color: '#999',
  },
});
