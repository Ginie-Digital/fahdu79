import {Pressable, StyleSheet, Text, View, TouchableOpacity, Platform, useColorScheme} from 'react-native';
import React, {useState} from 'react';
import {useDispatch} from 'react-redux';
import {TextInput} from 'react-native-gesture-handler';
import {navigate} from '../../../Navigation/RootNavigation';
import {responsiveWidth, responsiveFontSize, responsiveHeight} from 'react-native-responsive-dimensions';
import {nTwins, selectionTwin, validEmail} from '../../../DesiginData/Utility';
import {LoginPageErrors} from '../../Components/ErrorSnacks';
import Back from '../../../Assets/svg/back.svg';
import InputOverlay from '../../Components/InputOverlay';
import useKeyboardHook from '../../CustomHooks/useKeyboardHook';
import AnimatedButton from '../../Components/AnimatedButton';
import {SafeAreaView} from 'react-native-safe-area-context';
import {validateEmail} from '../../../DesiginData/Utility';
import {toggleCreatorSelectorModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import CreatorSelectorModal from '../../Components/Verification/CreatorSelectorModal';

const SignupEmail = () => {
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [focusedInput, setFocusedInput] = useState(null);
  const dispatch = useDispatch();
  const {isKeyboardVisible} = useKeyboardHook();
  const colorScheme = useColorScheme();
  const isDark = true; // colorScheme === 'dark';

  const handleReferralInput = text => {
    setReferralCode(text);
    
    // Check for @ trigger
    if (text.includes('@')) {
      const parts = text.split('@');
      const searchTerm = parts[parts.length - 1]; // Get text after the last @
      dispatch(toggleCreatorSelectorModal({show: true}));
    }

    // Regex to catch usernames from creators.fahdu.com/username
    const linkRegex = /creators\.fahdu\.com\/([\w.]+)/;
    const match = text.match(linkRegex);

    if (match && match[1]) {
      const username = match[1];
      setReferralCode(username);
    }
  };

  const handleCreatorSelect = (creator) => {
    setReferralCode(creator.displayName);
  };

  const handleGoToNext = async () => {
    const validationResult = validateEmail(email);

    if (validationResult.isValid) {
      navigate('SignupPassword', {
        email,
        referralCode: referralCode.trim() || undefined,
      });
    } else {
      LoginPageErrors(validationResult.message);
    }
  };

  return (
    <SafeAreaView testID="signup-email-screen" style={{flex: 1, backgroundColor: isDark ? '#121212' : '#fff'}}>
      <View style={[styles.container, {backgroundColor: isDark ? '#121212' : 'white'}]}>
        <TouchableOpacity testID="signup-email-back-button" accessibilityLabel="signup-email-back-button" style={styles.backButton} onPress={() => navigate('LoginHome')}>
          <Back color={isDark ? '#FFFFFF' : '#1E1E1E'} />
        </TouchableOpacity>
        <Text style={[styles.heading, {color: isDark ? '#FFFFFF' : '#1e1e1e'}]}>Sign Up</Text>
        <Text style={[styles.subHead, {color: isDark ? '#FFFFFF' : '#1e1e1e'}]}>Earn from your content on your terms. Sign up now!</Text>

        <Text style={[styles.fieldName, {color: isDark ? '#FFFFFF' : '#1e1e1e'}]}>Email</Text>
        <View style={{position: 'relative', marginTop: responsiveWidth(2), overflow: 'visible'}} collapsable={false}>
          {focusedInput === 'email' && (
            <InputOverlay isVisible={isKeyboardVisible} style={isDark && { backgroundColor: '#292929', borderRadius: 14 }} />
          )}
          <View style={[styles.textInputContainer, {marginTop: 0}, isDark && { backgroundColor: '#191919', borderColor: '#292929', borderWidth: 1.5, borderRadius: 14 }]}>
            <TextInput
              testID="signup-email-input"
              accessibilityLabel="signup-email-input"
              selectionColor={isDark ? '#FFA86B' : selectionTwin()}
              selectionHandleColor={isDark ? '#FFA86B' : '#ffa86b'}
              cursorColor={isDark ? '#FFFFFF' : '#1e1e1e'}
              placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.15)' : '#B2B2B2'}
              placeholder="Enter Email"
              spellCheck={false}
              autoCorrect={false}
              autoCapitalize={'none'}
              style={[styles.textInputs, {color: isDark ? '#FFFFFF' : '#1e1e1e'}]}
              onChangeText={t => setEmail(t)}
              maxLength={50}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>
        </View>

        <Text style={[styles.fieldName, {color: isDark ? '#FFFFFF' : '#1e1e1e'}]}>Who referred you? (Optional)</Text>
        <View style={{position: 'relative', marginTop: responsiveWidth(2), overflow: 'visible'}} collapsable={false}>
          {focusedInput === 'referral' && (
            <InputOverlay isVisible={isKeyboardVisible} style={isDark && { backgroundColor: '#292929', borderRadius: 14 }} />
          )}
          <View style={[styles.textInputContainer, {marginTop: 0}, isDark && { backgroundColor: '#191919', borderColor: '#292929', borderWidth: 1.5, borderRadius: 14 }]}>
            <TextInput
              testID="signup-referral-input"
              accessibilityLabel="signup-referral-input"
              selectionColor={isDark ? '#FFA86B' : selectionTwin()}
              selectionHandleColor={isDark ? '#FFA86B' : '#ffa86b'}
              cursorColor={isDark ? '#FFFFFF' : '#1e1e1e'}
              placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.15)' : '#B2B2B2'}
              placeholder="@username or paste referral link"
              spellCheck={false}
              autoCorrect={false}
              autoCapitalize={'none'}
              style={[styles.textInputs, {color: isDark ? '#FFFFFF' : '#1e1e1e'}]}
              onChangeText={handleReferralInput}
              value={referralCode}
              onFocus={() => setFocusedInput('referral')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>
        </View>
        <Text style={[styles.referralHint, isDark && {color: '#4D4D4D'}]}>
          Search for the creator who referred you, or simply paste their referral link here.
        </Text>

        <AnimatedButton testID="signup-email-next-button" title={'Next'} onPress={handleGoToNext} loading={false} isDark={isDark} />

        <TouchableOpacity testID="signup-email-login-link" accessibilityLabel="signup-email-login-link" style={styles.alreadyAccountContainer} onPress={() => navigate('LoginEmail')}>
          <View style={styles.alreadyAccountRow}>
            <Text style={[styles.alreadyAccountText, {color: isDark ? '#4D4D4D' : '#1e1e1e'}]}>Do you have an account? </Text>
            <Text style={styles.forgotTextTitle}>Login</Text>
          </View>
        </TouchableOpacity>
      </View>
      <CreatorSelectorModal onSelect={handleCreatorSelect} initialSearch={referralCode.includes('@') ? referralCode.split('@').pop() : ''} />
    </SafeAreaView>
  );
};

export default SignupEmail;

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
    marginTop: responsiveWidth(2),
  },
  textInputs: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    flex: 1,
    height: responsiveHeight(6.65),
    borderRadius: responsiveWidth(3.73),
  },
  referralHint: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.48),
    color: '#757575',
    marginTop: responsiveWidth(2),
    lineHeight: 20,
  },
  referralHintBold: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
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
});
