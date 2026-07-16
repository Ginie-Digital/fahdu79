import {StyleSheet, View, TouchableOpacity, Text, Pressable, BackHandler, Platform, ScrollView} from 'react-native';
import React, {useMemo, useCallback, useRef, useState, useEffect, memo} from 'react';
import {responsiveWidth, responsiveFontSize} from 'react-native-responsive-dimensions';
import {BottomSheetBackdrop, BottomSheetModal, BottomSheetView, BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {useDispatch} from 'react-redux';
import {navigate} from '../../../Navigation/RootNavigation';
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
import {useAppTheme} from '../../Hook/useAppTheme';

const EligibilityItem = memo(({icon, title, description}) => {
  const {colors, isDark} = useAppTheme();
  return (
    <View style={styles.termItemRow}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={20} color="#FFA86B" />
      </View>
      <View style={{flex: 1}}>
        <Text style={[styles.termTitle, isDark && {color: colors.text}]}>{title}</Text>
        <Text style={[styles.termDescription, isDark && {color: colors.textSecondary}]}>{description}</Text>
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
  }, [buttonOpacity, shakeOffset]);

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

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{scale: buttonScale.value}],
    opacity: buttonOpacity.value,
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

  // Snap points - Android needs more space to account for system navigation bar
  const snapPoints = useMemo(() => [Platform.OS === 'ios' ? '60%' : '75%'], []);

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={agreeModal ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose={false} // Eligibility is usually mandatory to acknowledge
      enableContentPanningGesture={false} // Prevents sheet from dragging via content, allowing scroll view to work
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={[styles.modalBackground, isDark && {backgroundColor: colors.background}]}
      handleIndicatorStyle={[styles.indicator, isDark && {backgroundColor: colors.border}]}
      onDismiss={() => {
        if (!isAgreedRef.current) {
          navigate('home');
        }
        setAgreeModal(false);
      }}>
      
      <BottomSheetView style={{flex: 1}}>
        {/* FIXED HEADER */}
        <View style={[styles.headerContainer, isDark && {borderBottomColor: colors.border}]}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
            <Text style={[styles.headerText, isDark && {color: colors.text}]}>Eligibility</Text>
            <TouchableOpacity onPress={() => bottomSheetModalRef.current?.dismiss()} style={styles.closeIcon}>
              <Ionicons name="close" size={24} color={isDark ? colors.text : "#1e1e1e"} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.subHeaderText, isDark && {color: colors.textSecondary}]}>Please ensure you meet the following criteria to apply for verification:</Text>
        </View>

        {/* SCROLLABLE CONTENT */}
        <BottomSheetScrollView 
           style={{flex: 1}} 
           contentContainerStyle={styles.scrollContent} 
           showsVerticalScrollIndicator={true}
        >
          <EligibilityItem icon="stats-chart-outline" title="Follower Count" description="You should have a minimum of 50K followers on Instagram." />
          <EligibilityItem icon="globe-outline" title="Public Profile" description="Your Instagram account should be public." />
          <EligibilityItem icon="shield-checkmark-outline" title="Authenticity" description="Your Instagram account should not be a 'Fan Page' or 'Meme Page'." />
        </BottomSheetScrollView>

        {/* PINNED FOOTER */}
        <View style={[styles.footer, {paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 8) + 6 : Math.max(insets.bottom, 40) + 10}, isDark && {backgroundColor: colors.background, borderTopColor: colors.border}]}>
          <View style={styles.checkboxWrapper}>
            <TouchableOpacity 
              activeOpacity={0.7}
              style={[styles.checkbox, isChecked && styles.checkedCheckbox, isDark && {borderColor: colors.border}]} 
              onPress={() => setIsChecked(!isChecked)}>
              {isChecked && <Tik />}
            </TouchableOpacity>
            <Animated.Text onPress={() => setIsChecked(!isChecked)} style={[styles.acceptAllText, animatedTextStyle, isDark && {color: colors.text}]}>
              Accept All.
            </Animated.Text>
          </View>

          <Pressable 
            onPress={handleButtonPress}
            onPressIn={() => (buttonScale.value = withTiming(0.95))}
            onPressOut={() => (buttonScale.value = withTiming(1))}
            style={[styles.doneButton, isDark && {backgroundColor: colors.accent}]}>
            <Animated.View style={[styles.buttonContent, animatedButtonStyle]}>
              <Text style={[styles.doneText, isDark && {color: '#1E1E1E'}]}>I Agree</Text>
              <Ionicons name="arrow-forward" size={16} color={isDark ? '#1E1E1E' : '#FFFFFF'} style={{marginLeft: 6}} />
            </Animated.View>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {backgroundColor: '#fffef9'},
  indicator: {backgroundColor: '#1e1e1e', width: 40},
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  scrollContent: {
    paddingHorizontal: 24, 
    paddingTop: 16, 
    paddingBottom: 20,
    flexGrow: 1, // Ensures scroll view stretches on Android
  },
  headerText: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(2.6),
    color: '#1e1e1e',
  },
  closeIcon: {
    padding: 4,
  },
  subHeaderText: {
    fontFamily: 'Rubik-Medium',
    color: '#555',
    fontSize: responsiveFontSize(1.7),
    lineHeight: responsiveFontSize(2.4),
    marginBottom: 10,
  },
  termItemRow: { flexDirection: 'row', marginTop: 22, alignItems: 'flex-start' },
  iconContainer: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  termTitle: { color: '#1e1e1e', fontFamily: 'Rubik-Bold', fontSize: responsiveFontSize(1.9), marginBottom: 4 },
  termDescription: { color: '#666', fontFamily: 'Rubik-Medium', fontSize: responsiveFontSize(1.6), lineHeight: responsiveFontSize(2.2) },
  
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

export default memo(VerificationInformation);