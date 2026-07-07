import {StyleSheet, View, TouchableOpacity, Text, Image, Pressable, BackHandler, Animated, Dimensions, Platform} from 'react-native';
import React, {useCallback, useRef, useState, useEffect} from 'react';
import {responsiveWidth, responsiveFontSize} from 'react-native-responsive-dimensions';
import {useDispatch, useSelector} from 'react-redux';
import {toggleCreatePostBottomSheet, toggleHideShowLiveTerms} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import { navigate } from '../../../Navigation/RootNavigation';
import {LoginPageErrors} from '../ErrorSnacks';
import ImageCropPicker from 'react-native-image-crop-picker';
import {Alert, Linking} from 'react-native';
import {getVideoMetadata} from '../../../FFMPeg/FFMPegModule';
import RNFS from 'react-native-fs';
import {BlurView} from 'expo-blur';
import {useAppTheme} from '../../Hook/useAppTheme';

const WINDOW_HEIGHT = Dimensions.get('window').height;

const CreatePostBottomSheet = () => {
  const dispatch = useDispatch();
  const {colors, isDark} = useAppTheme();

  const visible = useSelector(state => state.hideShow.visibility.createPostSheet === 1);
  const {role} = useSelector(state => state.auth.user);

  const slideAnim = useRef(new Animated.Value(WINDOW_HEIGHT)).current;
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();

      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleClose();
        return true;
      });
      return () => backHandler.remove();
    } else {
      Animated.timing(slideAnim, {
        toValue: WINDOW_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        requestAnimationFrame(() => {
          setShouldRender(false);
        });
      });
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: WINDOW_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      dispatch(toggleCreatePostBottomSheet({show: -1}));
      requestAnimationFrame(() => {
        setShouldRender(false);
      });
    });
  };

  const handleGoToItem = async (index) => {
    if (index === 1) {
      handleClose();
      setTimeout(async () => {
        try {
          const images = await ImageCropPicker.openPicker({
            multiple: true,
            maxFiles: 5,
            mediaType: 'any',
            forceJpg: true,
            compressImageQuality: 1.0,
            compressVideoPreset: 'Passthrough',
          });

          if (!images || images.length === 0) return;

          const hasVideo = images.some(item => 
            (item.mime && item.mime.startsWith('video/')) || 
            ['mp4', 'mov', 'avi', 'mkv', 'm4v', '3gp'].includes((item.path || item.filename || '').split('.').pop()?.toLowerCase())
          );
          
          const hasImage = images.some(item => 
            (item.mime && item.mime.startsWith('image/')) || 
            !((item.mime && item.mime.startsWith('video/')) || ['mp4', 'mov', 'avi', 'mkv', 'm4v', '3gp'].includes((item.path || item.filename || '').split('.').pop()?.toLowerCase()))
          );

          if (hasVideo && hasImage) {
            LoginPageErrors('Please select either images or a video, not both.');
            return;
          }

          if (hasVideo) {
            // Video selected — Validate before navigation
            const video = images[0];
            
            // 1. Size check (150MB)
            if (video.size > 150 * 1024 * 1024) {
              LoginPageErrors('Video size must be less than 150MB.');
              return;
            }

            // 2. Metadata checks (Duration and Resolution)
            const videoMetadata = await getVideoMetadata(video.path);
            if (videoMetadata) {
              // Duration check (60s = 60000ms)
              if (videoMetadata.duration > 60000) {
                LoginPageErrors('Video duration must be less than 1 minute.');
                return;
              }
              // Resolution check (1080p max)
              if (Math.max(videoMetadata.width || 0, videoMetadata.height || 0) > 1920) {
                LoginPageErrors('Video resolution must be 1080p or lower (4K is not supported).');
                return;
              }
            }

            navigate('createpostpage', {
              uri: video.path,
              isVideo: true,
            });
          } else {
            // Images selected — go to filterScreen first
            navigate('filterScreen', {
              uris: images.map(img => img.path),
              width: 4,
              height: 5,
            });
          }
        } catch (e) {
          console.log(e);
        }
      }, 400);
    } else if (index === 2) {
      handleClose();
      setTimeout(() => {
        dispatch(toggleHideShowLiveTerms({show: 1}));
      }, 400);
    }
  };

  if (!shouldRender) return null;

  return (
    <View style={styles.overlay}>
      <BlurView intensity={15} style={styles.blurBackground} />
      <Pressable style={styles.touchOutside} onPress={handleClose} />
      <Animated.View style={[styles.dialog, {backgroundColor: colors.background, transform: [{translateY: slideAnim}]}]}>
        <View style={[styles.indicator, {backgroundColor: colors.border}]} />
        <View style={[styles.contentContainer, {backgroundColor: colors.background}]}>
          <View style={styles.createPostListContainer}>
            <Pressable
              style={({pressed}) => [
                styles.eachlist,
                {backgroundColor: pressed ? (isDark ? colors.pressed : '#FFA86B1C') : colors.background}
              ]}
              onPress={() => handleGoToItem(1)}>
              <Image source={require('../../../Assets/Images/AddPosts.png')} style={styles.icon} />
              <Text style={[styles.text, {color: colors.text}]}>Create Post</Text>
            </Pressable>

            <Pressable
              style={({pressed}) => [
                styles.eachlist,
                {backgroundColor: pressed ? (isDark ? colors.pressed : '#FFA86B1C') : colors.background}
              ]}
              onPress={() => handleGoToItem(2)}>
              <Image source={require('../../../Assets/Images/AddStories.png')} style={styles.iconLarge} />
              <Text style={[styles.text, {color: colors.text}]}>Go Live</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 9999,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  touchOutside: {
    flex: 1,
  },
  dialog: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: '#fff',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  indicator: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  contentContainer: {
    backgroundColor: '#fff',
  },
  createPostListContainer: {
    paddingVertical: responsiveWidth(4),
    flexDirection: 'column',
    gap: responsiveWidth(2),
  },
  eachlist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(4),
    height: responsiveWidth(16),
    paddingHorizontal: 24,
  },
  icon: {
    height: responsiveWidth(8),
    width: responsiveWidth(8),
    resizeMode: 'contain',
  },
  iconLarge: {
    height: responsiveWidth(9),
    width: responsiveWidth(9),
    resizeMode: 'contain',
  },
  text: {
    fontFamily: 'Rubik-Regular',
    color: '#282818',
    fontSize: responsiveFontSize(2.3),
  },
});

export default CreatePostBottomSheet;
