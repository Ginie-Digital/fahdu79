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

const WINDOW_HEIGHT = Dimensions.get('window').height;
const WINDOW_WIDTH = Dimensions.get('window').width;

const GetVerifiedInstagram = ({transferObject, setShowVerifiedModal}) => {
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
        {
          transform: [{translateY: slideAnim}],
          paddingBottom: isKeyboardVisible
            ? (Platform.OS === 'ios' ? keyboardHeight + 55 : keyboardHeight + 40)
            : (Platform.OS === 'ios' ? Math.max(insets.bottom, 20) + 20 : Math.max(insets.bottom, 20) + 16)
        }
      ]}>
        <View style={styles.headerIndicator} />
        
        {showConfirmation === 'stepone' && (
          <View style={styles.content}>
            <Text style={styles.titleText}>Enter Instagram ID</Text>
            <Text style={styles.subTitleText}>Please provide your Instagram username for verification.</Text>

            <View style={styles.inputSection}>
              <View style={styles.textInputContainer}>
                <TextInput
                  value={instagram}
                  onChangeText={setInstagram}
                  maxLength={30}
                  selectionColor={'#FFA86B'}
                  cursorColor={'#FFA86B'}
                  placeholderTextColor="#B2B2B2"
                  placeholder="e.g. fahduIndia"
                  spellCheck={false}
                  autoCorrect={false}
                  autoCapitalize={'none'}
                  style={styles.textInputs}
                />
              </View>
            </View>

            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.mainButton, loading && styles.disabledButton]} 
              onPress={() => !loading && handleVerify()}
              disabled={loading}
            >
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Submit</Text>}
            </TouchableOpacity>
          </View>
        )}

        {showConfirmation === 'steptwo' && (
          <View style={styles.content}>
            <Text style={styles.titleText}>Confirm Username</Text>
            <Text style={styles.subTitleText}>
              Is your Instagram Username{"\n"}
              <Text style={styles.highLightText}>@{instagram}</Text> correct?
            </Text>

            <View style={styles.confirmButtonRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.mainButton, {flex: 1, marginRight: 8}]}
                onPress={() => setShowConfirmation('stepthree')}
              >
                <Text style={styles.buttonText}>Yes, Correct</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.secondaryButton, {flex: 1, marginLeft: 8}]}
                onPress={() => setShowConfirmation('stepone')}
              >
                <Text style={styles.secondaryButtonText}>No, Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showConfirmation === 'stepthree' && (
          <View style={styles.content}>
            <Text style={styles.titleText}>Verification Message</Text>
            <Text style={styles.subTitleText}>Copy this message and send it to us via DM on handle @fahduofficial</Text>
            
            <View style={styles.copyBox}>
              <View style={{flex: 1}}>
                <Text style={styles.copyLabel}>Message payload:</Text>
                <Text style={styles.copyContent}>
                  I applied for creator verification on FAHDU - 
                  <Text style={{fontFamily: 'Rubik-Bold'}}> {stepOneVerifyObj?.dmMessage?.split('-')[1]}</Text>
                </Text>
              </View>
              <TouchableOpacity onPress={() => copyToClipboard(stepOneVerifyObj?.dmMessage?.split('-')[1])} style={styles.copyIconBtn}>
                <Feather name="copy" size={20} color="#FF7043" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.mainButton, {marginTop: 24}, loading && styles.disabledButton]} 
              onPress={() => !loading && handleFinalSubmission(stepOneVerifyObj?.dmMessage?.split('-')[1])}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <View style={styles.row}>
                  <Text style={styles.buttonText}>Send to Instagram </Text>
                  <DIcon provider={'Entypo'} name={'instagram'} size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
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
    fontSize: responsiveFontSize(2.4),
    color: '#1e1e1e',
    textAlign: 'center',
    marginBottom: 8,
  },
  subTitleText: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.7),
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
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
    backgroundColor: '#F9F9F9',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    justifyContent: 'center',
  },
  textInputs: {
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
  },
  mainButton: {
    backgroundColor: '#1e1e1e',
    height: 54,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: 'Rubik-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1.5,
    borderColor: '#eee',
    height: 54,
    borderRadius: 100,
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
  },
  copyBox: {
    backgroundColor: '#FFF4ED',
    borderWidth: 1,
    borderColor: '#FFDBC2',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#1e1e1e',
    lineHeight: 20,
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
  },
});

export default GetVerifiedInstagram;
