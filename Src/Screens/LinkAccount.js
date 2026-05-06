import {StyleSheet, Text, View, Image, Pressable, ActivityIndicator} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import {useLazyAccountLinkStatusQuery, useLinkAccountMutation, useUnLinkAccountMutation} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useDispatch, useSelector} from 'react-redux';
import {token as memoizedToken} from '../../Redux/Slices/NormalSlices/AuthSlice';

import {googleUserInfo} from '../../OAuth';
import {CreatePasswordError, LoginPageErrors} from '../Components/ErrorSnacks';
import {autoLogout} from '../../AutoLogout';
import {navigate} from '../../Navigation/RootNavigation';
import {FONT_SIZES, WIDTH_SIZES} from '../../DesiginData/Utility';
import LinkingModal from './LoginSignup/LinkingModal';
import {toggleLinkingModal} from '../../Redux/Slices/NormalSlices/HideShowSlice';

const LinkAccount = () => {
  const [accountLinkStatus] = useLazyAccountLinkStatusQuery();

  const [linkAccount] = useLinkAccountMutation();

  const [unLinkAccount] = useUnLinkAccountMutation();

  const token = useSelector(state => state.auth.user.token);

  const [googleAccount, setGoogleAccount] = useState(false);

  const [loading, setLoading] = useState(true);

  const [loadingInfo, setLoadingInfo] = useState(false);

  const dispatch = useDispatch();

  useEffect(() => {
    const accountLinkStatusHandler = async () => {
      const status = await accountLinkStatus({token});

      setGoogleAccount(status?.data?.data?.google);

      setLoading(false);
    };

    accountLinkStatusHandler();
  }, [token]);

  const connectDisconnectHandler = async () => {
    setLoadingInfo(true);

    if (googleAccount) {
      const unlink = await unLinkAccount({token, provider: 'google'});
      setLoadingInfo(false);

      if (unlink?.data) {
        LoginPageErrors(unlink?.data?.message);

        setGoogleAccount(false);
      }

      if (unlink?.error) {
        dispatch(toggleLinkingModal({show: true}));
        // CreatePasswordError(unlink?.error?.data?.message);
      }

      if (unlink?.error?.data?.status_code === 2044) {
        autoLogout();
      }
    } else {
      const data = await googleUserInfo();
      const link = await linkAccount({token, data});

      console.log(link);

      if (link?.error) {
        LoginPageErrors(link?.error?.data?.message);
      }

      if (link?.data) {
        LoginPageErrors(link?.data?.message);
        setGoogleAccount(true);
      }

      if (link?.error?.data?.status_code === 2044) {
        autoLogout();
      }

      setLoadingInfo(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size={'small'} color={'#ffa07a'} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={({pressed}) => [
          styles.loginWithGoogle,
          {flexDirection: 'row', alignItems: 'center', gap: 8},
          pressed && {backgroundColor: '#1e1e1e'}, // only background changes
        ]}
        onPress={connectDisconnectHandler}>
        {({pressed}) =>
          loadingInfo ? (
            <ActivityIndicator size={'small'} color={pressed ? 'white' : '#1e1e1e'} />
          ) : (
            <>
              <Image
                source={require('../../Assets/Images/googleIcon.png')}
                style={{
                  height: responsiveWidth(5.5),
                  width: responsiveWidth(5.5),
                  // no tintColor here — keeps original logo colors
                }}
                resizeMethod="resize"
                resizeMode="contain"
              />
              <Text
                style={{
                  fontFamily: 'Rubik-Medium',
                  color: pressed ? 'white' : '#1e1e1e',
                  fontSize: FONT_SIZES['16'],
                }}>
                {googleAccount ? 'Disconnect' : 'Connect'}
              </Text>
            </>
          )
        }
      </Pressable>

      <Text style={styles.textHighlight}>*Your account is linked with Google. Disconnect here to secure it with a password.</Text>
      <LinkingModal />
    </View>
  );
};

export default LinkAccount;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopColor: '#282828',

    paddingHorizontal: WIDTH_SIZES['24'],
    justifyContent: 'center',
  },

  loginWithGoogle: {
    resizeMode: 'contain',
    height: 54,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: WIDTH_SIZES['1.5'],

    alignSelf: 'center',
    borderRadius: WIDTH_SIZES['14'],
    gap: 8,
    borderBlockColor: '#1e1e1e',
  },
  textHighlight: {
    color: '#1e1e1e',
    fontFamily: 'Rubik-Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
    textAlign: 'center',
  },
});
