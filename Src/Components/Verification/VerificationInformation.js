import {StyleSheet, View, TouchableOpacity, Text, Pressable, BackHandler, Platform, ScrollView, Image} from 'react-native';
import React, {useMemo, useCallback, useRef, useState, useEffect, memo} from 'react';
import {responsiveWidth, responsiveFontSize} from 'react-native-responsive-dimensions';
import {BottomSheetBackdrop, BottomSheetModal, BottomSheetView, BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {useDispatch} from 'react-redux';
import {navigate} from '../../../Navigation/RootNavigation';
import Svg, {Path} from 'react-native-svg';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
  runOnJS,
} from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useAppTheme} from '../../Hook/useAppTheme';
import AnimatedButton from '../AnimatedButton';

const darkFollower = require('../../../Assets/BlackEligibility/Follower.png');
const darkPublic = require('../../../Assets/BlackEligibility/Public.png');
const darkNoMeme = require('../../../Assets/BlackEligibility/NoMeme.png');

const lightFollower = require('../../../Assets/Images/Eligibility/ElFollower.png');
const lightPublic = require('../../../Assets/Images/Eligibility/ElPublic.png');
const lightNoMeme = require('../../../Assets/Images/Eligibility/ElNoMeme.png');

const EligibilityItem = memo(({icon, title, description}) => {
  const {isDark} = useAppTheme();
  return (
    <View style={[
      styles.termItemRow, 
      isDark 
        ? {backgroundColor: '#1E1E1E', borderColor: '#1E1E1E', borderWidth: 1.5} 
        : {backgroundColor: '#FFFFFF', borderColor: '#1E1E1E', borderWidth: 2}
    ]}>
      <View style={[
        styles.iconContainer,
        !isDark && {
          backgroundColor: '#1E1E1E',
          borderWidth: 1,
          borderColor: '#1E1E1E',
          borderRadius: 16,
        }
      ]}>
        <Image source={icon} style={isDark ? styles.iconImageDark : styles.iconImageLight} resizeMode="contain" />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.termTitle, {color: isDark ? '#FFFFFF' : '#000000'}]}>{title}</Text>
        <Text style={[styles.termDescription, {color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#1E1E1E'}]}>{description}</Text>
      </View>
    </View>
  );
});

const VerificationInformation = ({agreeModal, setAgreeModal}) => {
  const {colors, isDark} = useAppTheme();
  const insets = useSafeAreaInsets();
  const [isChecked, setIsChecked] = useState(false);
  const [isItalicState, setIsItalicState] = useState(false);

  const bottomSheetModalRef = useRef(null);
  const isAgreedRef = useRef(false);
  const dispatch = useDispatch();

  // Animation Values
  const shakeOffset = useSharedValue(0);

  const triggerShake = useCallback(() => {
    setIsItalicState(true);
    shakeOffset.value = withSequence(
      withTiming(-10, {duration: 50}),
      withRepeat(withTiming(10, {duration: 50}), 5, true),
      withTiming(0, {duration: 50}, (finished) => {
        if (finished) runOnJS(setIsItalicState)(false);
      })
    );
  }, [shakeOffset]);

  const handleButtonPress = useCallback(() => {
    const hapticOptions = {enableVibrateFallback: true, ignoreAndroidSystemSettings: false};

    if (isChecked) {
      isAgreedRef.current = true;
      ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
      setAgreeModal(false);
    } else {
      ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
      triggerShake();
    }
  }, [isChecked, setAgreeModal, triggerShake]);

  const animatedTextStyle = useAnimatedStyle(() => ({
    transform: [{translateX: shakeOffset.value}],
    fontStyle: isItalicState ? 'italic' : 'normal',
  }));

  const handlePresentModalPress = useCallback(() => {
    requestAnimationFrame(() => bottomSheetModalRef.current?.present());
  }, []);

  const onBackPress = useCallback(() => {
    if (bottomSheetModalRef.current) {
        bottomSheetModalRef.current.dismiss();
        return true;
    }
    return false;
  }, []);

  const backHandlerRef = useRef(null);

  useEffect(() => {
    if (agreeModal) {
      isAgreedRef.current = false;
      setIsChecked(false);
      handlePresentModalPress();
      backHandlerRef.current = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    } else {
      bottomSheetModalRef.current?.dismiss();
      backHandlerRef.current?.remove();
      backHandlerRef.current = null;
    }
    return () => {
      backHandlerRef.current?.remove();
      backHandlerRef.current = null;
    };
  }, [agreeModal, handlePresentModalPress, onBackPress]);

  const renderBackdrop = useCallback(props => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
  ), []);

  // Snap points - Compact height to eliminate empty bottom spacing
  const snapPoints = useMemo(() => [Platform.OS === 'ios' ? '58%' : '68%'], []);

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={agreeModal ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose={false} // Eligibility is usually mandatory to acknowledge
      enableContentPanningGesture={false} // Prevents sheet from dragging via content, allowing scroll view to work
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={[
        styles.modalBackground, 
        isDark && {
          backgroundColor: '#121212',
        }
      ]}
      handleIndicatorStyle={[styles.indicator, isDark && {backgroundColor: '#1E1E1E'}]}
      onDismiss={() => {
        if (!isAgreedRef.current) {
          navigate('home');
        }
        setAgreeModal(false);
      }}>
      
      <BottomSheetView style={{flex: 1}}>
        {/* FIXED HEADER */}
        <View style={[styles.headerContainer, isDark && {borderBottomColor: 'transparent'}]}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={[styles.headerText, isDark && {color: '#FFFFFF'}]}>Eligibility</Text>
            <TouchableOpacity onPress={() => bottomSheetModalRef.current?.dismiss()} style={styles.closeIcon}>
              <Ionicons name="close" size={24} color={isDark ? '#FFFFFF' : '#1E1E1E'} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.subHeaderText, {color: isDark ? '#FFFFFF' : '#1E1E1E'}]}>To become a Fahdu Creator, your Instagram account must:</Text>
        </View>

        {/* SCROLLABLE CONTENT */}
        <BottomSheetScrollView 
           style={{flex: 1}} 
           contentContainerStyle={styles.scrollContent} 
           showsVerticalScrollIndicator={true}
        >
          <EligibilityItem icon={isDark ? darkFollower : lightFollower} title="50K+ Followers" description="Must have at least 50,000 followers." />
          <EligibilityItem icon={isDark ? darkPublic : lightPublic} title="Public Account" description="Your Instagram account must be public." />
          <EligibilityItem icon={isDark ? darkNoMeme : lightNoMeme} title="No Meme Pages" description="Fan & Meme pages are not eligible." />
        </BottomSheetScrollView>

        {/* PINNED FOOTER */}
        <View style={[
          styles.footer, 
          {
            paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : Math.max(insets.bottom, 12),
            paddingTop: 8,
          }, 
          {
            backgroundColor: isDark ? '#121212' : '#fffef9',
            borderTopColor: 'transparent',
            borderTopWidth: 0,
          }
        ]}>
          <View style={styles.checkboxWrapper}>
            <TouchableOpacity 
              activeOpacity={0.7}
              style={[
                styles.checkbox, 
                isDark 
                  ? {borderColor: '#262626', backgroundColor: '#262626'} 
                  : {borderColor: '#1E1E1E', backgroundColor: '#FFFFFF'},
                isChecked && (isDark ? styles.checkedCheckboxDark : styles.checkedCheckboxLight), 
              ]} 
              onPress={() => setIsChecked(!isChecked)}>
              {isChecked && (
                <Svg width="8" height="7" viewBox="0 0 8 7" fill="none">
                  <Path d="M1 3.28571L3 5.28571L7 1" stroke={isDark ? '#FFA86B' : '#1E1E1E'} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              )}
            </TouchableOpacity>
            <Animated.Text onPress={() => setIsChecked(!isChecked)} style={[styles.acceptAllText, animatedTextStyle, {color: isDark ? '#FFFFFF' : '#1E1E1E'}]}>
              Accept All.
            </Animated.Text>
          </View>

          <View style={{marginTop: 8, marginBottom: 0, width: '100%'}}>
            <AnimatedButton
              title="I Agree"
              isDark={isDark}
              onPress={handleButtonPress}
              buttonMargin={0}
            />
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    backgroundColor: '#fffef9',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  indicator: {backgroundColor: '#1e1e1e', width: 40},
  headerContainer: {
    paddingHorizontal: Platform.OS === 'ios' ? 24 : 24,
    paddingTop: Platform.OS === 'ios' ? 16 : 16,
    paddingBottom: Platform.OS === 'ios' ? 4 : 6,
    borderBottomWidth: 0,
  },
  scrollContent: {
    paddingHorizontal: Platform.OS === 'ios' ? 24 : 24, 
    paddingTop: Platform.OS === 'ios' ? 4 : 6, 
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
  },
  headerText: {
    fontFamily: 'Rubik-Bold',
    fontSize: Platform.OS === 'ios' ? 22 : 22,
    lineHeight: Platform.OS === 'ios' ? 22 : 24,
    color: '#1e1e1e',
  },
  closeIcon: {
    padding: 4,
  },
  subHeaderText: {
    fontFamily: 'Rubik-Regular',
    color: '#555555',
    fontSize: Platform.OS === 'ios' ? 13 : 13,
    lineHeight: Platform.OS === 'ios' ? 17 : 18,
    marginTop: Platform.OS === 'ios' ? 6 : 6,
  },
  termItemRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    borderRadius: Platform.OS === 'ios' ? 16 : 16,
    padding: Platform.OS === 'ios' ? 12 : 14,
    marginBottom: Platform.OS === 'ios' ? 8 : 10,
  },
  iconContainer: { 
    width: Platform.OS === 'ios' ? 40 : 44, 
    height: Platform.OS === 'ios' ? 40 : 44, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: Platform.OS === 'ios' ? 12 : 14,
  },
  iconImageDark: {
    width: Platform.OS === 'ios' ? 40 : 44,
    height: Platform.OS === 'ios' ? 40 : 44,
  },
  iconImageLight: {
    width: Platform.OS === 'ios' ? 28 : 30,
    height: Platform.OS === 'ios' ? 28 : 30,
  },
  textContainer: {
    flex: 1,
  },
  termTitle: { 
    fontFamily: 'Rubik-Bold', 
    fontSize: Platform.OS === 'ios' ? 15 : 16, 
    lineHeight: Platform.OS === 'ios' ? 15 : 18,
    marginBottom: Platform.OS === 'ios' ? 3 : 4,
  },
  termDescription: { 
    fontFamily: 'Rubik-Medium', 
    fontSize: Platform.OS === 'ios' ? 11 : 12, 
    lineHeight: Platform.OS === 'ios' ? 14 : 16,
  },
  
  footer: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: Platform.OS === 'ios' ? 24 : 24,
    paddingTop: Platform.OS === 'ios' ? 10 : 12,
    borderTopWidth: 0,
  },
  checkboxWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  checkbox: {
    width: 17,
    height: 17,
    borderWidth: 1,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 9,
  },
  checkedCheckboxDark: { backgroundColor: '#262626', borderColor: '#262626' },
  checkedCheckboxLight: { backgroundColor: '#FFA86B', borderColor: '#FFA86B' },
  acceptAllText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 14,
    lineHeight: 17,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default memo(VerificationInformation);