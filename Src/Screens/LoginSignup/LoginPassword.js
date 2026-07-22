import { Pressable, StyleSheet, Text, View, Keyboard, TouchableOpacity, Platform } from 'react-native';
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { TextInput } from 'react-native-gesture-handler';
import { responsiveWidth, responsiveFontSize, responsiveHeight } from 'react-native-responsive-dimensions';
import { LoginPageErrors, VerifyEmail } from '../../Components/ErrorSnacks';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { currentUserInformation } from '../../../Redux/Slices/NormalSlices/AuthSlice';
import { checkApplicationPermission } from '../../../Permissions';
import { enableNotificationModal, toggleEmailVerificationModal, toggleForgetPassword, toggleVerficationScreen, toggleShowOnboarding } from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import { selectionTwin, validEmail } from '../../../DesiginData/Utility';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nTwins } from '../../../DesiginData/Utility';
import Back from '../../../Assets/svg/back.svg';
import DIcon from '../../../DesiginData/DIcons';
import { navigate } from '../../../Navigation/RootNavigation';
import { setKeyboardHeight } from '../../../Redux/Slices/NormalSlices/AppData/KeyboardPropertiesSlice';
import ForgetPassword from '../../Components/LoginComponent/ForgetPassword';
import Eye from '../../../Assets/svg/eye.svg';
import CutEye from '../../../Assets/svg/cutEye.svg';
import { useNavigation } from '@react-navigation/native';
import useKeyboardHook from '../../CustomHooks/useKeyboardHook';
import InputOverlay from '../../Components/InputOverlay';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AnimatedButton from '../../Components/AnimatedButton';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmailVerificationModal from './EmailVerificationModal';
import { setCredentials } from '../../../Redux/Slices/NormalSlices/TempCredentials';
import Authenticator from '../../Components/LoginComponent/Authenticator';
import ChevronLoader from '../../ChevronLoader';
import { useAppTheme } from '../../Hook/useAppTheme';


