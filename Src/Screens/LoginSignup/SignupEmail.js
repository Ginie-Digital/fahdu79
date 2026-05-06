import {Pressable, StyleSheet, Text, View, TouchableOpacity, Platform} from 'react-native';
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
    <SafeAreaView testID="signup-email-screen" style={{flex: 1, backgroundColor: '#fff'}}>
      <View style={styles.container}>
        <TouchableOpacity testID="signup-email-back-button" accessibilityLabel="signup-email-back-button" style={styles.backButton} onPress={() => navigate('LoginHome')}>
          <Back />
        </TouchableOpacity>
        <Text style={styles.heading}>Sign Up</Text>
        <Text style={styles.subHead}>Earn from your content on your terms. Sign up now!</Text>

        <Text style={styles.fieldName}>Email</Text>
        <View>
          <View style={styles.textInputContainer}>
            <TextInput
              testID="signup-email-input"
              accessibilityLabel="signup-email-input"
              selectionColor={selectionTwin()}
              selectionHandleColor={'#ffa86b'}
              cursorColor={'#1e1e1e'}
              placeholderTextColor="#B2B2B2"
              placeholder="Enter Email"
              spellCheck={false}
              autoCorrect={false}
              autoCapitalize={'none'}
              style={styles.textInputs}
              onChangeText={t => setEmail(t)}
              maxLength={50}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>
          {focusedInput === 'email' && (
            <InputOverlay
              isVisible={isKeyboardVisible}
              style={{
                marginLeft: responsiveWidth(1.06),
                marginTop: nTwins(4.4, 4.8),
              }}
            />
          )}
        </View>

        <Text style={styles.fieldName}>Who referred you? (Optional)</Text>
        <View>
          <View style={styles.textInputContainer}>
            <TextInput
              testID="signup-referral-input"
              accessibilityLabel="signup-referral-input"
              selectionColor={selectionTwin()}
              selectionHandleColor={'#ffa86b'}
              cursorColor={'#1e1e1e'}
              placeholderTextColor="#B2B2B2"
              placeholder="@username or paste referral link"
              spellCheck={false}
              autoCorrect={false}
              autoCapitalize={'none'}
              style={styles.textInputs}
              onChangeText={handleReferralInput}
              value={referralCode}
              onFocus={() => setFocusedInput('referral')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>
          <Text style={styles.referralHint}>
            Search for the creator who referred you, or simply paste their referral link here.
          </Text>

          {focusedInput === 'referral' && (
            <InputOverlay
              isVisible={isKeyboardVisible}
              style={{
                marginLeft: responsiveWidth(1.06),
                marginTop: nTwins(4.4, 4.8),
              }}
            />
          )}
        </View>

        <AnimatedButton testID="signup-email-next-button" title={'Next'} onPress={handleGoToNext} loading={false} />

        <TouchableOpacity testID="signup-email-login-link" accessibilityLabel="signup-email-login-link" style={styles.alreadyAccountContainer} onPress={() => navigate('LoginEmail')}>
          <View style={styles.alreadyAccountRow}>
            <Text style={styles.alreadyAccountText}>Do you have an account? </Text>
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
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: responsiveWidth(4),
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
