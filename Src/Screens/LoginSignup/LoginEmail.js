import {Pressable, StyleSheet, Text, View, Keyboard, TouchableOpacity, Platform} from 'react-native';
import React, {useState, useEffect} from 'react';
import {TextInput} from 'react-native-gesture-handler';
import {navigate} from '../../../Navigation/RootNavigation';
import {responsiveWidth, responsiveFontSize, responsiveHeight} from 'react-native-responsive-dimensions';
import {FONT_SIZES, nTwins, selectionTwin, validEmail} from '../../../DesiginData/Utility';
import {LoginPageErrors} from '../../Components/ErrorSnacks';
import Back from '../../../Assets/svg/back.svg';
import useKeyboardHook from '../../CustomHooks/useKeyboardHook';
import InputOverlay from '../../Components/InputOverlay';
import AnimatedButton from '../../Components/AnimatedButton';
import {SafeAreaView} from 'react-native-safe-area-context';
import {validateEmail} from '../../../DesiginData/Utility';
import ChevronLoader from '../../ChevronLoader';
import { useAppTheme } from '../../Hook/useAppTheme';

const LoginEmail = () => {
  const [email, setEmail] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const {isKeyboardVisible, keyboardHeight} = useKeyboardHook();
  const { colors, isDark } = useAppTheme();

  // Reset isFocused when keyboard hides (covers Android back button, tap outside, etc.)
  useEffect(() => {
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const sub = Keyboard.addListener(hideEvent, () => setIsFocused(false));
    return () => sub.remove();
  }, []);

  const handleGoToNext = async () => {
    const validationResult = validateEmail(email);

    if (validationResult.isValid) {
      navigate('LoginPassword', {email});
    } else {
      LoginPageErrors(validationResult.message);
    }
  };

  return (
    <SafeAreaView testID="login-email-screen" style={{flex: 1, backgroundColor: isDark ? colors.background : '#fff'}}>
      <View style={[styles.container, {backgroundColor: isDark ? colors.background : '#fff'}]}>
        <TouchableOpacity testID="login-email-back-button" accessibilityLabel="login-email-back-button" style={styles.backButton} onPress={() => navigate('LoginHome')}>
          <Back color={isDark ? colors.text : '#1e1e1e'} />
        </TouchableOpacity>
        <Text style={[styles.heading, {color: isDark ? colors.text : '#1e1e1e'}]}>Login</Text>
        <Text style={[styles.subHead, {color: isDark ? colors.textSecondary : '#282828'}]}>Welcome to Fahdu, Login to Continue...</Text>
        <Text style={[styles.fieldName, {color: isDark ? colors.textLabel : '#1e1e1e'}]}>Email</Text>
        <View style={{position: 'relative', marginTop: responsiveWidth(2.67), overflow: 'visible'}} collapsable={false}>
          <InputOverlay isVisible={isFocused} style={isDark ? { backgroundColor: colors.overlayBg, borderRadius: 14 } : undefined} />

          <View style={[
            styles.textInputContainer, 
            {marginTop: 0, backgroundColor: isDark ? colors.inputBg : '#fff', borderColor: isDark ? colors.border : '#1e1e1e'},
          ]}>
            <TextInput
              testID="login-email-input"
              accessibilityLabel="login-email-input"
              selectionHandleColor={isDark ? colors.accent : '#ffa86b'}
              selectionColor={isDark ? colors.accent : '#ffa86b'}
              cursorColor={isDark ? colors.text : '#1e1e1e'}
              placeholderTextColor={isDark ? colors.placeholder : '#B2B2B2'}
              placeholder="Enter Email "
              spellCheck={false}
              autoCorrect={false}
              autoCapitalize={'none'}
              style={[styles.textInputs, {color: isDark ? colors.text : '#1e1e1e'}]}
              value={email}
              onChangeText={t => setEmail(t.toLowerCase())}
              maxLength={50}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </View>
        </View>

        <AnimatedButton testID="login-email-next-button" title={'Next'} onPress={handleGoToNext} loading={false} isDark={isDark} />

        <TouchableOpacity testID="login-email-signup-link" accessibilityLabel="login-email-signup-link" style={styles.alreadyAccountContainer} onPress={() => navigate('SignupEmail')}>
          <View style={styles.alreadyAccountRow}>
            <Text style={[styles.alreadyAccountText, {color: isDark ? colors.textSecondary : '#282828'}]}>Don't you have an account? </Text>
            <Text style={styles.forgotTextTitle}>Sign Up</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default LoginEmail;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    fontSize: FONT_SIZES[14],
  },
  forgotTextTitle: {
    color: '#FF7F50',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
  },
});
