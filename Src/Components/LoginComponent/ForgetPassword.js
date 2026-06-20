import React, {useState, useEffect} from 'react';
import {StyleSheet, Text, View, TextInput, TouchableOpacity, Pressable, ActivityIndicator, Platform, Keyboard, useColorScheme} from 'react-native';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import OTPTextView from 'react-native-otp-textinput';
import {useDispatch} from 'react-redux';
import {toggleForgetPassword} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {useForgetPasswordMutation, useVerifyOtpMutation, useResendOtpMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {navigate} from '../../../Navigation/RootNavigation';
import Back from '../../../Assets/svg/back.svg';
import {LoginPageErrors, chatRoomSuccess} from '../../Components/ErrorSnacks';
import {nTwins, selectionTwin, validateEmail, validEmail} from '../../../DesiginData/Utility';
import InputOverlay from '../InputOverlay';
import useKeyboardHook from '../../CustomHooks/useKeyboardHook';
import AnimatedButton from '../AnimatedButton';
import {SafeAreaView} from 'react-native-safe-area-context';
import ChevronLoader from '../../ChevronLoader';

const ForgetPassword = ({route}) => {
  const {email: preEmail} = route?.params || {};
  const [email, setEmail] = useState(preEmail || '');
  const [otp, setOtp] = useState('');
  const [isEmailStep, setIsEmailStep] = useState(true);
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = true; // colorScheme === 'dark';

  const dispatch = useDispatch();
  const [forgetPassword] = useForgetPasswordMutation();
  const [verifyOtp] = useVerifyOtpMutation();
  const [resendOtp] = useResendOtpMutation();

  useEffect(() => {
    if (preEmail) {
      setEmail(preEmail);
    }
  }, [preEmail]);

  const handleVerification = async () => {
    const validationResult = validateEmail(email);

    if (validationResult.isValid) {
      setLoading(true);
      const {data, error} = await forgetPassword({data: {email}});

      console.log(data, '::::::;', email);

      setLoading(false);

      if (error?.data?.status_code === 400) {
        LoginPageErrors(error?.data?.message);
        return;
      }

      if (data?.statusCode === 200) {
        chatRoomSuccess(data?.message);
        setIsEmailStep(false);
      }
    } else {
      LoginPageErrors(validationResult.message);
    }
  };

  const handleOtpVerification = async () => {
    if (!otp) {
      LoginPageErrors('Please provide the OTP');
      return;
    }

    setLoading(true);
    const {data, error} = await verifyOtp({data: {email, emailCode: otp}});

    setLoading(false);

    if (error?.data?.status_code === 400) {
      LoginPageErrors(error?.data?.message);
      return;
    }

    if (data?.statusCode === 200) {
      chatRoomSuccess(data?.message);
      dispatch(toggleForgetPassword());
      navigate('createPassword', {email});
    }
  };

  const handleResendOtp = async () => {
    const {data, error} = await resendOtp({data: {email}});
    if (error?.data?.status_code === 400) {
      LoginPageErrors(error?.data?.message);
      return;
    }
    if (data?.statusCode === 200) {
      chatRoomSuccess('OTP sent successfully');
    }
  };

  const {isKeyboardVisible} = useKeyboardHook();

  return (
    <SafeAreaView testID="forgot-password-screen" style={{flex: 1, backgroundColor: isDark ? '#121212' : '#fff'}}>
      
      { loading && <ChevronLoader/> }

      <View style={[styles.container, {backgroundColor: isDark ? '#121212' : 'white'}]}>
        <TouchableOpacity testID="forgot-password-back-button" accessibilityLabel="forgot-password-back-button" style={styles.backButton} onPress={() => navigate('LoginHome')}>
          <Back color={isDark ? '#FFFFFF' : '#1E1E1E'} />
        </TouchableOpacity>
        {isEmailStep ? (
          <>
            <Text style={[styles.heading, {color: isDark ? '#FFFFFF' : '#1e1e1e'}]}>Forgot Password?</Text>
            <Text style={[styles.subHead, {color: isDark ? '#FFFFFF' : '#1e1e1e'}]}>Don't worry! It occurs. Please enter the email address linked with your account.</Text>
            <Text style={[styles.fieldName, {color: isDark ? '#FFFFFF' : '#1e1e1e'}]}>Email</Text>

            <View style={{position: 'relative', marginTop: responsiveWidth(2.67), overflow: 'visible'}} collapsable={false}>
              <InputOverlay isVisible={isKeyboardVisible} style={isDark && { backgroundColor: '#292929', borderRadius: 14 }} />
              <View style={[styles.textInputContainer, {marginTop: 0}, isDark && { backgroundColor: '#191919', borderColor: '#292929', borderWidth: 1.5, borderRadius: 14 }]}>
                <TextInput testID="forgot-password-email-input" accessibilityLabel="forgot-password-email-input" selectionColor={isDark ? '#FFA86B' : selectionTwin()}
                
                selectionHandleColor={isDark ? '#FFA86B' : '#ffa86b'}
                
                cursorColor={isDark ? '#FFFFFF' : '#1e1e1e'} placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.15)' : '#B2B2B2'} placeholder="Enter Email " autoCapitalize={'none'} style={[styles.textInputs, {color: isDark ? '#FFFFFF' : '#1e1e1e'}]} value={email} onChangeText={setEmail} keyboardType="email-address" />
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.heading, {color: isDark ? '#FFFFFF' : '#1e1e1e'}]}>OTP Verification</Text>
            <Text style={[styles.subHead, {color: isDark ? '#FFFFFF' : '#1e1e1e'}]}>Enter the verification code we just sent on your email address.</Text>
            <OTPTextView
              testID="forgot-password-otp-input"
              accessibilityLabel="forgot-password-otp-input"
              containerStyle={styles.otpContainer}
              handleTextChange={setOtp}
              inputCount={4}
              keyboardType="number-pad"
              offTintColor={Array(4).fill(0).map((_, i) => (otp[i] ? '#FF7F50' : (isDark ? '#292929' : '#1e1e1e')))}
              textInputStyle={[styles.otpInput, isDark && { backgroundColor: '#191919', borderColor: '#292929', color: '#FFFFFF' }]}
              tintColor={Array(4).fill(0).map((_, i) => (otp[i] ? '#FF7F50' : (isDark ? '#292929' : '#1e1e1e')))}
            />
          </>
        )}

        <AnimatedButton testID="forgot-password-submit-button" onPress={isEmailStep ? handleVerification : handleOtpVerification} title={isEmailStep ? 'Send Code' : 'Verify'} loading={loading} isDark={isDark} />

        {!isEmailStep && (
          <TouchableOpacity testID="forgot-password-resend-link" accessibilityLabel="forgot-password-resend-link" style={styles.alreadyAccountContainer} onPress={handleResendOtp}>
            <View style={styles.alreadyAccountRow}>
              <Text style={[styles.alreadyAccountText, {color: isDark ? '#4D4D4D' : '#1e1e1e'}]}> Didn't receive the code? </Text>
              <Text style={styles.forgotTextTitle}>Resend</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

export default ForgetPassword;

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
    // marginTop: responsiveWidth(5),
    fontFamily: 'Rubik-Bold',
    color: '#1e1e1e',
    fontSize: 24,
  },
  subHead: {
    width: responsiveWidth(90),
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    fontSize: 14,
    marginTop: Platform.OS === "android" ? 0 : 10,
    lineHeight: 18,
  },

  subHeadHighlight: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: 14,
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
  otpContainer: {
    width: '100%',
    marginTop: responsiveWidth(6.4),
  },
  otpInput: {
    width: responsiveWidth(17.33),
    height: responsiveWidth(17.33),
    borderRadius: responsiveWidth(3.73),
    borderWidth: responsiveWidth(0.48),
    fontSize: responsiveFontSize(2.5),
    color: '#1e1e1e',
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
    backgroundColor: 'white',
    borderBottomWidth: responsiveWidth(0.48),
  },
  resendText: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    textAlign: 'center',
    marginTop: responsiveWidth(2),
  },
  resendLink: {
    color: '#FF7F50',
  },
  alreadyAccountContainer: {
    marginTop: responsiveWidth(5),
    width : "100%",
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
});
