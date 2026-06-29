import {Pressable, StyleSheet, Text, View, TouchableOpacity, Platform, Alert} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {TextInput} from 'react-native-gesture-handler';
import {responsiveWidth, responsiveFontSize, responsiveHeight} from 'react-native-responsive-dimensions';
import {useSignUpMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {LoginPageErrors, chatRoomSuccess} from '../../Components/ErrorSnacks';
import {navigate} from '../../../Navigation/RootNavigation';
import Back from '../../../Assets/svg/back.svg';
import InputOverlay from '../../Components/InputOverlay';
import {useDispatch, useSelector} from 'react-redux';
import AnimatedButton from '../../Components/AnimatedButton';
import {SafeAreaView} from 'react-native-safe-area-context';
import {nTwins, selectionTwin} from '../../../DesiginData/Utility';
import {Image} from 'expo-image';
import EmailVerificationModal from './EmailVerificationModal';
import {toggleEmailVerificationModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {setCredentials} from '../../../Redux/Slices/NormalSlices/TempCredentials';
import ChevronLoader from '../../ChevronLoader';
import CustomCheckbox from '../../Components/CustomCheckbox';

const SignupPassword = ({route}) => {
  console.log(route);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cShowPassword, cSetShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [isPasswordStrong, setIsPasswordStrong] = useState(false);
  const [emailConsent, setEmailConsent] = useState(true);
  const [agreedTOC, setAgreedTOC] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [signUp] = useSignUpMutation();

  const showEmailVerificationModal = useSelector(state => state.hideShow.visibility.emailVerification);

  const dispatch = useDispatch();

  console.log('EMAIL :::::: E<AIOL', showEmailVerificationModal);

  const [loading, setLoading] = useState(false);

  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

  const {link} = useSelector(state => state.deeplink.data.refferal);

  const handlePassword = new_pass => {
    setPassword(new_pass);

    const lowerCase = /[a-z]/g;
    const upperCase = /[A-Z]/g;
    const numbers = /[0-9]/g;
    const spaces = /\s/g;
    const specialCharacter = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\/\|=]/;

    const MIN_PASSWORD_LENGTH = 6;
    const MAX_PASSWORD_LENGTH = 64;

    if (!new_pass.match(lowerCase)) {
      setErrorMessage('Password must contain lowercase letters.');
      setIsPasswordStrong(false);
    } else if (!new_pass.match(upperCase)) {
      setErrorMessage('Password must contain uppercase letters.');
      setIsPasswordStrong(false);
    } else if (!new_pass.match(numbers)) {
      setErrorMessage('Password must contain numbers.');
      setIsPasswordStrong(false);
    } else if (new_pass.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
      setIsPasswordStrong(false);
    } else if (new_pass.length > MAX_PASSWORD_LENGTH) {
      setErrorMessage(`Password cannot exceed ${MAX_PASSWORD_LENGTH} characters.`);
      setIsPasswordStrong(false);
    } else if (new_pass.match(spaces)) {
      setErrorMessage('Do not use spaces in the password.');
      setIsPasswordStrong(false);
    } else if (!new_pass.match(specialCharacter)) {
      setErrorMessage('Password must have at least one special character.');
      setIsPasswordStrong(false);
    } else {
      setIsPasswordStrong(true);
      setErrorMessage('Password is strong!');
    }
  };

  const handleSignup = async () => {
    if (!agreedTOC) {
      LoginPageErrors('Please agree to the Terms & Conditions and Privacy Policy');
      return;
    }
    if (isPasswordStrong) {
      if (password.trim() && confirmPassword.trim()) {
        if (password === confirmPassword) {
          setLoading(true);

          // Use referralCode from route params if available, otherwise fallback to deeplink
          const referralName = route?.params?.referralCode || link;

          const {data, error} = await signUp({
            data: {
              email: route?.params?.email?.trim(),
              password,
              agreedTOC: true,
              onlyBrandsAccess: false,
              referredDisplayName: referralName,
              emailConsent,
            },
          });

          console.log(data, error);

          if (error) {
            LoginPageErrors(error?.data?.message || 'Signup failed');
            setLoading(false);
            return;
          }

          if (data) {
            setLoading(false);
            dispatch(toggleEmailVerificationModal({show: true}));
            dispatch(setCredentials({data: {email: route?.params?.email?.trim(), password}}));
          }
        } else {
          setLoading(false);
          LoginPageErrors('Passwords do not match');
        }
      } else {
        setLoading(false);
        LoginPageErrors('Please fill in all fields');
      }
    } else {
      setLoading(false);
      LoginPageErrors('Please use a strong password');
    }
  };

  return (
    <SafeAreaView testID="signup-password-screen" style={{flex: 1, backgroundColor: '#fff'}}>
      <ChevronLoader show={loading} />

      <View style={styles.container}>
        <TouchableOpacity testID="signup-password-back-button" accessibilityLabel="signup-password-back-button" style={styles.backButton} onPress={() => navigate('SignupEmail')}>
          <Back />
        </TouchableOpacity>
        <Text style={styles.heading}>Sign Up</Text>
        <Text style={styles.subHead}>Earn from your content on your terms.</Text>

        <Text style={styles.fieldName}>Password</Text>
        <View style={{position: 'relative', marginTop: responsiveWidth(2.67), overflow: 'visible'}} collapsable={false}>
          {focusedInput === 'password' && (
            <InputOverlay isVisible />
          )}
          <View style={[styles.textInputContainer, {marginTop: 0}]}>
            <TextInput
              testID="signup-password-input"
              accessibilityLabel="signup-password-input"
              ref={passwordInputRef}
              style={styles.textInputs}
              secureTextEntry={!showPassword}
              onChangeText={handlePassword}
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
              placeholderTextColor="#B2B2B2"
              placeholder="Enter Password "
              selectionColor={selectionTwin()}
              cursorColor={'#1e1e1e'}
              maxLength={64}
              selectionHandleColor={'#ffa86b'}
            />
            <Pressable testID="signup-password-toggle-visibility" accessibilityLabel="signup-password-toggle-visibility" style={styles.iconContainer} onPress={() => setShowPassword(prev => !prev)}>
              {showPassword ? <Image source={require('../../../Assets/Images/eyeOpen.png')} contentFit="contain" style={styles.eyeStyle} /> : <Image source={require('../../../Assets/Images/eyeClose.png')} contentFit="contain" style={styles.eyeStyle} />}
            </Pressable>
          </View>
        </View>

        {password.length > 0 && (
          <>
            {isPasswordStrong ? null : (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}
          </>
        )}

        <Text style={styles.fieldName}>Confirm Password</Text>
        <View style={{position: 'relative', marginTop: responsiveWidth(2.67), overflow: 'visible'}} collapsable={false}>
          {focusedInput === 'confirmPassword' && (
            <InputOverlay isVisible />
          )}
          <View style={[styles.textInputContainer, {marginTop: 0}]}>
            <TextInput
              testID="signup-confirm-password-input"
              accessibilityLabel="signup-confirm-password-input"
              placeholderTextColor="#B2B2B2"
              placeholder="Enter Confirm Password "
              ref={confirmPasswordInputRef}
              style={styles.textInputs}
              secureTextEntry={!cShowPassword}
              onChangeText={t => setConfirmPassword(t)}
              onFocus={() => setFocusedInput('confirmPassword')}
              onBlur={() => setFocusedInput(null)}
              selectionColor={selectionTwin()}
              cursorColor={'#1e1e1e'}
              selectionHandleColor={'#ffa86b'}
            />
            <Pressable testID="signup-confirm-password-toggle-visibility" accessibilityLabel="signup-confirm-password-toggle-visibility" style={styles.iconContainer} onPress={() => cSetShowPassword(prev => !prev)}>
              {cShowPassword ? <Image source={require('../../../Assets/Images/eyeOpen.png')} contentFit="contain" style={styles.eyeStyle} /> : <Image source={require('../../../Assets/Images/eyeClose.png')} contentFit="contain" style={styles.eyeStyle} />}
            </Pressable>
          </View>
        </View>

        <Pressable 
          style={styles.checkboxContainer} 
          onPress={() => setEmailConsent(!emailConsent)}
        >
          <View pointerEvents="none">
            <CustomCheckbox
              checked={emailConsent}
              onToggle={() => {}}
            />
          </View>
          <Text style={styles.checkboxLabel}>
            Keep me updated with news, feature releases, and announcements via email
          </Text>
        </Pressable>

        <Pressable 
          style={styles.checkboxContainer} 
          onPress={() => setAgreedTOC(!agreedTOC)}
        >
          <View pointerEvents="none">
            <CustomCheckbox
              checked={agreedTOC}
              onToggle={() => {}}
            />
          </View>
          <Text style={styles.checkboxLabel}>
            I agree to the{' '}
            <Text style={{color: '#FF7F50', fontFamily: 'Rubik-Medium'}}>Terms & Conditions</Text>
            {' '}and{' '}
            <Text style={{color: '#FF7F50', fontFamily: 'Rubik-Medium'}}>Privacy Policy</Text>
          </Text>
        </Pressable>

        <AnimatedButton testID="signup-password-submit-button" title={'Sign Up'} onPress={handleSignup} loading={loading} />

        <TouchableOpacity testID="signup-password-login-link" accessibilityLabel="signup-password-login-link" style={styles.alreadyAccountContainer} onPress={() => navigate('LoginEmail')}>
          <View style={styles.alreadyAccountRow}>
            <Text style={styles.alreadyAccountText}>Do you have an account? </Text>
            <Text style={styles.forgotTextTitle}>Login</Text>
          </View>
        </TouchableOpacity>
      </View>
      <EmailVerificationModal visible={showEmailVerificationModal} />
    </SafeAreaView>
  );
};

export default SignupPassword;

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
  error: {
    fontFamily: 'Rubik-Regular',
    color: 'red',
    textAlign: 'right',
    marginTop: responsiveWidth(4),
    marginRight: responsiveWidth(10),
  },
  iconContainer: {
    marginRight: responsiveWidth(4),
    height: 19,
    width: 19,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: responsiveWidth(2),
    marginTop: responsiveWidth(2.67),
  },
  errorIcon: {
    marginRight: responsiveWidth(2),
  },
  errorText: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.48),
    color: 'red',
    flexShrink: 1,
  },
  successText: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.8),
    color: 'green',
    flexShrink: 1,
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: responsiveWidth(4),
    marginBottom: responsiveWidth(2),
  },
  checkboxLabel: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.5),
    marginLeft: responsiveWidth(2.5),
    lineHeight: responsiveFontSize(2),
    flex: 1,
    color: '#1e1e1e',
  },
});
