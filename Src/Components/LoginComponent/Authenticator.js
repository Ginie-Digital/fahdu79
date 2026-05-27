import { StyleSheet, Text, View, Animated, TouchableOpacity, FlatList, Image, TextInput, Switch, ToastAndroid, Pressable, ActivityIndicator, Platform, BackHandler, Linking } from 'react-native';
import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { responsiveFontSize, responsiveHeight, responsiveWidth } from 'react-native-responsive-dimensions';
import Modal from 'react-native-modal';
import DIcon from '../../../DesiginData/DIcons';
import { useSelector, useDispatch } from 'react-redux';
import { toggleVerficationScreen } from '../../../Redux/Slices/NormalSlices/HideShowSlice';

import { useKeyboard } from '@react-native-community/hooks';
import axios from 'axios';

import { emptyUnreadRoomList } from '../../../Redux/Slices/NormalSlices/UnReadThreadSlice';
import { LoginPageErrors, successSnack } from '../ErrorSnacks';
import { FONT_SIZES, padios, selectionTwin, WIDTH_SIZES } from '../../../DesiginData/Utility';

import { BottomSheetBackdrop, BottomSheetModal } from '@gorhom/bottom-sheet';
import AnimatedButton from '../AnimatedButton';
import { useGetTFAEmailCodeMutation } from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { openInbox } from 'react-native-email-link';

