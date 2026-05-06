import { StyleSheet, Text, View, Image, Platform, TouchableOpacity, Pressable, ScrollView } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { googleSignIn, signOutGoogle, appleSignIn } from '../../../OAuth';
import { currentUserInformation, enableNotificationModal, setPostsCardType, toggleVerficationScreen } from '../../../Redux/Slices/NormalSlices/AuthSlice';
import { setSharedCampaignId, setUserFromCampaignLink, setYlyticInstagramUserId } from '../../../Redux/Slices/NormalSlices/Deeplink/DeeplinkSlice';
import { responsiveWidth, responsiveFontSize, responsiveHeight } from 'react-native-responsive-dimensions';
import Authenticator from '../../Components/LoginComponent/Authenticator';
import Seprator from '../../Components/Seprator';
import { navigate } from '../../../Navigation/RootNavigation';
import { LoginPageErrors } from '../../Components/ErrorSnacks';
import { nTwins, WIDTH_SIZES } from '../../../DesiginData/Utility';
import ChevronLoader from '../../ChevronLoader';
import AlertBox from '../../AlertBox';
import { toggleAlertModal, toggleShowOnboarding } from '../../../Redux/Slices/NormalSlices/HideShowSlice';

const LoginHome = () => {
  const dispatcher = useDispatch();

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

  return (
    <View testID="login-home-screen" style={{ flex: 1, backgroundColor: '#fff' }}>
      {loader && <ChevronLoader />}

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.centeredContent}>
          <Image source={require('../../../Assets/Images/HomeShow.png')} style={styles.image} />
          <View style={styles.textWrapper}>
            <Text style={styles.headingText}>Your Gateway to Earnings</Text>
            <Text numberOfLines={2} adjustsFontSizeToFit={true} style={styles.descriptionText}>
              Join Fahdu today & enjoy innovative content {'\n'}
              monetization tools and resources.
            </Text>
          </View>

          <View style={[styles.buttonWrapper, Platform.OS === 'ios' ? styles.newLogin : null]}>
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
              <View style={[styles.googleButton, socialButton && { backgroundColor: '#1e1e1e' }]}>
                <Image source={require('../../../Assets/Images/googleIcons.png')} style={styles.icon} />

                <Text style={[styles.buttonText, socialButton && { color: '#fff' }]}>{Platform.OS === 'android' ? 'Continue with Google' : 'Google'}</Text>
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

                  if (data?.data) afterLoginProcess(data);

                  setLoader(false);
                }}>
                <View style={[styles.appleButton, socialButtonTwo && { backgroundColor: '#1e1e1e' }]}>
                  <Image source={require('../../../Assets/Images/appleIcons.png')} style={[styles.icon, { width: 17 }]} />
                  <Text style={[styles.buttonText, socialButtonTwo && { color: '#fff' }]}>Apple</Text>
                </View>
              </Pressable>
            )}
          </View>

          <Seprator />
          <Pressable
            testID="login-button"
            accessibilityLabel="login-button"
            onPressIn={() => setLoginPress(true)}
            onPressOut={() => setLoginPress(false)}
            onPress={() => {
              navigate('LoginEmail');
            }}>
            <View style={[styles.emailButton, loginPress === true && { backgroundColor: '#fff' }]}>
              <Text style={styles.emailButtonText}>Login</Text>
            </View>
          </Pressable>
          <Pressable testID="signup-button" accessibilityLabel="signup-button" onPressIn={() => setSignupPress(true)} onPressOut={() => setSignupPress(false)} onPress={() => navigate('SignupEmail')}>
            <View style={[styles.signupButton, signupPress === true && { backgroundColor: '#FFA86B' }]}>
              <Text style={styles.signupButtonText}>Sign Up</Text>
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
    backgroundColor: '#fff',
    marginTop: 24,
    padding: Platform.OS === 'android' ? WIDTH_SIZES[24] : null,
    // borderWidth: 1,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: 'blue',
  },
  image: {
    width: Platform.OS === 'android' ? '100%' : 329,
    height: 329,
    resizeMode: 'contain',
  },
  textWrapper: {
    alignItems: 'center',
    // backgroundColor: 'red',
    width: '100%',
    // marginTop: responsiveWidth(10),
  },
  headingText: {
    color: '#282828',
    fontSize: responsiveFontSize(2.75),
    fontFamily: 'Rubik-Bold',
    textAlign: 'center',
    marginHorizontal: 24,
    marginTop: 28,
  },

  descriptionText: {
    fontFamily: 'Rubik-Regular',
    color: '#282828',
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
    borderWidth: responsiveWidth(0.4),
    borderColor: '#1e1e1e',
    borderRadius: responsiveWidth(3.73),
    height: responsiveHeight(6.65),
    width: nTwins(86, 43.2),
  },
  appleButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: responsiveWidth(0.4),
    borderColor: '#1e1e1e',
    borderRadius: responsiveWidth(3.73),
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
    borderColor: '#1e1e1e',
  },
  signupButton: {
    borderWidth: responsiveWidth(0.4),
    borderColor: '#1e1e1e',
    borderRadius: responsiveWidth(3.73),
    height: responsiveHeight(6.65),
    justifyContent: 'center',
    alignItems: 'center',
    width: nTwins(86, 92),
    // marginTop: responsiveWidth(3),
  },
  buttonText: {
    color: '#1e1e1e',
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(1.97),
    marginLeft: responsiveWidth(2.13),
  },
  emailButtonText: {
    color: '#1e1e1e',
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(1.97),
  },
  signupButtonText: {
    color: '#1e1e1e',
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
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    marginVertical: responsiveWidth(4.27),
  },
});
