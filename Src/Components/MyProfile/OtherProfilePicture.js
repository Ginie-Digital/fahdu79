import { StyleSheet, View, Pressable, Animated, Easing } from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import { responsiveWidth } from 'react-native-responsive-dimensions';
import { useSelector } from 'react-redux';
import { Image, ImageBackground } from 'expo-image';
import { WIDTH_SIZES } from '../../../DesiginData/Utility';
import { useLazyJoinLiveStreamQuery, useLazyLiveStatusQuery, useLazyOnlineStatusQuery } from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { navigate } from '../../../Navigation/RootNavigation';
import { LoginPageErrors } from '../ErrorSnacks';
import { useAppTheme } from '../../Hook/useAppTheme';

const OtherProfilePicture = ({ displayName, userId }) => {
  const { colors, isDark } = useAppTheme();


  console.log("DISP",)

  const { profileDetails: userProfileDetails } = useSelector(state => state.profileFeedCache.data);


  const token = useSelector(state => state.auth.user.token);

  const [liveStatus] = useLazyLiveStatusQuery();
  const [joinLiveStream] = useLazyJoinLiveStreamQuery();
  const [isLive, setIsLive] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [liveRoomId, setLiveRoomId] = useState(undefined);
  const [onlineStatus] = useLazyOnlineStatusQuery();
  const [loading, setLoading] = useState(false);


  // 🔥 Animation for border
  const rotation = useRef(new Animated.Value(0)).current;

  async function userStatusHandler(displayName) {
    try {
      const response = await onlineStatus({ token, displayName });
      if (response.data?.statusCode === 200) {
        setIsOnline(response.data?.data?.status);
      }
    } catch (error) {
      console.error('Error fetching user status:', error);
    }
  }

  async function liveStatusHandler(userId) {
    try {
      const { data: statusData, error: statusError } = await liveStatus({
        token,
        userId,
      });

      console.log(statusData, 'statusdata');

      if (statusError?.data?.status === false) {
        setIsLive(false);
        return;
      }

      if (statusData?.live) {
        setLiveRoomId(statusData?.roomId);
        setIsLive(true);
      } else {
        setIsLive(false);
        setLiveRoomId(undefined);
      }
    } catch (error) {
      console.error('Error in liveStatusHandler:', error);
    }
  }

  const handleJoin = async roomId => {
    if (!roomId || !isLive) return;

    setLoading(true);
    const { error, data } = await joinLiveStream({ token, roomId });

    if (error?.data?.statusCode === 400) {
      LoginPageErrors('Hey!, Livestream has ended');
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate('confirmlivestreamjoin', { data: data?.data, roomId });
  };

  // 🔥 Animate border when live
  useEffect(() => {
    console.log('isLIve', isLive);

    if (isLive) {
      Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 10000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      rotation.stopAnimation();
      rotation.setValue(0);
    }
  }, [isLive]);

  useEffect(() => {
    console.log({ userProfileDetails: userProfileDetails })

    if (userProfileDetails && userId && userId !== 'undefined' && displayName && displayName !== 'undefined') {
      liveStatusHandler(userId);
      userStatusHandler(displayName)
    }

  }, [displayName, userId, userProfileDetails]);





  const rotateInterpolation = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <>
      {/* Cover Image */}
      <View style={{ width: '100%', justifyContent: 'center', alignItems: 'center' }}>
        <ImageBackground key={userProfileDetails?.cover_photo?.url} placeholder={require('../../../Assets/Images/CoverDefault.jpeg')} source={userProfileDetails?.cover_photo?.url} style={[styles.coverStyle, { backgroundColor: isDark ? '#0D0D0D' : 'white' }]} />
      </View>

      {/* Rotating dashed border - only show if displayName and userId exist */}
      {isLive && displayName && userId && <Animated.View style={[styles.rotatingBorder, { transform: [{ rotate: rotateInterpolation }] }]} />}

      {/* Profile Image (static, above border) */}
      <Pressable onPress={() => handleJoin(liveRoomId)} style={[styles.profilePictureWrapper, { backgroundColor: isDark ? '#0D0D0D' : 'white' }]}>
        <Image placeholder={require('../../../Assets/Images/DefaultProfile.jpg')} source={userProfileDetails?.profile_image?.url} style={styles.profilePicture} resizeMethod="resize" contentFit="contain" />
      </Pressable>

      {/* Online/Offline dot - only show if displayName and userId exist */}
      {displayName && userId && (
        <View
          style={{
            width: 13,
            height: 13,
            borderRadius: responsiveWidth(20),
            backgroundColor: isOnline === 'online' ? '#00E532' : '#FF4539',
            borderColor: '#1e1e1e',
            borderWidth: WIDTH_SIZES['1.5'],
            left: '24%',
            top: '5%',
          }}
        />
      )}
    </>
  );
};

export default React.memo(OtherProfilePicture);

const styles = StyleSheet.create({
  coverStyle: {
    height: responsiveWidth(50),
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#0D0D0D',
  },

  // 🔥 Dashed Border Ring (only this rotates)
  rotatingBorder: {
    height: responsiveWidth(25.5),
    width: responsiveWidth(25.5),
    borderRadius: responsiveWidth(20),
    borderStyle: 'dashed',
    borderColor: '#FF7819',
    borderWidth: 3,
    position: 'absolute',
    left: responsiveWidth(5.6),
    top: responsiveWidth(35.5),
  },

  // Static wrapper for the profile image
  profilePictureWrapper: {
    height: responsiveWidth(24),
    width: responsiveWidth(24),
    borderRadius: responsiveWidth(20),
    backgroundColor: '#0D0D0D',
    overflow: 'hidden',
    position: 'absolute',
    left: responsiveWidth(5.6) + responsiveWidth(1), // center inside border
    top: responsiveWidth(32) + responsiveWidth(4.5),
    padding: 4,
  },

  profilePicture: {
    height: '100%',
    width: '100%',
    borderRadius: responsiveWidth(13),
  },
});