const Authenticator = ({ authToken, type, afterLoginProcess }) => {
  console.log(authToken, 'AUTHTOKEN');

  const inputRefs = React.useRef([]);

  const [loading, setLoading] = useState(false);

  const [verificationCode, setVerificationCode] = useState('');

  const [viaAuthenticator, setViaAuthenticator] = useState(false);

  const [getTfaEmailCode] = useGetTFAEmailCodeMutation();

  const token = useSelector(state => state.auth.user.token);

  const handleCodeChange = (text, index) => {
    if (!/^[a-zA-Z0-9]*$/.test(text)) return;

    const newCode = verificationCode.split('');
    newCode[index] = text.toUpperCase();
    setVerificationCode(newCode.join(''));

    if (text && index < 9) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = index => {
    if (index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const dispatch = useDispatch();

  //Main

  const bottomSheetRef = useRef(null);

  const homeBottomSheetVisibility = useSelector(state => state.hideShow.visibility.verficationScreen);
  // const homeBottomSheetVisibility = 1

  const snapPoints = useMemo(() => ['40%', '50%', '60%'], []);

  const handleSheetChanges = useCallback(index => {
    if (index === -1) {
      dispatch(toggleVerficationScreen({ show: -1 }));
    }
  }, []);

  const onBackPress = () => {
    if (bottomSheetRef !== null) {
      bottomSheetRef.current?.close();

      return true;
    }
  };

  const handlePresentModalPress = useCallback(() => {
    if (bottomSheetRef.current) {
      bottomSheetRef.current?.present();
    }
  }, []);

  useEffect(() => {
    if (bottomSheetRef.current !== null) {
      if (homeBottomSheetVisibility === -1) {
        bottomSheetRef.current.close();
        console.log('Closing');
      } else {
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

        return () => {
          subscription.remove();
        };
      }
    }
  }, [homeBottomSheetVisibility]);

  useEffect(() => {
    if (homeBottomSheetVisibility === 1) {
      handlePresentModalPress();
    }
  }, [homeBottomSheetVisibility]);

  const renderBackdrop = useCallback(props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={1} />, []);

  //Main finish

  useEffect(() => {
    if (type === false && authToken) {
      setViaAuthenticator(true);
    } else {
      setViaAuthenticator(false);
    }
  }, [type, authToken]);

  const handleVerification = async () => {
    //Here type means email is true that comes from backend to login page which im sending from login page;

    console.log(type, authToken, '()())(()');

    if (type && authToken) {
      try {
        let { data: serverResponse } = await axios.post(
          `https://api.fahdu.com/api/TFA/login`,
          {
            authToken,
            code: verificationCode,
            type: 'email',
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );

        console.log(serverResponse, '::::::');

        dispatch(toggleVerficationScreen({ show: -1 }));

        await afterLoginProcess(serverResponse);
      } catch (e) {
        console.log('Email verification Error', e);
        console.log(e?.message);
        if (e?.message?.search('failed') >= 0) {
          LoginPageErrors('Please check your code and try again');
        }
      }
    } else {
      try {
        console.log('Verification via Authenticator');

        let { data: serverResponse, status } = await axios.post(
          `https://api.fahdu.com/api/TFA/login`,
          {
            authToken,
            code: verificationCode,
            type: '3rdparty',
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );

        console.log(status);

        if (serverResponse?.statusCode === 200) {
          dispatch(toggleVerficationScreen({ show: -1 }));

          await afterLoginProcess(serverResponse);
        }
      } catch (e) {
        console.log(e?.message);
        if (e?.message?.search('failed') >= 0) {
          LoginPageErrors('Please check your code and try again');
        }
      }
    }
  };

  return (
    <BottomSheetModal
      keyboardBlurBehavior="restore"
      name="HOmeBottom"
      backdropComponent={renderBackdrop}
      ref={bottomSheetRef}
      index={homeBottomSheetVisibility === 1 ? 0 : -1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      enableDynamicSizing={false}
      backgroundStyle={{ backgroundColor: '#fffef9' }}>
      <View style={{ width: '100%', height: '100%' }}>
        <View style={[styles.modalInnerWrapper]}>
          <View style={styles.headerContainer}>
            <Text style={styles.heading}>Security Check</Text>
          </View>
          <Text style={styles.subtext}>Enter the security code we just sent on your email address.</Text>

          <View style={styles.tipContainer}>
            <View style={styles.tipCounterContainer}>
              <View style={styles.sendTipInputContainer}>
                {/* <TextInput style={styles.amountInput} value={verificationCode} onChangeText={(x) => setVerificationCode(x)} keyboardType="email-address" /> */}

                <View style={styles.codeInputWrapper}>
                  {[...Array(9)].map((_, index) => (
                    <TextInput
                      key={index}
                      ref={ref => (inputRefs.current[index] = ref)}
                      value={verificationCode[index] || ''}
                      onChangeText={text => handleCodeChange(text, index)}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === 'Backspace' && verificationCode[index] === '') {
                          handleBackspace(index);
                        }
                      }}
                      maxLength={1}
                      autoCapitalize="characters"
                      keyboardType="default"
                      style={[styles.codeBox, verificationCode[index] ? styles.codeBoxFilled : null]}
                      selectionColor={selectionTwin()}
                      selectionHandleColor={'#ffa86b'}
                      cursorColor={'#1e1e1e'}
                      placeholderTextColor="#B2B2B2"
                    />
                  ))}
                </View>
              </View>
            </View>

            {/* <Text style={styles.fahduCoinTextTitle}>Enter security code sent to <Text style={{ fontFamily: 'MabryPro-Medium', color: 'black' }}>{viaAuthenticator ? "Authenticator App" : "Email"}</Text></Text> */}

            {/* {viaAuthenticator ? (
              <TouchableOpacity onPress={() => handleEmailInstead()}>
                <Text style={[styles.fahduCoinTextTitle, { color: "#ffa07a", fontFamily: "MabryPro-Bold", marginVertical: responsiveWidth(0) }]}>Get code on Email</Text>
              </TouchableOpacity>
            ) : null} */}

            {/* <View style={{ position: "relative", alignSelf: "center" }}>

              <Pressable onPress={() => handleVerification()}>{!loading ? <Text style={[styles.loginButton]}>VERIFY</Text> : <ActivityIndicator size={"small"} color={"#282828"} style={styles.loginButton} />}</Pressable>
            </View> */}

            <AnimatedButton title={'Verify'} buttonMargin={0} onPress={handleVerification} loading={loading} disabled={loading} />

            <TouchableOpacity style={styles.alreadyAccountContainer} onPress={() => openInbox()}>
              <View style={styles.alreadyAccountRow}>
                <Text style={styles.forgotTextTitle}>Open Mail App</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  modalInnerWrapper: {
    width: responsiveWidth(99),
    backgroundColor: '#fffdf6',
    alignSelf: 'center',
    borderTopLeftRadius: responsiveWidth(3),
    borderTopRightRadius: responsiveWidth(3),
    padding: responsiveWidth(4),
    paddingHorizontal: responsiveWidth(4),
    marginLeft: responsiveWidth(1),
  },

  notch: {
    borderTopColor: '#000',
    borderTopWidth: responsiveWidth(0.8),
    width: responsiveWidth(10),
    borderRadius: responsiveWidth(1),
  },
  sendTipText: {
    textAlign: 'center',
    fontFamily: 'Lexend-Bold',
    color: '#ffa07a',
    fontSize: responsiveFontSize(3),
    marginTop: responsiveWidth(5),
  },
  loginButton: {
    paddingHorizontal: responsiveWidth(2),
    backgroundColor: '#ffa07a',
    borderRadius: responsiveWidth(2),
    color: '#282828',
    textAlign: 'center',
    fontFamily: 'MabryPro-Bold',
    elevation: 1,
    fontWeight: '600',
    width: responsiveWidth(32),
    height: responsiveWidth(10),
    textAlignVertical: 'center',
    alignSelf: 'center',
    borderTopColor: '#282828',
    borderLeftColor: '#282828',
    elevation: 1,
    fontSize: responsiveFontSize(2.4),
    padding: padios(responsiveWidth(2.6)),
    overflow: 'hidden',
    marginTop: responsiveWidth(4),
  },

  fahduCoinTextTitle: {
    fontFamily: 'MabryPro-Regular',
    fontSize: responsiveFontSize(1.8),
    color: '#282828',
    textAlign: 'center',
    marginVertical: responsiveWidth(2),

    textAlignVertical: 'center',
  },
  tipContainer: {
    marginTop: responsiveWidth(1),
    width: responsiveWidth(85),
  },
  tipCounterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: responsiveWidth(4),
  },
  plusMinusButton: {
    borderWidth: 1,
    height: responsiveWidth(8),
    width: responsiveWidth(8),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: responsiveWidth(12),
    borderColor: '#282828',
  },
  sendTipInputContainer: {
    // borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    borderRadius: responsiveWidth(2),
    borderColor: '#282828',
    overflow: 'hidden',
    padding: responsiveWidth(1),
  },
  amountInput: {
    flexBasis: '90%',
    color: '#282828',
    fontFamily: 'MabryPro-Regular',
    fontSize: responsiveFontSize(2.2),
    textAlign: 'center',
    letterSpacing: responsiveWidth(0.5),
    padding: Platform.OS === 'ios' ? responsiveWidth(4) : null,
    backgroundColor: '#f3f3f3',
    borderRadius: responsiveWidth(2),
  },

  //

  codeInputWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'center',
    marginVertical: responsiveWidth(4),
    gap: responsiveWidth(1),
  },

  codeBox: {
    width: responsiveWidth(8),
    height: responsiveWidth(13),
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#282828',
    textAlign: 'center',
    fontSize: FONT_SIZES['14'],
    fontFamily: 'Rubik-Medium',
    borderRadius: responsiveWidth(2),
    color: '#1e1e1e',
    backgroundColor: '#fff',
  },

  codeBoxFilled: {
    borderColor: '#FFA86B',
    borderRadius: WIDTH_SIZES['8'],
  },

  //new

  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: WIDTH_SIZES['8'],
  },

  heading: {
    fontSize: FONT_SIZES['18'],
    fontFamily: 'Rubik-SemiBold',
    color: '#1e1e1e',
  },
  subtext: {
    fontSize: FONT_SIZES['12'],
    color: '#1e1e1e',
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  closeIcon: {
    padding: 4,
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
export default Authenticator;
