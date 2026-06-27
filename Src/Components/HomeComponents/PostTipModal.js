import {StyleSheet, Text, View, TextInput, ActivityIndicator, TouchableOpacity, Image, Pressable, Platform, Animated, Easing} from 'react-native';
import React, {useState, useRef} from 'react';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import Modal from 'react-native-modal';
import DIcon from '../../../DesiginData/DIcons';
import {useSelector, useDispatch} from 'react-redux';

import {increaseTipAmount, decreaseTipAmount, customTipAmount} from '../../../Redux/Slices/NormalSlices/MessageSlices/ChatWindowTipAmountSlice';
import {useLiveStreamTipMutation, useSendPostTipMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {token as memoizedToken} from '../../../Redux/Slices/NormalSlices/AuthSlice';

import {useKeyboard} from '@react-native-community/hooks';
import {ChatWindowError, LoginPageErrors, chatRoomSuccess} from '../ErrorSnacks';

import {autoLogout} from '../../../AutoLogout';
import {toggleSendPostTipModal, toggleShowRechargeModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {padios, WIDTH_SIZES} from '../../../DesiginData/Utility';
import {useNavigationState} from '@react-navigation/native';
import Paisa from '../../../Assets/svg/paisa.svg';
import AnimatedButton from '../AnimatedButton';
import { triggerImpactHeavy, triggerImpactLight, triggerImpactMedium } from '../../Utils/Haptics';
import { useAppTheme } from '../../Hook/useAppTheme';

const PostTipModal = () => {
  const keyboard = useKeyboard();

  const [loading, setLoading] = useState(false);

  const modal = useSelector(state => state.hideShow.visibility.sendPostTipsModal);

  const dispatch = useDispatch();

  const tipAmount = useSelector(state => state.chatWindowTipAmount.data.amount);

  const [sendPostTip] = useSendPostTipMutation();

  const token = useSelector(state => state.auth.user.token);
  
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const { colors, isDark } = useAppTheme();

  const startShake = () => {
    triggerImpactMedium();
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSendTipAmount = () => {
    if (tipAmount >= 10) {
      if (tipAmount <= 10000) {
        setLoading(true);
        sendPostTip({token, data: {amount: tipAmount, postId: modal?.postId, type: 'POST'}})
          .then(async e => {
            console.log(e?.error, ':::::::::::', tipAmount);

            if (e?.error?.status === 403) {
              LoginPageErrors(e?.error?.data?.message);
              dispatch(customTipAmount({amount: 10}));
              setLoading(false);
              return;
            }

            if (e?.error?.data?.status_code === 2044) {
              autoLogout();
            } else if (e?.error?.data?.message?.search('insufficient') >= 0) {
              dispatch(customTipAmount({amount: 10}));
              dispatch(toggleSendPostTipModal({info: {postId: '', show: false}}));
              dispatch(customTipAmount({amount: 10}));
              setLoading(false);
              setTimeout(() => {
                dispatch(toggleShowRechargeModal({show: true}));
              }, 500);
            } else {
              dispatch(customTipAmount({amount: 10}));
              dispatch(toggleSendPostTipModal({info: {postId: '', show: false}}));
              setLoading(false);

              setTimeout(() => {
                chatRoomSuccess(e?.data?.message);
              }, 500);
              console.log(e?.data);
            }
          })
          .catch(e => {
            console.log('There was error while sending tip', e);
            ChatWindowError('There was error while sending tip');
            dispatch(customTipAmount({amount: 10}));
            setLoading(false);
          });
      } else {
        ChatWindowError('The max tip amount is 10,000');
      }
    } else {
      ChatWindowError('Minimum tip amount is 10');
      startShake();
    }
  };

  return (
    <Modal
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      animationInTiming={150}
      animationOutTiming={150}
      onRequestClose={() => {
        dispatch(customTipAmount({amount: 10}));
        dispatch(toggleSendPostTipModal({info: {postId: '', show: false}}));
      }}
      transparent={true}
      isVisible={!!modal?.show}
      backdropColor="#00000060"
      avoidKeyboard={true}
      onBackButtonPress={() => {
        dispatch(customTipAmount({amount: 10}));
        dispatch(toggleSendPostTipModal({info: {postId: '', show: false}}));
      }}
      onBackdropPress={() => {
        dispatch(customTipAmount({amount: 10}));
        dispatch(toggleSendPostTipModal({info: {postId: '', show: false}}));
      }}
      style={{
        margin: 0,
        justifyContent: 'flex-end',
      }}>
      <View
        style={[
          styles.modalInnerWrapper,
          {backgroundColor: colors.background, paddingBottom: Platform.OS === 'ios' ? 40 : 20},
        ]}>
        <View style={styles.headerRow}>
          <Text style={[styles.sendTipText, {color: colors.text}]}>Send Tip</Text>
          <TouchableOpacity onPress={() => {
          dispatch(customTipAmount({amount: 10}));
            dispatch(toggleSendPostTipModal({info: {postId: '', show: false}}));
          }}>
            <DIcon provider={'Entypo'} name={'cross'} color={colors.text} size={responsiveFontSize(3.5)} />
          </TouchableOpacity>
        </View>
        <View style={styles.tipContainer}>
          <View style={styles.tipCounterContainer}>
            <View style={[styles.sendTipInputContainer, {borderColor: colors.border, backgroundColor: colors.inputBg}]}>
              {tipAmount >= 0 && tipAmount < 10 && (
                <Animated.View style={{position: 'absolute', right: responsiveWidth(24), backgroundColor: colors.card, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, transform: [{translateX: shakeAnimation}]}}>
                <Text style={{fontSize: 10, color: colors.accent, fontFamily: 'Rubik-Regular', fontStyle: 'italic'}}>Min is 10</Text>
                </Animated.View>
              )}
              <View style={styles.leftAction}>
                <Paisa />
              </View>
              <TextInput
                placeholder="0"
                maxLength={5}
                value={String(tipAmount)}
                style={[styles.amountInput, {color: colors.text}]}
                onChangeText={x => dispatch(customTipAmount({amount: x.replace(/[^0-9]/g, '')}))}
                keyboardType="numeric"
                showsVerticalScrollIndicator={false}
              />
              <View style={styles.rightAction}>
                <TouchableOpacity 
                  style={styles.plusMinusButton} 
                  onPress={() => {
                    dispatch(decreaseTipAmount());
                    triggerImpactHeavy();
                  }}>
                  <View style={[styles.plusMinusButtonInside, {backgroundColor: colors.card, borderColor: colors.border}]}>
                    <DIcon provider={'Entypo'} name={'minus'} size={18} color={colors.text} />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.plusMinusButton} 
                  onPress={() => {
                    dispatch(increaseTipAmount());
                    triggerImpactHeavy();
                  }}>
                  <View style={[styles.plusMinusButtonInside, {backgroundColor: colors.accent, borderColor: colors.border}]}>
                    <DIcon provider={'Entypo'} name={'plus'} size={18} color={'#000000'} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={{flexDirection: 'row', gap: responsiveWidth(2.5), marginTop: responsiveWidth(4), justifyContent: 'center', width: responsiveWidth(80), alignSelf: 'center'}}>
            {[10, 20, 50].map(amount => (
              <Pressable
                key={amount}
                onPress={() => {
                  dispatch(customTipAmount({amount}));
                  triggerImpactHeavy();
                }}
                style={({pressed}) => ({
                  flexDirection: 'row',
                  gap: responsiveWidth(2),
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: responsiveWidth(0.3),
                  borderRadius: responsiveWidth(4),
                  padding: responsiveWidth(1),
                  width: responsiveWidth(25),
                  backgroundColor: pressed ? colors.accent : 'transparent',
                  borderColor: colors.border,
                })}
              >
                <Paisa />
                <Text style={{color: colors.text}}>{amount}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{width: responsiveWidth(78), alignSelf: 'center', marginTop: responsiveWidth(6)}}>
            <AnimatedButton onPress={() => handleSendTipAmount()} loading={loading} title={'Send'} isDark={isDark} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalInnerWrapper: {
    width: responsiveWidth(100),
    backgroundColor: '#0D0D0D',
    alignSelf: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    alignItems: 'center',
  },
  previewModalImageWrapper: {
    flexBasis: '35%',
    width: '100%',
  },
  previewModalInputWrapper: {
    flexBasis: '15%',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: responsiveWidth(2),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
    marginBottom: responsiveWidth(2),
  },
  sendTipText: {
    fontFamily: 'Rubik-Bold',
    color: '#FFFFFF',
    fontSize: responsiveFontSize(2.3),
  },
  loginButton: {
    paddingHorizontal: responsiveWidth(2),
    backgroundColor: '#FFA86B',
    borderRadius: responsiveWidth(3),
    color: '#282828',
    textAlign: 'center',
    fontFamily: 'Rubik-Medium',
    // elevation: 1,
    fontWeight: '600',
    width: responsiveWidth(80),
    height: responsiveWidth(12),
    textAlignVertical: 'center',
    alignSelf: 'center',
    borderTopColor: '#282828',
    borderLeftColor: '#282828',
    // elevation: 1,
    fontSize: responsiveFontSize(2),
    borderWidth: responsiveWidth(0.5),
    padding: padios(responsiveWidth(2.6)),
    overflow: 'hidden',
    marginTop: responsiveWidth(4),
  },
  fahduCoinTextTitle: {
    fontFamily: 'MabryPro-Regular',
    fontSize: responsiveFontSize(2.5),
    color: '#282828',
    textAlign: 'center',
    marginVertical: responsiveWidth(2),
  },
  tipContainer: {
    marginTop: responsiveWidth(1),
    width: responsiveWidth(80),
  },
  tipCounterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: responsiveWidth(4),
  },
  plusMinusButton: {
    backgroundColor: '#1A1A1A',
    zIndex: 2,
    elevation: 2,
  },
  plusMinusButtonInside: {
    borderWidth: WIDTH_SIZES[1.5],
    height: responsiveWidth(9),
    width: responsiveWidth(9),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: responsiveWidth(2),
    borderColor: '#2A2A2A',
  },
  leftAction: {
    width: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: responsiveWidth(5),
  },
  rightAction: {
    width: responsiveWidth(25),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: responsiveWidth(1),
  },
  sendTipInputContainer: {
    borderWidth: WIDTH_SIZES[1.5],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: responsiveWidth(80),
    borderColor: '#2A2A2A',
    height: responsiveWidth(14),
    borderRadius: responsiveWidth(3),
    backgroundColor: '#1A1A1A', 
    overflow: 'hidden', 
    zIndex: 1,
    elevation: 1,
    alignSelf: 'center',
  },
  amountInput: {
    flex: 1,
    textAlign: 'left',
    color: '#FFFFFF',
    fontFamily: 'MabryPro-Regular',
    fontSize: responsiveFontSize(2.2),
    paddingLeft: responsiveWidth(3),
    paddingVertical: Platform.OS === 'ios' ? responsiveWidth(3) : 0,
  },
});
export default PostTipModal;
