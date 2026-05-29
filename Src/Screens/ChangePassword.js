import {StyleSheet, Text, View, TextInput, Pressable, TouchableOpacity, Platform, ScrollView, ToastAndroid} from 'react-native';
import React, {useRef, useState} from 'react';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {useChangePasswordMutation, useResetPasswordMutation} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useSelector} from 'react-redux';
import {LoginPageErrors, chatRoomSuccess} from '../Components/ErrorSnacks';
import {navigate} from '../../Navigation/RootNavigation';

import Back from '../Components/Back/Back';
import InputOverlay from '../Components/InputOverlay';
import AnimatedButton from '../Components/AnimatedButton';

import {SafeAreaView} from 'react-native-safe-area-context';
import {Image} from 'expo-image';
import {nTwins, selectionTwin, WIDTH_SIZES} from '../../DesiginData/Utility';
import {useNavigation} from '@react-navigation/native';

const ChangePassword = ({route}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordStrong, setIsPasswordStrong] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [cShowPassword, cSetShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [focusedInput, setFocusedInput] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const token = useSelector(state => state.auth.user.token);

  const [next, setNext] = useState(false);

  const oldPasswordInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

  const [changePassword] = useChangePasswordMutation();

  const navigation = useNavigation();

  const handlePassword = new_pass => {
    setPassword(new_pass);

    const lowerCase = /[a-z]/g;
    const upperCase = /[A-Z]/g;
    const numbers = /[0-9]/g;
    const spaces = /\s/g;
    const specialCharacter = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\/\|=]/;

    if (!new_pass.match(lowerCase)) {
      setErrorMessage('Password must contain lowercase letters');
      setIsPasswordStrong(false);
    } else if (!new_pass.match(upperCase)) {
      setErrorMessage('Password must contain uppercase letters');
      setIsPasswordStrong(false);
    } else if (!new_pass.match(numbers)) {
      setErrorMessage('Password must contain numbers');
      setIsPasswordStrong(false);
    } else if (new_pass.length < 6) {
      setErrorMessage('Password length must be more than 6.');
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

  const nextHandler = () => {
    if (!oldPassword) {
      LoginPageErrors('You must enter your current password');
    } else {
      setNext(true);
    }

    return;
  };

  const setNewPasswordHandler = async () => {
    if (!oldPassword || !password || !confirmPassword) {
      LoginPageErrors('Input fields are empty');
      return;
    }

    if (password !== confirmPassword) {
      LoginPageErrors('New and confirm password do not match');
      return;
    }

    setLoading(true); // Show loading indicator

    // Prepare the data object for changePassword API
    const data = {
      cPassword: confirmPassword, // Confirm new password
      newPassword: password, // New password
      oldPassword: oldPassword, // Old password
    };

    // Call changePassword API
    changePassword({token, data})
      .then(e => {
        if (e?.error?.status === 400) {
          LoginPageErrors(e?.error?.data?.message); // Handle 400 errors
        }

        if (e?.data?.statusCode === 200) {
          ToastAndroid.show(e?.data?.message, ToastAndroid.SHORT); // Show success message

          // Reset all states
          setOldPassword('');
          setPassword('');
          setConfirmPassword('');
          setIsPasswordStrong(false);
          setShowPassword(false);
          cSetShowPassword(false);
          setFocusedInput(null);
          setErrorMessage('');
        }
      })
      .finally(() => {
        setLoading(false); // Hide loading indicator
      });
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Back />
        </TouchableOpacity>

        {/* ScrollView starts from "Change Your Password" */}
        <ScrollView
          contentContainerStyle={styles.scrollContainer} // No padding or margin
          showsVerticalScrollIndicator={false} // Hide scroll indicator
        >
          <Text style={styles.heading}>Create Password</Text>
          <Text style={styles.subHead}>New password cannot be your old password</Text>

          {/* Old Password Input */}
          {!next && (
            <>
              <Text style={styles.fieldName}>Current Password</Text>
              <View style={{position: 'relative', marginTop: responsiveWidth(2.67), overflow: 'visible'}} collapsable={false}>
                {focusedInput === 'oldPassword' && (
                  <InputOverlay isVisible />
                )}
                <View style={[styles.textInputContainer, {marginTop: 0}]}>
                  <TextInput
                    ref={oldPasswordInputRef}
                    style={styles.textInputs}
                    secureTextEntry={!showOldPassword}
                    onChangeText={setOldPassword}
                    onFocus={() => setFocusedInput('oldPassword')}
                    onBlur={() => setFocusedInput(null)}
                    selectionColor={selectionTwin()}
                    cursorColor={'#1e1e1e'}
                    maxLength={64}
                    value={oldPassword}
                    placeholder='Current password'
                  />
                  <Pressable style={styles.iconContainer} onPress={() => setShowOldPassword(prev => !prev)}>
                    {showOldPassword ? <Image source={require('../../Assets/Images/eyeOpen.png')} contentFit="contain" style={styles.eyeStyle} /> : <Image source={require('../../Assets/Images/eyeClose.png')} contentFit="contain" style={styles.eyeStyle} />}
                  </Pressable>
                </View>
              </View>
            </>
          )}

          {/* New Password Input */}
          {next && (
            <>
              <Text style={styles.fieldName}>New Password</Text>
              <View style={{position: 'relative', marginTop: responsiveWidth(2.67), overflow: 'visible'}} collapsable={false}>
                {focusedInput === 'password' && (
                  <InputOverlay isVisible />
                )}
                <View style={[styles.textInputContainer, Platform.OS === 'ios' && !isPasswordStrong && password.length > 0 ? {backgroundColor: '#FEEBEB'} : null, {marginTop: 0}]}>
                  <TextInput
                    ref={passwordInputRef}
                    style={[styles.textInputs, Platform.OS === 'ios' && !isPasswordStrong && password.length > 0 ? {color: '#FF5252', backgroundColor: '#FEEBEB'} : null]}
                    secureTextEntry={!showPassword}
                    onChangeText={handlePassword}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                    selectionColor={selectionTwin()}
                    cursorColor={'#1e1e1e'}
                    maxLength={64}
                    value={password}
                    placeholder='New password'
                  />
                  <Pressable style={styles.iconContainer} onPress={() => setShowPassword(prev => !prev)}>
                    {showPassword ? <Image source={require('../../Assets/Images/eyeOpen.png')} contentFit="contain" style={styles.eyeStyle} /> : <Image source={require('../../Assets/Images/eyeClose.png')} contentFit="contain" style={styles.eyeStyle} />}
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
            </>
          )}

          {/* Confirm New Password Input */}
          {next && (
            <>
              
              <Text style={styles.fieldName}>Confirm New Password</Text>
              <View style={{position: 'relative', marginTop: responsiveWidth(2.67), overflow: 'visible'}} collapsable={false}>
                {focusedInput === 'confirmPassword' && (
                  <InputOverlay isVisible />
                )}
                <View style={[styles.textInputContainer, {marginTop: 0}]}>
                  <TextInput
                    ref={confirmPasswordInputRef}
                    style={styles.textInputs}
                    secureTextEntry={!cShowPassword}
                    onChangeText={t => setConfirmPassword(t)}
                    onFocus={() => setFocusedInput('confirmPassword')}
                    onBlur={() => setFocusedInput(null)}
                    selectionColor={selectionTwin()}
                    cursorColor={'#1e1e1e'}
                    maxLength={64}
                    value={confirmPassword}
                    placeholder='Confirm password'
                  />
                  <Pressable style={styles.iconContainer} onPress={() => cSetShowPassword(prev => !prev)}>
                    {cShowPassword ? <Image source={require('../../Assets/Images/eyeOpen.png')} contentFit="contain" style={styles.eyeStyle} /> : <Image source={require('../../Assets/Images/eyeClose.png')} contentFit="contain" style={styles.eyeStyle} />}
                  </Pressable>
                </View>
              </View>
            </>
          )}

          <AnimatedButton title={!next ? 'Next' : 'Change Password'} onPress={!next ? nextHandler : setNewPasswordHandler} loading={loading} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default ChangePassword;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    margin: responsiveWidth(6.4),
  },
  scrollContainer: {
    flexGrow: 1,
    paddingRight: '2.3%',
    paddingBottom: WIDTH_SIZES[24],
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
  iconContainer: {
    marginRight: responsiveWidth(4),
    height: 19,
    width: 19,
    backgroundColor: 'transparent',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: responsiveWidth(2),
    marginTop: responsiveWidth(2.67),
  },
  errorText: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.48),
    color: 'red',
    flexShrink: 1,
  },
  eyeStyle: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
