import React, {useEffect, useState, useCallback} from 'react';
import {View, Text, StyleSheet, Pressable, Dimensions, TouchableOpacity, BackHandler, Platform, useColorScheme} from 'react-native';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import {BlurView} from 'expo-blur';
import {toggleRatingModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {useDispatch, useSelector} from 'react-redux';
import Svg, {Path} from 'react-native-svg';
import {useRateUserMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {setRating} from '../../../Redux/Slices/NormalSlices/OtherProfile/OtherProfileUserInfoSlice';

const Star = ({filled, onPress, isDark}) => {
  return (
    <TouchableOpacity onPress={onPress} style={{marginHorizontal: 6}}>
      <Svg width={40} height={40} viewBox="0 0 24 24" fill={filled ? '#FF9966' : 'none'} stroke={filled ? '#FF7819' : (isDark ? '#555555' : '#CCCCCC')} strokeWidth={1.5} strokeLinejoin="round">
        <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01z" />
      </Svg>
    </TouchableOpacity>
  );
};

const OtherProfileRatingSheet = () => {
  const dispatch = useDispatch();
  const thisUserInfo = useSelector(state => state.otherProfileUserInfo);
  const token = useSelector(state => state.auth.user.token);
  const visible = useSelector(state => state.hideShow.visibility.ratingModal);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [rate, setRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [rateUser] = useRateUserMutation();

  useEffect(() => {
    if (visible) {
      setRate(thisUserInfo?.rating || 0);
      setError(null);

      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleClose();
        return true;
      });
      return () => backHandler.remove();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    dispatch(toggleRatingModal({show: false}));
  }, [dispatch]);

  const handleRating = async () => {
    if (rate === 0) {
      setError('Select stars');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const response = await rateUser({token, displayName: thisUserInfo?.data?.displayName, rating: rate});
      
      if (response?.data?.statusCode === 200) {
        dispatch(setRating({rate: rate}));
        handleClose();
      } else if (response?.error?.data?.status_code === 400) {
        setError("Already rated");
        setTimeout(() => {
           handleClose();
        }, 1500);
      } else {
        setError(response?.error?.data?.message || 'Error');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const darkStyles = isDark ? darkModeOverrides : lightModeOverrides;

  return (
    <View style={styles.overlay}>
      <BlurView intensity={15} tint={isDark ? 'dark' : 'light'} style={styles.blurBackground} />
      <Pressable style={styles.touchOutside} onPress={handleClose} />
      <View style={[styles.dialog, darkStyles.dialog]}>
        <View style={styles.content}>
          {/* Title */}
          <Text style={[styles.title, darkStyles.title]} numberOfLines={1} ellipsizeMode="tail">
            Rate @{thisUserInfo?.data?.displayName}
          </Text>

          {/* Stars */}
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map(num => (
              <Star 
                key={num} 
                filled={num <= rate} 
                isDark={isDark}
                onPress={() => {
                  setRate(num);
                  setError(null);
                }} 
              />
            ))}
          </View>

          {/* Error Message */}
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {/* Submit Button */}
          <Pressable
            onPress={handleRating}
            disabled={loading}
            style={({pressed}) => [
              styles.submitButton,
              darkStyles.submitButton,
              pressed && {opacity: 0.85},
              loading && {opacity: 0.7},
            ]}>
            <Text style={[styles.submitText, darkStyles.submitText]}>
              {loading ? 'Submitting...' : 'Submit'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  touchOutside: {
    ...StyleSheet.absoluteFillObject,
  },
  dialog: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignSelf: 'center',
    padding: 28,
    paddingVertical: 32,
    width: responsiveWidth(88),
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  title: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 20,
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  errorText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 13,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 12,
  },
  submitButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  submitText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 16,
    lineHeight: 19,
    textAlign: 'center',
  },
});

// Dark mode styles
const darkModeOverrides = StyleSheet.create({
  dialog: {
    backgroundColor: '#121212',
    borderColor: '#1E1E1E',
  },
  title: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#FFA86B',
    borderColor: '#FF7819',
  },
  submitText: {
    color: '#1E1E1E',
  },
});

// Light mode styles
const lightModeOverrides = StyleSheet.create({
  dialog: {
    backgroundColor: '#FFFFFF',
    borderColor: '#1E1E1E',
  },
  title: {
    color: '#1E1E1E',
  },
  submitButton: {
    backgroundColor: '#FFA86B',
    borderColor: '#1E1E1E',
  },
  submitText: {
    color: '#1E1E1E',
  },
});

export default OtherProfileRatingSheet;

