import React, {useState, useEffect, useRef} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Linking, Clipboard, Platform, Pressable, ActivityIndicator, Animated, Dimensions, TextInput} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import AnimatedButton from '../../Components/AnimatedButton';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {BlurView} from 'expo-blur';
import {Image} from 'expo-image';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import InputOverlay from '../../Components/InputOverlay';
import useKeyboardHook from '../../CustomHooks/useKeyboardHook';
import {hTwins, nTwins} from '../../../DesiginData/Utility';
import {useDispatch, useSelector} from 'react-redux';
import {toggleAppliedVerify, toggleInstagramVerification, toggleNicheSelectorModal, toggleDateTimePicker} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {useCoverUpdateProfileMutation, useFinalVerificationSubmissionMutation, useLazyInstaVerifyQuery} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {chatRoomSuccess, LoginPageErrors} from '../../Components/ErrorSnacks';
import {autoLogout} from '../../../AutoLogout';
import DIcon from '../../../DesiginData/DIcons';
import {useAppTheme} from '../../Hook/useAppTheme';

const WINDOW_HEIGHT = Dimensions.get('window').height;
const WINDOW_WIDTH = Dimensions.get('window').width;

const GetVerifiedInstagram = ({transferObject, setShowVerifiedModal}) => {
  const {colors, isDark} = useAppTheme();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const {isKeyboardVisible, keyboardHeight} = useKeyboardHook();
  const [showConfirmation, setShowConfirmation] = useState('stepone');
  const [loading, setLoading] = useState(false);
  const visible = useSelector(state => state.hideShow.visibility.instagramVerification);
  const [instagram, setInstagram] = useState('');
  const [stepOneVerifyObj, setStepOneVerifyObj] = useState({});
  const regex = /^[\w](?!.*?\.{2})[\w.]{1,28}[\w]$/;
  const [finalVerificationSubmission] = useFinalVerificationSubmissionMutation();
  const [instaVerify] = useLazyInstaVerifyQuery();
  const token = useSelector(state => state.auth.user.token);

  // Animation Refs
  const slideAnim = useRef(new Animated.Value(WINDOW_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(WINDOW_HEIGHT);
      setShowConfirmation('stepone');
      setLoading(false);
    }
  }, [visible]);

  const handleClose = () => {
    dispatch(toggleInstagramVerification({show: false}));
  };

  function getReadableDateTime() {
    return new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  function copyToClipboard(code) {
    const message = `I have applied for verification on Fahdu on ${getReadableDateTime()}.${'\n'}My unique code is ${code}.`;
    Clipboard.setString(message);
  }

  const handleVerify = async () => {
    if (instagram?.trim() === '') {
      LoginPageErrors('Please give us instagram Username');
      return;
    }

    if (!regex.test(instagram?.trim()) && instagram?.trim().length > 0) {
      LoginPageErrors('Please enter a valid Instagram Username');
      return;
    }

    setLoading(true);
    const {data, error} = await instaVerify({token, handle: instagram});
    setLoading(false);

    console.log('📡 instaVerify API Response:', JSON.stringify(data, null, 2));

    if (data?.statusCode === 200) {
      setStepOneVerifyObj(data?.data);
      setShowConfirmation('steptwo');
    }

    if (error) {
      if (error?.status === 'FETCH_ERROR') {
        LoginPageErrors('Please check your network');
        return;
      }
      LoginPageErrors(error?.data?.message);
    }

    if (error?.status === 2044) {
      autoLogout();
    }
  };

  const handleFinalSubmission = async code => {
    copyToClipboard(code);
    setLoading(true);
    console.log('📤 Final Submission TransferObject:', JSON.stringify(transferObject, null, 2));
    const submissionPayload = {
      fullName: transferObject.fullName,
      DOB: transferObject.dob,
      niche: transferObject.selectedItems?.map(n => n === 'Dating Expert' ? 'DatingExpert' : n),
      socialHandles: {
        instagram: {
          handle: instagram,
        },
      },
      displayName: transferObject.fahduUserName,
    };
    console.log('📤 Final Submission Payload:', JSON.stringify(submissionPayload, null, 2));
    
    const {data: finalData, error: finalError} = await finalVerificationSubmission({
      token,
      data: submissionPayload,
    });
    setLoading(false);

    console.log('📡 finalVerificationSubmission API Response:', JSON.stringify(finalData, null, 2));

    console.log('📦 StepOneVerifyObj data:', JSON.stringify(stepOneVerifyObj, null, 2));

    const openInstagramDM = async () => {
      const username = 'fahduofficial';
      const directShareLink = `instagram://direct_share?username=${username}`;
      const igMeLink = `https://ig.me/m/${username}`;
      const profileLink = `instagram://user?username=${username}`;

      console.log('🚀 Attempting to open hardcoded DM link for:', username);

      try {
        console.log('🚀 Trying direct_share link:', directShareLink);
        const supported = await Linking.canOpenURL(directShareLink);
        if (supported) {
          await Linking.openURL(directShareLink);
        } else {
          console.log('⚠️ direct_share not supported, trying ig.me:', igMeLink);
          await Linking.openURL(igMeLink).catch(() => {
            console.log('⚠️ ig.me failed, falling back to profile:', profileLink);
            Linking.openURL(profileLink);
          });
        }
      } catch (err) {
        console.log('❌ All deep links failed, opening ig.me in browser:', err);
        Linking.openURL(igMeLink);
      }
    };

    if (finalError?.status === 'FETCH_ERROR') {
      LoginPageErrors('Please check your network');
      return;
    }

    if (finalData?.statusCode === 200) {
      chatRoomSuccess('Thanks for your interest in fahdu creator profile!');
      dispatch(toggleInstagramVerification({show: false}));
      dispatch(toggleNicheSelectorModal({show: false}));
      dispatch(toggleDateTimePicker({show: -1}));
      
      setTimeout(() => {
        setShowVerifiedModal(true);
        openInstagramDM();
      }, 500);
    }

    if (finalError) {
      LoginPageErrors(finalError?.data?.message);
    }

    if (finalError?.status === 2044) {
      autoLogout();
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <BlurView intensity={15} experimentalBlurMethod style={styles.blurBackground} />
      <Pressable style={styles.touchOutside} onPress={handleClose} />
      
      <Animated.View style={[
        styles.dialog, 
        isDark && {backgroundColor: '#121212', borderColor: colors.border},
        {
          transform: [{translateY: slideAnim}],
          paddingBottom: isKeyboardVisible
            ? (Platform.OS === 'ios' ? keyboardHeight + 55 : keyboardHeight + 40)
            : (Platform.OS === 'ios' ? Math.max(insets.bottom, 20) + 20 : Math.max(insets.bottom, 20) + 16)
        }
      ]}>
        <View style={[styles.headerIndicator, isDark && {backgroundColor: colors.border}]} />
        
        {showConfirmation === 'stepone' && (
          <View style={styles.content}>
            <Text style={[styles.titleText, {color: isDark ? '#FFFFFF' : '#000000'}]}>Instagram Id</Text>
            <Text style={[styles.subTitleText, {color: isDark ? '#EBEBF5' : '#1E1E1E'}]}>Please provide your instagram username for verification</Text>

            <View style={styles.inputSection}>
              <View style={[
                styles.textInputContainer, 
                isDark 
                  ? {backgroundColor: '#191919', borderColor: '#292929', borderWidth: 1.5, height: 54} 
                  : {backgroundColor: '#FFFFFF', borderColor: '#1E1E1E', borderWidth: 1.5, height: 54}
              ]}>
                <TextInput
                  value={instagram}
                  onChangeText={setInstagram}
                  maxLength={30}
                  selectionColor={isDark ? colors.accent : '#FFA86B'}
                  cursorColor={isDark ? colors.accent : '#FFA86B'}
                  placeholderTextColor={isDark ? '#EBEBF5' : '#B2B2B2'}
                  placeholder="e.g. fahduindia"
                  spellCheck={false}
                  autoCorrect={false}
                  autoCapitalize={'none'}
                  style={[styles.textInputs, {color: isDark ? '#EBEBF5' : '#000000'}]}
                />
              </View>
            </View>

            <View style={{width: '100%'}}>
              <AnimatedButton
                title="Submit"
                isDark={isDark}
                onPress={handleVerify}
                loading={loading}
                buttonMargin={0}
              />
            </View>
          </View>
        )}

        {showConfirmation === 'steptwo' && (
          <View style={styles.content}>
            <Text style={[styles.titleText, {color: isDark ? '#FFFFFF' : '#000000'}]}>Confirm</Text>
            <Text style={[styles.subTitleText, {color: isDark ? '#EBEBF5' : '#1E1E1E'}]}>
              Is your Instagram Username <Text style={{fontFamily: 'Rubik-Bold', color: isDark ? '#FFFFFF' : '#1E1E1E'}}>@{instagram}</Text> correct?
            </Text>

            <View style={styles.confirmButtonRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.confirmYesButton,
                  isDark
                    ? {backgroundColor: '#FFA86B', borderColor: '#FF7819', borderWidth: 1.5}
                    : {backgroundColor: '#FFA86B', borderColor: '#1E1E1E', borderWidth: 1.5}
                ]}
                onPress={() => setShowConfirmation('stepthree')}
              >
                <Text style={[styles.confirmButtonText, {color: '#1E1E1E'}]}>Yes, Correct</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.confirmNoButton,
                  isDark
                    ? {backgroundColor: colors.pressed, borderColor: colors.border, borderWidth: 1.5}
                    : {backgroundColor: '#FFFFFF', borderColor: '#1E1E1E', borderWidth: 1.5}
                ]}
                onPress={() => setShowConfirmation('stepone')}
              >
                <Text style={[styles.confirmButtonText, {color: isDark ? colors.text : '#1E1E1E'}]}>No, Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showConfirmation === 'stepthree' && (
          <View style={styles.content}>
            <Text style={[styles.titleText, {color: isDark ? '#FFFFFF' : '#000000'}]}>Verification</Text>
            <Text style={[styles.subTitleText, {color: isDark ? '#EBEBF5' : '#1E1E1E'}]}>Tap the button below to copy this message and open Instagram DM for <Text style={{fontFamily: 'Rubik-Bold', color: isDark ? '#FFFFFF' : '#1E1E1E'}}>@fahduofficial</Text></Text>
            
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => copyToClipboard(stepOneVerifyObj?.dmMessage?.split('-')[1])}
              style={[
                styles.copyBox, 
                isDark 
                  ? {backgroundColor: '#1C1C1C', borderColor: '#212121'} 
                  : {backgroundColor: '#FFFFFF', borderColor: '#1E1E1E'}
              ]}
            >
              <View style={{flex: 1, paddingRight: 8}}>
                <Text style={[styles.copyContent, {color: isDark ? '#FFFFFF' : '#1E1E1E'}]}>
                  I applied for creator verification on FAHDU - 
                  <Text style={{fontFamily: 'Rubik-Bold'}}> {stepOneVerifyObj?.dmMessage?.split('-')[1]}</Text>
                </Text>
              </View>
              <Feather 
                name="copy" 
                size={18} 
                color={isDark ? '#FFFFFF' : '#1E1E1E'} 
              />
            </TouchableOpacity>

            <AnimatedButton
              loading={loading}
              isDark={isDark}
              onPress={() => !loading && handleFinalSubmission(stepOneVerifyObj?.dmMessage?.split('-')[1])}
              buttonMargin={10}
              style={{
                backgroundColor: '#FFA86B',
                borderColor: isDark ? '#FF7819' : '#1E1E1E',
                borderWidth: 1.5,
              }}
              overlayStyle={{
                backgroundColor: isDark ? 'transparent' : '#1E1E1E',
                borderColor: isDark ? '#FF7819' : '#1E1E1E',
                borderWidth: isDark ? 1.5 : 0,
              }}
            >
              <View style={styles.row}>
                <Text style={[styles.buttonText, {color: '#1E1E1E', fontFamily: 'Rubik-SemiBold', fontSize: 16}]}>Paste on Instagram</Text>
                <DIcon provider={'Entypo'} name={'instagram'} size={20} color={'#1E1E1E'} />
              </View>
            </AnimatedButton>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  touchOutside: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dialog: {
    backgroundColor: '#fff',
    borderTopLeftRadius: responsiveWidth(8),
    borderTopRightRadius: responsiveWidth(8),
    width: WINDOW_WIDTH,
    position: 'absolute',
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -10},
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  headerIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  content: {
    paddingBottom: 10,
  },
  titleText: {
    fontFamily: 'Rubik-Bold',
    fontSize: 28,
    lineHeight: 28,
    color: '#1e1e1e',
    textAlign: 'left',
    marginBottom: 8,
  },
  subTitleText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    lineHeight: 19,
    color: '#666',
    textAlign: 'left',
    marginBottom: 24,
  },
  highLightText: {
    color: '#FF7043',
    fontFamily: 'Rubik-Bold',
  },
  inputSection: {
    marginBottom: 24,
  },
  textInputContainer: {
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    justifyContent: 'center',
  },
  textInputs: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
  },
  mainButton: {
    backgroundColor: '#FFA86B',
    borderWidth: 1.5,
    borderColor: '#1E1E1E',
    borderRadius: 14,
    height: 54,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    // Neo-Brutalism solid shadow
    shadowColor: '#1E1E1E',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 16,
    lineHeight: 21,
    color: '#1E1E1E',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1E1E1E',
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'Rubik-Bold',
    fontSize: 16,
    color: '#1e1e1e',
  },
  confirmButtonRow: {
    flexDirection: 'row',
    width: '100%',
    paddingBottom: 10,
    gap: 8,
  },
  confirmYesButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmNoButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 14,
    lineHeight: 14,
    color: '#1E1E1E',
  },
  copyBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  copyLabel: {
    fontFamily: 'Rubik-Medium',
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  copyContent: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    lineHeight: 19,
  },
  copyIconBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});

export default GetVerifiedInstagram;
