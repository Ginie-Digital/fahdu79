import {StyleSheet, Text, View, Animated, TouchableOpacity, FlatList, Image, TextInput, Switch, ToastAndroid, Pressable, ActivityIndicator, Linking, Platform} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import Modal from 'react-native-modal';

import {useSelector, useDispatch} from 'react-redux';

import axios from 'axios';
import DIcon from '../../../DesiginData/DIcons';
import {
  useDisableMailTwoFAMutation,
  useDisableThirdPartyAuthMutation,
  useGetDisableMailTFACodeMutation,
  useGetTFACodeMutation,
  useGetTFAEmailCodeMutation,
  useResendCodeTFAMutation,
  useValidateTFAAuthMutation,
  useValidateTFAMutation,
} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {toggleAuthenticatorVia, toggleDisableAuthModal, toggleTwoFAAuthCard} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {LoginPageErrors, chatRoomSuccess} from '../ErrorSnacks';
import {navigate} from '../../../Navigation/RootNavigation';
import {FONT_SIZES, padios, selectionTwin, WIDTH_SIZES} from '../../../DesiginData/Utility';
import AnimatedButton from '../AnimatedButton';

const TwoFADisableModal = ({token}) => {
  const inputRefs = React.useRef([]);

  const show = useSelector(state => state.hideShow.visibility.disableAuthModal.show);

  const {email, auth} = useSelector(state => state.hideShow.visibility.authenticatorVia);

  const [loading, setLoading] = useState(false);

  const [next, setNext] = useState(false);

  const [timeNum, setTimeNum] = useState(30);

  const [toggleTimer, setToggleTimer] = useState(false);

  const [verificationCode, setVerificationCode] = useState('');

  const [disableMailTwoFAMutation] = useDisableMailTwoFAMutation();

  const [getDisableMailTFACode] = useGetDisableMailTFACodeMutation();

  const [resendCodeTFAMutation] = useResendCodeTFAMutation();

  const dispatch = useDispatch();

  const handleClose = () => {
    setNext(false);
    setVerificationCode('');
    dispatch(toggleDisableAuthModal({show: false}));
  };

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

  const handleVerification = async () => {

    setLoading(true)

    const {data, error} = await disableMailTwoFAMutation({token, data: {code: verificationCode}});

    if (data?.statusCode === 200) {
      chatRoomSuccess('Disabled 2FA Security');
      setVerificationCode('');
      dispatch(toggleAuthenticatorVia({info: {email: false}}));
      setTimeout(() => {
        dispatch(toggleDisableAuthModal({show: false}));
      }, 500);
    }

    if (error) {
      LoginPageErrors(error?.data?.message);
    }

    setLoading(false)
  };

  const handleRevokation = async () => {
    if (email) {
      const {data, error} = await getDisableMailTFACode({token, send: true});

      console.log(data, error, ':::::::');

      if (data) {
        setNext(true);
      }
    } else {
      setNext(true);
    }
  };

  useEffect(() => {
    if (show) {
      handleRevokation();
    }
  }, [show]);



  const handleResendCode = async () => {
    console.log(timeNum);
    if (timeNum === 30) {
      const {data, error} = await resendCodeTFAMutation({token, data: {send: true}});

      console.log(error);

      if (data) {
        chatRoomSuccess('Code sent again, check your mail');
        setToggleTimer(!toggleTimer);
      }
    } else {
      console.log('Get fuck out of here...');
    }
  };

  return (
    <Modal
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      animationInTiming={150}
      animationOutTiming={150}
      transparent={true}
      isVisible={show}
      backdropColor="black"
      useNativeDriver
      avoidKeyboard={true}
      style={{
        margin: 0,
        justifyContent: 'flex-end',
      }}>
      <View style={styles.modalInnerWrapper}>
        <View style={styles.headerContainer}>
          <Text style={styles.heading}>Security Check</Text>
          <TouchableOpacity style={styles.closeIcon} onPress={() => handleClose()}>
            <DIcon provider={'Ionicons'} name="close" size={20} color="black" />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtext}>Enter the security code we just sent on your email address.</Text>

        <View style={styles.tipContainer}>
          <View style={styles.tipCounterContainer}>
            <View style={styles.sendTipInputContainer}>
              <View style={styles.codeInputWrapper}>
                {[...Array(9)].map((_, index) => (
                  <TextInput
                    key={index}
                    ref={ref => (inputRefs.current[index] = ref)}
                    value={verificationCode[index] || ''}
                    onChangeText={text => handleCodeChange(text, index)}
                    onKeyPress={({nativeEvent}) => {
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



          <AnimatedButton title={'Verify'} buttonMargin={0} onPress={handleVerification} loading={loading} disabled={loading} />

          <TouchableOpacity style={styles.alreadyAccountContainer} onPress={() => handleResendCode()}>
            <View style={styles.alreadyAccountRow}>
              <Text style={styles.alreadyAccountText}>Didn’t receive code? </Text>
              <Text style={styles.forgotTextTitle}>Resend</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalInnerWrapper: {
    width: responsiveWidth(99.1),
    backgroundColor: '#fff',
    alignSelf: 'center',
    borderTopLeftRadius: responsiveWidth(3),
    borderTopRightRadius: responsiveWidth(3),
    padding: responsiveWidth(4),
    paddingTop: responsiveWidth(5),
    paddingHorizontal: responsiveWidth(4),
    paddingBottom: Platform.OS === 'ios' ? responsiveWidth(10) : responsiveWidth(6),
    borderWidth: 1,
    borderColor: '#e9e9e9',
  },

  notch: {
    borderTopColor: '#000',
    borderRadius: responsiveWidth(1),
    alignSelf: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
    width: responsiveWidth(26),
    height: responsiveWidth(9),
    textAlignVertical: 'center',
    alignSelf: 'center',
    borderTopColor: '#282828',
    borderLeftColor: '#282828',
    elevation: 1,
    fontSize: responsiveFontSize(2),
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
    alignSelf: 'center',
  },
  tipCounterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: responsiveWidth(4),
    width: '100%',
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

  confirmText: {
    fontFamily: 'MabryPro-Medium',
    color: '#282828',
  },

  level: {
    fontFamily: 'MabryPro-Medium',
    textAlign: 'center',
    color: '#fff',
    backgroundColor: '#FF7A7A',
    alignSelf: 'center',
    padding: responsiveWidth(2),
    borderRadius: responsiveWidth(2),
    marginTop: responsiveWidth(4),
    paddingHorizontal: responsiveWidth(4),
    overflow: 'hidden',
    paddingVertical: Platform.OS === 'ios' ? responsiveWidth(3) : null,
  },

  //ghhjk

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

  //hel

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
});
export default TwoFADisableModal;
