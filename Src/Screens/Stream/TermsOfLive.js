import {StyleSheet, View, TouchableOpacity, Text, Pressable, BackHandler, Platform} from 'react-native';
import React, {useMemo, useCallback, useRef, useState, useEffect, memo} from 'react';
import {responsiveWidth, responsiveFontSize} from 'react-native-responsive-dimensions';
import {BottomSheetBackdrop, BottomSheetModal, BottomSheetView, BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {useDispatch, useSelector} from 'react-redux';
import {toggleHideShowLiveTerms} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {useNavigation} from '@react-navigation/native';
import Tik from '../../../Assets/svg/tiklive.svg';
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

const TermItem = memo(({icon, title, description}) => (
  <View style={styles.termItemRow}>
    <View style={styles.iconContainer}>
      <Ionicons name={icon} size={20} color="#FFA86B" />
    </View>
    <View style={{flex: 1}}>
      <Text style={styles.termTitle}>{title}</Text>
      <Text style={styles.termDescription}>{description}</Text>
    </View>
  </View>
));

const TermsOfLive = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [isChecked, setIsChecked] = useState(false);
  const [isItalicState, setIsItalicState] = useState(false);

  const bottomSheetModalRef = useRef(null);
  const liveTermsHideShow = useSelector(state => state.hideShow.visibility.hideShowLiveTerms);
  const dispatch = useDispatch();

  // Animation Values
  const shakeOffset = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const buttonOpacity = useSharedValue(1);

  const triggerShake = useCallback(() => {
    setIsItalicState(true);
    buttonOpacity.value = withSequence(withTiming(0.6, {duration: 150}), withTiming(1, {duration: 150}));
    shakeOffset.value = withSequence(
      withTiming(-10, {duration: 50}),
      withRepeat(withTiming(10, {duration: 50}), 5, true),
      withTiming(0, {duration: 50}, (finished) => {
        if (finished) runOnJS(setIsItalicState)(false);
      })
    );
  }, []);

  const handleButtonPress = useCallback(() => {
    const hapticOptions = {enableVibrateFallback: true, ignoreAndroidSystemSettings: false};

    if (isChecked) {
      ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
      dispatch(toggleHideShowLiveTerms({show: -1}));
      setTimeout(() => navigation.navigate('beforeStreamScreen'), 500);
    } else {
      ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
      triggerShake();
    }
  }, [isChecked, dispatch, navigation, triggerShake]);

  const animatedTextStyle = useAnimatedStyle(() => ({
    transform: [{translateX: shakeOffset.value}],
    fontStyle: isItalicState ? 'italic' : 'normal',
  }));

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{scale: buttonScale.value}],
    opacity: buttonOpacity.value,
  }));

  const handlePresentModalPress = useCallback(() => {
    requestAnimationFrame(() => bottomSheetModalRef.current?.present());
  }, []);

  const onBackPress = useCallback(() => {
    if (bottomSheetModalRef.current) {
      bottomSheetModalRef.current?.close();
      return true;
    }
    return false;
  }, []);

  const backHandlerRef = useRef(null);

  useEffect(() => {
    if (liveTermsHideShow === 1) {
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
  }, [liveTermsHideShow, handlePresentModalPress, onBackPress]);

  const renderBackdrop = useCallback(props => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
  ), []);

  // Snap points are safer than dynamic sizing for content that might scroll
  const snapPoints = useMemo(() => ['65%'], []);

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={liveTermsHideShow === 1 ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.modalBackground}
      handleIndicatorStyle={styles.indicator}
      onDismiss={() => dispatch(toggleHideShowLiveTerms({show: -1}))}>
      
      {/* Container must have flex: 1 to show children */}
      <BottomSheetView style={{ flex: 1 }}>
        
        {/* ScrollView must have flex: 1 to occupy space above footer */}
        <BottomSheetScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.headerText}>Go Live Guidelines</Text>
          <Text style={styles.subHeaderText}>Keep our community safe by following these simple rules:</Text>

          <TermItem icon="heart" title="Respect Others" description="Do not engage in hate speech, nudity, bullying, or harassment of any kind." />
          <TermItem icon="shield-checkmark" title="Be Authentic" description="Do not misrepresent yourself or your content." />
          <TermItem icon="document-text" title="Respect Intellectual Property" description="Do not use copyrighted material without permission." />
        </BottomSheetScrollView>

        {/* PINNED FOOTER */}
        <View style={[styles.footer, {paddingBottom: insets.bottom + 16}]}>
          <View style={styles.checkboxWrapper}>
            <TouchableOpacity 
              activeOpacity={0.7}
              style={[styles.checkbox, isChecked && styles.checkedCheckbox]} 
              onPress={() => setIsChecked(!isChecked)}>
              {isChecked && <Tik />}
            </TouchableOpacity>
            <Animated.Text onPress={() => setIsChecked(!isChecked)} style={[styles.acceptAllText, animatedTextStyle]}>
              Accept All.
            </Animated.Text>
          </View>

          <Pressable 
            onPress={handleButtonPress}
            onPressIn={() => (buttonScale.value = withTiming(0.95))}
            onPressOut={() => (buttonScale.value = withTiming(1))}
            style={styles.doneButton}>
            <Animated.View style={[styles.buttonContent, animatedButtonStyle]}>
              <Text style={styles.doneText}>I Agree</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{marginLeft: 6}} />
            </Animated.View>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  modalBackground: { backgroundColor: '#fffef9' },
  indicator: { backgroundColor: '#1e1e1e', width: 40 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20 },
  headerText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(2.5),
    color: '#1e1e1e',
    marginBottom: 8,
  },
  subHeaderText: {
    fontFamily: 'Rubik-Medium',
    color: '#282828',
    fontSize: responsiveFontSize(1.7),
    lineHeight: 22,
    marginBottom: 10,
  },
  termItemRow: { flexDirection: 'row', marginTop: 20, alignItems: 'flex-start' },
  iconContainer: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  termTitle: { color: '#1e1e1e', fontFamily: 'Rubik-SemiBold', fontSize: responsiveWidth(3.8), marginBottom: 2 },
  termDescription: { color: '#555', fontFamily: 'Rubik-Regular', fontSize: responsiveWidth(3.4), lineHeight: 20 },
  
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#fffef9',
  },
  checkboxWrapper: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 5,
    borderColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkedCheckbox: { backgroundColor: '#FFA86B', borderColor: '#FFA86B' },
  acceptAllText: {
    color: '#1e1e1e',
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(1.7),
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  doneButton: {
    backgroundColor: '#1E1E1E',
    borderRadius: 100,
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  buttonContent: { flexDirection: 'row', alignItems: 'center' },
  doneText: {
    fontFamily: 'Rubik-SemiBold',
    color: '#FFFFFF',
    fontSize: responsiveFontSize(1.6),
    includeFontPadding: false,
  },
});

export default memo(TermsOfLive);