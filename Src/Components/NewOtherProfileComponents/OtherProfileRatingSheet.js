import React, {useEffect, useState, useRef, useCallback} from 'react';
import {View, Text, StyleSheet, Animated, Pressable, Dimensions, TouchableOpacity, BackHandler, Platform} from 'react-native';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {BlurView} from 'expo-blur';
import {toggleRatingModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {useDispatch, useSelector} from 'react-redux';
import {FONT_SIZES} from '../../../DesiginData/Utility';
import Svg, {Path} from 'react-native-svg';
import {useRateUserMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {setRating} from '../../../Redux/Slices/NormalSlices/OtherProfile/OtherProfileUserInfoSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

const WINDOW_HEIGHT = Dimensions.get('window').height;

const Star = ({filled, onPress}) => {
  return (
    <TouchableOpacity onPress={onPress} style={{marginHorizontal: 4}}>
      <Svg width={36} height={36} viewBox="0 0 24 24" fill={filled ? '#FF9966' : 'white'} stroke="black" strokeWidth={1.5} strokeLinejoin="round">
        <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01z" />
      </Svg>
    </TouchableOpacity>
  );
};

const OtherProfileRatingSheet = () => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const thisUserInfo = useSelector(state => state.otherProfileUserInfo);
  const token = useSelector(state => state.auth.user.token);
  const visible = useSelector(state => state.hideShow.visibility.ratingModal);

  const [rate, setRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shouldRender, setShouldRender] = useState(visible);
  
  const slideAnim = useRef(new Animated.Value(WINDOW_HEIGHT)).current;
  const [rateUser] = useRateUserMutation();

  useEffect(() => {
    if (visible) {
      setRate(thisUserInfo?.rating || 0);
      setError(null);
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

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: WINDOW_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      dispatch(toggleRatingModal({show: false}));
      requestAnimationFrame(() => {
        setShouldRender(false);
      });
    });
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

  if (!shouldRender) return null;

  return (
    <View style={styles.overlay}>
      <BlurView intensity={15} style={styles.blurBackground} />
      <Pressable style={styles.touchOutside} onPress={handleClose} />
      <Animated.View 
        style={[
          styles.dialog, 
          {transform: [{translateY: slideAnim}]}
        ]}
      >
        <View style={styles.indicator} />
        
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">Rate @{thisUserInfo?.data?.displayName}</Text>
              <Text style={styles.subtitle}>How was your experience?</Text>
            </View>
            <View style={[styles.iconCircle, {backgroundColor: '#F5F2ED'}]}>
              <Ionicons name="star" size={24} color="#1e1e1e" />
            </View>
          </View>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map(num => (
              <Star 
                key={num} 
                filled={num <= rate} 
                onPress={() => {
                  setRate(num);
                  setError(null);
                }} 
              />
            ))}
          </View>
        </View>

        {/* Footer Actions */}
        <View style={[styles.footer, {paddingBottom: (insets.bottom || 20) + 10}]}>
          <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
             <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleRating} 
            style={[
              styles.doneButton, 
              loading && {opacity: 0.7},
              error && styles.errorButton
            ]}
            disabled={loading}
          >
            <Text style={[styles.doneText, error && styles.errorTextWhite]}>
              {loading ? 'Submitting...' : (error ? error : 'Submit')}
            </Text>
          </TouchableOpacity>
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
    backgroundColor: '#fffef9',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
  },
  indicator: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    paddingHorizontal: responsiveWidth(8),
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  title: {
    fontSize: responsiveFontSize(2.2),
    color: '#1e1e1e',
    fontFamily: 'Rubik-SemiBold',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: responsiveFontSize(1.6),
    color: '#9E9E9E',
    fontFamily: 'Rubik-Regular',
    marginTop: 4,
  },
  contentContainer: {
    paddingHorizontal: responsiveWidth(8),
  },
  stars: {
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginVertical: 16,
    marginBottom: 32,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: responsiveWidth(8),
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  cancelButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: responsiveFontSize(1.9),
  },
  doneButton: {
    backgroundColor: '#1E1E1E',
    borderRadius: 66,
    paddingHorizontal: 24,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  errorButton: {
    backgroundColor: '#F5F2ED',
    borderColor: '#F5F2ED',
    minWidth: 140,
  },
  doneText: {
    fontFamily: 'Rubik-SemiBold',
    color: '#fff',
    fontSize: responsiveFontSize(1.8),
  },
  errorTextWhite: {
    color: '#FF6B6B',
  },
});

export default OtherProfileRatingSheet;
