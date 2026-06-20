import { StyleSheet, Text, View, Image, Platform, TouchableOpacity, Pressable, ScrollView, useColorScheme } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { googleSignIn, signOutGoogle, appleSignIn } from '../../../OAuth';
import { currentUserInformation } from '../../../Redux/Slices/NormalSlices/AuthSlice';
import { setSharedCampaignId, setUserFromCampaignLink, setYlyticInstagramUserId } from '../../../Redux/Slices/NormalSlices/Deeplink/DeeplinkSlice';
import { responsiveWidth, responsiveFontSize, responsiveHeight } from 'react-native-responsive-dimensions';
import Authenticator from '../../Components/LoginComponent/Authenticator';
import Seprator from '../../Components/Seprator';
import { navigate } from '../../../Navigation/RootNavigation';
import { LoginPageErrors } from '../../Components/ErrorSnacks';
import { nTwins, WIDTH_SIZES } from '../../../DesiginData/Utility';
import ChevronLoader from '../../ChevronLoader';
import AlertBox from '../../AlertBox';
import { toggleAlertModal, toggleShowOnboarding, toggleVerficationScreen } from '../../../Redux/Slices/NormalSlices/HideShowSlice';

const LoginHome = () => {
  const dispatcher = useDispatch();
  const colorScheme = useColorScheme();
  const isDark = true; // colorScheme === 'dark';

  const [authToken, setAuthToken] = useState('');
  const [type, setType] = useState(false);

  const [loginPress, setLoginPress] = useState(false);
  const [signupPress, setSignupPress] = useState(false);

  const [socialButton, setSocialButton] = useState(false);

  const [socialButtonTwo, setSocialButtonTwo] = useState(false);

  const [loader, setLoader] = useState(false);

  const dispatch = useDispatch();

  const afterLoginProcess = useCallback(async data => {
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
        onlyBrandsAccess: data?.data?.user?.onlyBrandsAccess,
        suspended: data?.data?.user?.suspended,
      }),
    );
    dispatcher(toggleShowOnboarding({ show: data?.data?.user?.showOnboardingCard ?? false }));
  }, []);

  const GoogleLogin = async () => {
    const data = await googleSignIn();
    if (data?.statusCode === 200) {
      afterLoginProcess(data);
    } else if (data?.statusCode === 202) {
      setAuthToken(data?.data?.authToken);
      setType(data?.data?.email);
      dispatcher(toggleVerficationScreen({ show: 1 }));
    } else if (data?.statusCode === 409) {
      dispatch(toggleAlertModal({ message: 'Account Not Connected', type: false, show: true }));
      signOutGoogle();
    } else {
      dispatch(toggleAlertModal({ message: 'Something Went Wrong, Please Try Again', type: false, show: true }));
    }
  };

  // Dark mode dynamic styles
  const dynamicStyles = {
    pageBackground: isDark ? '#121212' : '#fff',
    headingColor: isDark ? '#FFFFFF' : '#282828',
    descriptionColor: isDark ? '#4D4D4D' : '#282828',
    socialButtonBg: isDark ? '#171717' : undefined,
    socialButtonBorder: isDark ? '#1F1F1F' : '#1e1e1e',
    socialButtonText: isDark ? '#FFFFFF' : '#1e1e1e',
    socialButtonPressedBg: isDark ? '#2a2a2a' : '#1e1e1e',
    socialButtonPressedText: isDark ? '#FFFFFF' : '#fff',
    loginButtonBg: '#FFA86B',
    loginButtonPressedBg: isDark ? '#e08f53' : '#fff',
    loginButtonText: isDark ? '#000000' : '#1e1e1e',
    loginButtonBorder: isDark ? '#FF7819' : '#1e1e1e',
    loginButtonBorderWidth: isDark ? 2 : responsiveWidth(0.4),
    signupButtonBg: isDark ? '#171717' : undefined,
    signupButtonBorder: isDark ? '#1F1F1F' : '#1e1e1e',
    signupButtonText: isDark ? '#FFFFFF' : '#1e1e1e',
    signupButtonPressedBg: isDark ? '#2a2a2a' : '#FFA86B',
  };

  return (
    <View testID="login-home-screen" style={{ flex: 1, backgroundColor: dynamicStyles.pageBackground }}>
      {loader && <ChevronLoader />}

      <ScrollView contentContainerStyle={[styles.scrollContainer, { backgroundColor: dynamicStyles.pageBackground }]}>
        <View style={styles.centeredContent}>
          <Image
            source={
              isDark
                ? require('../../../Assets/Images/HomeShowDark.jpg')
                : require('../../../Assets/Images/HomeShow.png')
            }
            style={styles.image}
          />
          <View style={styles.textWrapper}>
            <Text style={[styles.headingText, { color: dynamicStyles.headingColor }]}>Your Gateway to Earnings</Text>
            <Text numberOfLines={2} adjustsFontSizeToFit={true} style={[styles.descriptionText, { color: dynamicStyles.descriptionColor }]}>
              Join Fahdu today & enjoy innovative content {'\n'}
              monetization tools and resources.
            </Text>
          </View>

          <View style={[styles.buttonWrapper, Platform.OS === 'ios' ? [styles.newLogin, { backgroundColor: dynamicStyles.pageBackground }] : null]}>
            <Pressable
              testID="google-login-button"
              accessibilityLabel="google-login-button"
              onPressIn={() => setSocialButton(true)}
              onPressOut={() => setSocialButton(false)}
              onPress={async () => {
                setLoader(true);

                await GoogleLogin();

                setLoader(false);
              }}>
              <View style={[
                styles.googleButton,
                { backgroundColor: dynamicStyles.socialButtonBg, borderColor: dynamicStyles.socialButtonBorder },
                socialButton && { backgroundColor: dynamicStyles.socialButtonPressedBg },
              ]}>
                <Image source={require('../../../Assets/Images/googleIcons.png')} style={styles.icon} />

                <Text style={[styles.buttonText, { color: dynamicStyles.socialButtonText }, socialButton && { color: dynamicStyles.socialButtonPressedText }]}>{Platform.OS === 'android' ? 'Continue with Google' : 'Google'}</Text>
              </View>
            </Pressable>
            {Platform.OS === 'ios' && (
              <Pressable
                testID="apple-login-button"
                accessibilityLabel="apple-login-button"
                onPressIn={() => setSocialButtonTwo(true)}
                onPressOut={() => setSocialButtonTwo(false)}
                onPress={async () => {
                  setLoader(true);
                  const data = await appleSignIn();

                  if (data?.statusCode === 200) {
                    afterLoginProcess(data);
                  } else if (data?.statusCode === 202) {
                    setAuthToken(data?.data?.authToken);
                    setType(data?.data?.email);
                    dispatcher(toggleVerficationScreen({ show: 1 }));
                  }

                  setLoader(false);
                }}>
                <View style={[
                  styles.appleButton,
                  { backgroundColor: dynamicStyles.socialButtonBg, borderColor: dynamicStyles.socialButtonBorder },
                  socialButtonTwo && { backgroundColor: dynamicStyles.socialButtonPressedBg },
                ]}>
                  <Image
                    source={
                      isDark
                        ? require('../../../Assets/Images/appleIcons_white.png')
                        : require('../../../Assets/Images/appleIcons.png')
                    }
                    style={[styles.icon, { width: 17 }]}
                  />
                  <Text style={[styles.buttonText, { color: dynamicStyles.socialButtonText }, socialButtonTwo && { color: dynamicStyles.socialButtonPressedText }]}>Apple</Text>
                </View>
              </Pressable>
            )}
          </View>

          <Seprator isDark={isDark} />
          <Pressable
            testID="login-button"
            accessibilityLabel="login-button"
            onPressIn={() => setLoginPress(true)}
            onPressOut={() => setLoginPress(false)}
            onPress={() => {
              navigate('LoginEmail');
            }}>
            <View style={[
              styles.emailButton,
              { 
                backgroundColor: dynamicStyles.loginButtonBg,
                borderColor: dynamicStyles.loginButtonBorder,
                borderWidth: dynamicStyles.loginButtonBorderWidth,
              },
              loginPress === true && { backgroundColor: dynamicStyles.loginButtonPressedBg },
            ]}>
              <Text style={[styles.emailButtonText, { color: dynamicStyles.loginButtonText }]}>Login</Text>
            </View>
          </Pressable>
          <Pressable testID="signup-button" accessibilityLabel="signup-button" onPressIn={() => setSignupPress(true)} onPressOut={() => setSignupPress(false)} onPress={() => navigate('SignupEmail')}>
            <View style={[
              styles.signupButton,
              { backgroundColor: dynamicStyles.signupButtonBg, borderColor: dynamicStyles.signupButtonBorder },
              signupPress === true && { backgroundColor: dynamicStyles.signupButtonPressedBg },
            ]}>
              <Text style={[styles.signupButtonText, { color: dynamicStyles.signupButtonText }]}>Sign Up</Text>
            </View>
          </Pressable>
          <Authenticator authToken={authToken} type={type} afterLoginProcess={afterLoginProcess} />
        </View>
      </ScrollView>
    </View>
  );
};

