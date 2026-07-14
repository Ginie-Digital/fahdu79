import {StyleSheet, Text, View, Switch, Image, Pressable} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import TwoFAInputCodeBottomCard from './TwoFAInputCodeBottomCard';
import {LoginPageErrors, SendAuthCode, chatRoomSuccess} from '../ErrorSnacks';
import {token as memoizedToken} from '../../../Redux/Slices/NormalSlices/AuthSlice';
import {useDispatch, useSelector} from 'react-redux';
import {toggleAuthenticatorVia, toggleDisableAuthModal, toggleTwoFAAuthCard} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {useGetTFACodeMutation, useGetTFAEmailCodeMutation, useLazyGetTFAStatusQuery} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useFocusEffect} from '@react-navigation/native';
import TwoFADisableModal from './TwoFADisableModal';
import {FONT_SIZES, WIDTH_SIZES} from '../../../DesiginData/Utility';
import {useAppTheme} from '../../Hook/useAppTheme';

const TwoFALanding = () => {
  const {colors, isDark} = useAppTheme();
  const token = useSelector(state => state.auth.user.token);

  const dispatch = useDispatch();

  const x = useSelector(state => state.hideShow.visibility.authenticatorVia);

  console.log(x)


  const {type, show} = useSelector(state => state.hideShow.visibility.twoFAAuthCard);

  const [getTFACode] = useGetTFACodeMutation();
  const [getTfaEmailCode] = useGetTFAEmailCodeMutation();

  const [getTFAStatus] = useLazyGetTFAStatusQuery();


  const CustomToggle = ({ value, onToggle }) => {
    return (
      <Pressable onPress={onToggle} style={styles.toggleContainer}>
        <View style={[
          styles.track,
          {
            backgroundColor: isDark ? colors.inputBg : '#fff',
            borderColor: isDark ? colors.border : '#000',
          },
          value && styles.trackActive
        ]}>
          <View style={[
            styles.thumb,
            {
              backgroundColor: isDark ? '#555555' : '#1e1e1e80',
            },
            value && [styles.thumbActive, {backgroundColor: isDark ? colors.accent : '#f89f7b'}]
          ]} />
        </View>
      </Pressable>
    );
  };
  

  const toggleSwitchAuth = async type => {
    if (type === 'email' && x.auth) {
      LoginPageErrors('You need to disable App authentication first');
      return;
    }

    if (type === 'auth' && x.email) {
      LoginPageErrors('You need to disable email authentication first');
      return;
    }

    if (type === 'auth') {
      if (!x.auth) {
        dispatch(toggleAuthenticatorVia({info: {auth: !x.auth}}));
        const {data, error} = await getTFACode({token, send: true});

        if (data?.data) {
          console.log(data?.data);
          chatRoomSuccess('Code sent to your email');
          setTimeout(() => {
            dispatch(toggleTwoFAAuthCard({info: {type: 'auth', show: true}}));
          }, 500);
        }
      } else {
        dispatch(toggleDisableAuthModal({show: true}));
      }
    }

    if (type === 'email') {
      if (!x.email) {
        dispatch(toggleAuthenticatorVia({info: {email: !x.email}}));

        const {data, error} = await getTfaEmailCode({token, send: true});

        if (data?.data) {
          chatRoomSuccess('Code sent to your email');
          setTimeout(() => {
            dispatch(toggleTwoFAAuthCard({info: {type: 'email', show: true}}));
          }, 500);
        }
      } else {
        dispatch(toggleDisableAuthModal({show: true}));
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      const getstatus = async () => {
        const {data, error} = await getTFAStatus({token});

        console.log(data?.data?.TFA, error);

        if (data) {
          dispatch(toggleAuthenticatorVia({info: {email: data?.data?.TFA?.email, auth: data?.data?.TFA?.thirdParty}}));
        }
      };

      getstatus();
    }, [token]),
  );




  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={[styles.card, {backgroundColor: isDark ? colors.card : '#FFF9F5', flexDirection: 'column', marginTop: responsiveWidth(8), borderWidth: WIDTH_SIZES['1.5'], overflow: 'hidden'}, isDark && {borderColor: colors.border}]}>
        <View style={[styles.card, {elevation: 0}, isDark && {backgroundColor: colors.card}]}>
          <View style={styles.cardLeftView}>
            <View style = {{width : "100%", backgroundColor : isDark ? colors.card : '#FFF9F5', flexDirection : 'row', alignItems : 'center', justifyContent : 'space-between'}}>
              <Text style={[styles.heading, isDark && {color: colors.text}]}>With E-Mail Address</Text>
              <View style={styles.cardRightView}>
                      <CustomToggle value={x.email} onToggle={() => toggleSwitchAuth("email")} />
              </View>
            </View>

            <Text style={[styles.description, isDark && {color: colors.textSecondary}]}>Receive email code for added security, Authenticate your account easily and securely.</Text>
          </View>
        </View>
      </View>

      <TwoFAInputCodeBottomCard token={token} />
      <TwoFADisableModal token={token} />
    </View>
  );
};

export default TwoFALanding;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopColor: '#282828',
    paddingTop: responsiveWidth(14),
    alignItems: 'center',
  },

  card: {
    backgroundColor: '#FFF9F5',
    paddingHorizontal: responsiveWidth(4),
    paddingVertical: responsiveWidth(3),
    flexDirection: 'row',
    borderRadius: WIDTH_SIZES[14],
    width: responsiveWidth(85),
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  heading: {
    fontFamily: 'Rubik-SemiBold',
    color: '#282828',
    fontSize: FONT_SIZES[16],
  },

  description: {
    fontFamily: 'Rubik-Medium',
    color: '#282828',
    fontSize: responsiveFontSize(1.6),
    width : responsiveWidth(70)
  },

  cardLeftView: {
    width: responsiveWidth(78),
    gap: responsiveWidth(2),
  },
  appIconContainer: {
    flexDirection: 'column',
    gap: responsiveWidth(2),
    // borderWidth: 1,
    alignSelf: 'flex-start',
    width: responsiveWidth(75),
    marginTop: responsiveWidth(4),
    paddingBottom: responsiveWidth(4),
  },


  //noii

  toggleContainer: {
    width: 44,
    height: 24,
    justifyContent: "center",
  },
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: "#000",
    justifyContent: "center",
    paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  trackActive: {
    backgroundColor: "#fff",
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1e1e1e80",
    position: "absolute",
    borderWidth : 1,
    left: -1,
  },
  thumbActive: {
    left: 20,
    backgroundColor: "#f89f7b",
  },
});