const LoginPassword = ({ route }) => {
  const [password, setPassword] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const passwordRef = useRef(null);
  const [authToken, setAuthToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('');
  const dispatcher = useDispatch();
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [isLoginDisabled, setIsLoginDisabled] = useState(false);
  const [loginCheckMessage, setLoginCheckMessage] = useState('');


  const showEmailVerificationModal = useSelector(state => state.hideShow.visibility.emailVerification);

  const getApnToken = useSelector(state => state.auth.user);

  console.log({ getApnToken });

  const { isKeyboardVisible } = useKeyboardHook();

  const { colors, isDark } = useAppTheme();

  // Reset isFocused when keyboard hides
  useEffect(() => {
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const sub = Keyboard.addListener(hideEvent, () => setIsFocused(false));
    return () => sub.remove();
  }, []);

  // Check login availability on page open
  useEffect(() => {
    const checkLoginAvailability = async () => {
      try {
        const response = await axios.post('https://api.fahdu.com/api/user/login/check', {
          email: route?.params?.email?.trim(),
        });

        // If data is false, disable login
        if (response.data?.data === false) {
          setIsLoginDisabled(true);
          setLoginCheckMessage(response.data?.message || '');
          if (response.data?.message) {
            LoginPageErrors(response.data.message);
          }
        }
      } catch (error) {
        // Handle error responses
        if (error.response?.data?.message) {
          setIsLoginDisabled(true);
          setLoginCheckMessage(error.response.data.message);
          LoginPageErrors(error.response.data.message);
        }
        // Log other errors but don't disable login
        else {
          console.log('Login check error:', error);
        }
      }
    };

    // Only check if email is available
    if (route?.params?.email) {
      checkLoginAvailability();
    }
  }, [route?.params?.email]);

  const afterLoginProcess = useCallback(async data => {
    await AsyncStorage.setItem('data', data?.data?.token);
    // Native CallStyle Decline/Answer need JWT when JS is killed/paused.
    try {
      const { cacheAndroidCallAuthToken } = require('../../Services/IncomingCallStyle');
      cacheAndroidCallAuthToken(data?.data?.token);
    } catch (_) {}

    console.log('FULLLLLNAME', data?.data?.user?.fullName);

    dispatcher(
      currentUserInformation({
        token: data?.data?.token,
        currentUserId: data?.data?.user?._id,
        currentUserFullName: data?.data?.user?.fullName,
        currentUserDisplayName: data?.data?.user?.displayName,
        currentUserProfilePicture: data?.data?.user?.profile_image?.url,
        role: data?.data?.user?.role,
        email: data?.data?.user?.email,
        currentUserCoverPicture: data?.data?.user?.cover_photo?.url,
        passwordCreated: data?.data?.user?.passwordCreated,
        licenseAgreed: data?.data?.user?.licenseAgreed,
        onlyBrandsAccess: data?.data?.user?.onlyBrandsAccess ?? false,
        ylyticInstagramUserId: data?.data?.user?.ylyticInstagramUserId ?? null,
        is_phone_verified: data?.data?.user?.is_phone_verified,
        suspended: data?.data?.user?.suspended,
      }),
    );

    checkApplicationPermission().then(e => {
      console.log('NOTIFICATION PERMISSION', e);

      if (e === 'granted') {
        // navigation.navigate("chatRoomTab");
      } else if (e === 'denied') {
        checkApplicationPermission().then(e => {
          if (e === 'denied') {
            console.log('enabling');
            dispatcher(enableNotificationModal());
          }
        });
      } else if (e === 'never_ask_again') {
        dispatcher(enableNotificationModal());
      }
    });
  }, []);

  async function logInHandler() {
    // Check if login is disabled
    if (isLoginDisabled) {
      LoginPageErrors('Login is currently unavailable. Please try again later.');
      return;
    }

    Keyboard.dismiss();

    if (route?.params?.email?.trim()?.length === 0) {
      LoginPageErrors('Please enter email address');
      return;
    }

    if (!validEmail(route?.params?.email?.trim())) {
      LoginPageErrors('Provide valid email address');
      return;
    }

    if (route?.params?.email.length > 0) {
      if (password.length > 0) {
        setLoading(true);

        try {
          const { data, status, request } = await axios.post(
            'https://api.fahdu.com/api/user/signin',
            { 
              email: route?.params?.email?.trim(), 
              password: password.trim(), 
              apnToken: getApnToken?.apnToken || (await AsyncStorage.getItem('fahdu_voip_token')) || undefined, 
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            },
          );

          console.log(data?.statusCode, '::::::EMAIL LOGIN');

          if (data?.statusCode === 200) {
            setLoading(false);
            afterLoginProcess(data);
            setAuthToken(data?.data?.authToken);
            dispatcher(toggleShowOnboarding({ show: data?.data?.user?.showOnboardingCard ?? false }));
          } else if (data?.statusCode === 202) {
            setLoading(false);
            setType(data?.data?.email);
            setAuthToken(data?.data?.authToken);
            dispatcher(toggleVerficationScreen({ show: 1 }));
          } else {
            setLoading(false);
            LoginPageErrors('Something Went Wrong');
          }
        } catch (e) {
          setLoading(false);
          
          // Detailed error logging
          console.log('=== LOGIN ERROR DEBUG ===');
          console.log('Error name:', e?.name);
          console.log('Error message:', e?.message);
          console.log('Error code:', e?.code);
          console.log('Error response status:', e?.response?.status);
          console.log('Error response data:', JSON.stringify(e?.response?.data));
          console.log('Error request:', e?.request ? 'Request was made' : 'No request');
          console.log('Error config:', JSON.stringify(e?.config));
          console.log('=========================');

          // Handle specific error cases
          if (e?.response?.data?.message) {
            const errorMessage = e.response.data.message;
            
            if (errorMessage.search('Invalid') >= 0) {
              LoginPageErrors(errorMessage);
              return;
            }

            if (errorMessage.search('verify') >= 0) {
              VerifyEmail('Email not verified, link sent to your mail please verify', route?.params?.email?.trim(), e?.response?.data?.data?.token);
              dispatcher(toggleEmailVerificationModal({ show: true }));
              dispatcher(setCredentials({ data: { email: route?.params?.email?.trim(), password: password.trim() } }));
              return;
            }
            
            // Show server error message
            LoginPageErrors(errorMessage);
            return;
          }

          // Network error or timeout
          if (e.message === 'Network Error') {
            LoginPageErrors('Please check your network');
          } else if (e.code === 'ECONNABORTED') {
            LoginPageErrors('Request timed out. Please try again.');
          } else {
            LoginPageErrors(e?.message || 'Something went wrong, please try again later');
          }
        }
      } else {
        LoginPageErrors('Please enter password');
      }
    } else LoginPageErrors('Please Enter Valid Details');
  }

  return (
    <SafeAreaView testID="login-password-screen" style={{ flex: 1, backgroundColor: isDark ? colors.background : '#fff' }}>
      {loading && <ChevronLoader />}

      <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#fff' }]}>
        <TouchableOpacity testID="login-password-back-button" accessibilityLabel="login-password-back-button" style={styles.backButton} onPress={() => navigate('LoginEmail')}>
          <Back color={isDark ? colors.text : '#1e1e1e'} />
        </TouchableOpacity>
        <Text style={[styles.heading, { color: isDark ? colors.text : '#1e1e1e' }]}>Login</Text>
        <Text style={[styles.subHead, { color: isDark ? colors.textSecondary : '#282828' }]}>Welcome to Fahdu, Login to Continue...</Text>
        <Text style={[styles.fieldName, { color: isDark ? colors.textLabel : '#1e1e1e' }]}>Password</Text>

        <View style={{position: 'relative', marginTop: responsiveWidth(2.67), overflow: 'visible'}} collapsable={false}>
          <InputOverlay isVisible={isFocused} style={isDark ? { backgroundColor: colors.overlayBg, borderRadius: 14 } : undefined} />
          <View style={[
            styles.textInputContainer,
            {marginTop: 0, backgroundColor: isDark ? colors.inputBg : '#fff', borderColor: isDark ? colors.border : '#1e1e1e'},
          ]}>
            <TextInput
              testID="login-password-input"
              accessibilityLabel="login-password-input"
              selectionColor={isDark ? colors.accent : '#ffa86b'}
              selectionHandleColor={isDark ? colors.accent : '#ffa86b'}
              cursorColor={isDark ? colors.text : '#1e1e1e'}
              maxLength={20}
              placeholderTextColor={isDark ? colors.placeholder : '#B2B2B2'}
              placeholder="Enter Password "
              spellCheck={false}
              autoCorrect={false}
              style={[styles.textInputs, { color: isDark ? colors.text : '#1e1e1e' }]}
              secureTextEntry={!isPasswordVisible}
              onChangeText={setPassword}
              editable={!isLoginDisabled}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            <Pressable testID="login-password-toggle-visibility" accessibilityLabel="login-password-toggle-visibility" style={styles.iconContainer} onPress={() => setPasswordVisible(!isPasswordVisible)}>
              {isPasswordVisible ? <Image source={require('../../../Assets/Images/eyeOpen.png')} contentFit="contain" style={[styles.eyeStyle, isDark && { tintColor: colors.textSecondary }]} /> : <Image source={require('../../../Assets/Images/eyeClose.png')} contentFit="contain" style={[styles.eyeStyle, isDark && { tintColor: colors.textSecondary }]} />}
            </Pressable>
          </View>
        </View>

        <Pressable testID="login-password-forgot-password-link" accessibilityLabel="login-password-forgot-password-link" style={{ alignSelf: 'flex-end', marginTop: responsiveWidth(2.93) }} onPress={() => !isLoginDisabled && navigate('forgetPassword', { email: route.params.email })} disabled={isLoginDisabled}>
          <Text
            style={{
              fontFamily: 'Rubik-Medium',
              fontSize: responsiveFontSize(1.48),
              color: isLoginDisabled ? (isDark ? colors.placeholder : '#B2B2B2') : (isDark ? '#FF7F50' : '#1e1e1e'),
            }}>
            Forgot Password?
          </Text>
        </Pressable>


        <AnimatedButton testID="login-password-submit-button" title={'Login'} onPress={logInHandler} loading={loading} disabled={isLoginDisabled} isDark={isDark} />


        {isLoginDisabled && loginCheckMessage && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>{loginCheckMessage}</Text>
          </View>
        )}

        <TouchableOpacity testID="login-password-signup-link" accessibilityLabel="login-password-signup-link" style={styles.alreadyAccountContainer} onPress={() => !isLoginDisabled && navigate('SignupEmail')} disabled={isLoginDisabled}>
          <View style={styles.alreadyAccountRow}>
            <Text style={[styles.alreadyAccountText, { color: isDark ? colors.textSecondary : '#282828' }, isLoginDisabled && { color: isDark ? colors.placeholder : '#B2B2B2' }]}>Don't you have an account?</Text>
            <Text style={[styles.forgotTextTitle, isLoginDisabled && { color: isDark ? colors.placeholder : '#B2B2B2' }]}>SignUp</Text>
          </View>
        </TouchableOpacity>
      </View>
      <EmailVerificationModal visible={showEmailVerificationModal} />
      {authToken && <Authenticator authToken={authToken} type={type} afterLoginProcess={afterLoginProcess} />}
    </SafeAreaView>
  );
};