export default LoginHome;

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    marginTop: 24,
    padding: Platform.OS === 'android' ? WIDTH_SIZES[24] : null,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: Platform.OS === 'android' ? '100%' : 329,
    height: 329,
    resizeMode: 'contain',
  },
  textWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  headingText: {
    fontSize: responsiveFontSize(2.75),
    fontFamily: 'Rubik-Bold',
    textAlign: 'center',
    marginHorizontal: 24,
    marginTop: 28,
  },

  descriptionText: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.9),
    marginBottom: responsiveWidth(6),
    marginTop: 20,
    textAlign: 'center',
    lineHeight: responsiveFontSize(2.75),
    marginHorizontal: 24,
    width: '100%',
    flexShrink: 1,
  },

  buttonWrapper: {
    gap: responsiveWidth(3),
    marginTop: nTwins(0, 5),
  },
  googleButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    height: responsiveHeight(6.65),
    width: nTwins(86, 43.2),
  },
  appleButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    height: responsiveHeight(6.65),
    width: nTwins(86, 43.2),
  },
  emailButton: {
    backgroundColor: '#FFA86B',
    borderRadius: responsiveWidth(3.73),
    height: responsiveHeight(6.65),
    justifyContent: 'center',
    alignItems: 'center',
    width: nTwins(86, 92),
    marginVertical: responsiveWidth(4.27),
    borderWidth: responsiveWidth(0.4),
  },
  signupButton: {
    borderWidth: 1.5,
    borderRadius: 14,
    height: responsiveHeight(6.65),
    justifyContent: 'center',
    alignItems: 'center',
    width: nTwins(86, 92),
  },
  buttonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(1.97),
    marginLeft: responsiveWidth(2.13),
  },
  emailButtonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(1.97),
  },
  signupButtonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(1.97),
    fontWeight: '600',
  },
  icon: {
    height: 21,
    width: 21,
    resizeMode: 'contain',
  },
  newLogin: {
    flexDirection: 'row',
    width: responsiveWidth(92),
    justifyContent: 'space-between',
    marginVertical: responsiveWidth(4.27),
  },
});