export default LoginPassword;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    margin: responsiveWidth(6.4),
  },
  backButton: {
    height: responsiveWidth(10),
    width: responsiveWidth(10),
  },
  heading: {
    fontFamily: 'Rubik-Bold',
    color: '#1e1e1e',
    fontSize: 24,
  },
  subHead: {
    width: responsiveWidth(90),
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    fontSize: 14,
    marginTop: Platform.OS === 'android' ? 0 : 10,
  },
  subHeadHighlight: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: 14,
  },
  fieldName: {
    marginTop: responsiveWidth(5.5),
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: responsiveFontSize(1.97),
  },
  textInputContainer: {
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: responsiveWidth(3.73),
    paddingLeft: responsiveWidth(5.33),
    width: '100%',
    marginTop: responsiveWidth(2.67),
  },
  textInputs: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    flex: 1,
    height: responsiveHeight(6.65),
    borderRadius: responsiveWidth(3.73),
  },
  loginButtonContainer: {
    marginTop: responsiveWidth(5),
    alignSelf: 'center',
  },
  loginButton: {
    padding: Platform.OS === 'ios' ? responsiveWidth(4) : null,
    backgroundColor: 'rgba(255, 168, 107, 1)',
    borderRadius: responsiveWidth(4),
    color: '#282828',
    textAlign: 'center',
    fontFamily: 'Rubik-Medium',
    fontWeight: '600',
    width: responsiveWidth(85),
    height: responsiveWidth(14),
    textAlignVertical: 'center',
    alignSelf: 'center',
    borderWidth: responsiveWidth(0.5),
    borderTopColor: '#282828',
    borderLeftColor: '#282828',
    fontSize: responsiveFontSize(2.4),
    overflow: 'hidden',
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: responsiveWidth(5),
  },
  forgotPasswordText: {
    textAlign: 'center',
    fontFamily: 'Rubik-Medium',
    color: '#FF7F50',
  },
  iconContainer: {
    marginRight: responsiveWidth(4),
    height: 19,
    width: 19,
  },
  signupText: {
    textAlign: 'center',
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
  },
  signupLink: {
    color: '#FF7F50',
  },
  eyeStyle: {
    flex: 1,
  },
  alreadyAccountContainer: {
    marginTop: responsiveWidth(5),
    width: '100%',
    alignSelf: 'center',
  },
  alreadyAccountRow: {
    flexDirection: 'row',
    marginTop: responsiveWidth(3),
    alignSelf: 'center',
  },
  alreadyAccountText: {
    textAlign: 'center',
    color: '#1e1e1e',
    fontFamily: 'Rubik-Medium',
    fontSize: 14,
  },
  forgotTextTitle: {
    color: '#FF7F50',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
  },
  disabledText: {
    color: '#B2B2B2',
    opacity: 0.5,
  },
  warningContainer: {
    marginTop: responsiveWidth(3),
    padding: responsiveWidth(3),
    backgroundColor: '#FFF3CD',
    borderRadius: responsiveWidth(2),
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  warningText: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.6),
    color: '#856404',
    textAlign: 'center',
  },
});

