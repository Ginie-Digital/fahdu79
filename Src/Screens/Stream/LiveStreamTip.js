import { StyleSheet, Text, View, TextInput, ActivityIndicator, TouchableOpacity, Image, Pressable, Platform, FlatList, Animated } from 'react-native';
import React, { useState, useRef } from 'react';
import { responsiveFontSize, responsiveWidth } from 'react-native-responsive-dimensions';
import Modal from 'react-native-modal';
import { useSelector, useDispatch } from 'react-redux';
import { useKeyboard } from '@react-native-community/hooks';
import { useNavigationState } from '@react-navigation/native';
import DIcon from '../../../DesiginData/DIcons';
import { customTipAmount, decreaseTipAmount, increaseTipAmount } from '../../../Redux/Slices/NormalSlices/MessageSlices/ChatWindowTipAmountSlice';
import { useLiveStreamTipMutation, useTipForGoalMutation } from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { token as memoizedToken } from '../../../Redux/Slices/NormalSlices/AuthSlice';
import { ChatWindowError, chatRoomSuccess } from '../../Components/ErrorSnacks';
import { autoLogout } from '../../../AutoLogout';
import { FONT_SIZES, padios, WIDTH_SIZES } from '../../../DesiginData/Utility';
import { toggleLiveStreamTipModal } from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import axios from 'axios';
import { updateWallet } from '../../../Redux/Slices/NormalSlices/Wallet/WalletSlice';

import Paisa from '../../../Assets/svg/paisa.svg';
import AnimatedButton from '../../Components/AnimatedButton';
import { triggerImpactHeavy, triggerImpactLight, triggerImpactMedium } from '../../Utils/Haptics';

const LiveStreamTip = () => {
  const keyboard = useKeyboard();
  const token = useSelector(state => state.auth.user.token);
  const [loading, setLoading] = useState(false);

  const modal = useSelector(state => state.hideShow.visibility.liveStreamTipModal);

  const dispatch = useDispatch();

  const tipAmount = useSelector(state => state.chatWindowTipAmount.data.amount);

  const [liveStreamTip] = useLiveStreamTipMutation();

  const [tipForGoal] = useTipForGoalMutation();

  const flashGoals = useSelector(state => state.livechats.data.goals);

  const fetchCoins = async () => {
    try {
      let { data } = await axios.get('https://api.fahdu.in/api/wallet/get-coins', {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      dispatch(updateWallet({ coins: data?.data }));
    } catch (e) {
      console.log('Get Coin Error ', e);
    }
  };

  const shakeAnimation = useRef(new Animated.Value(0)).current;
  
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
        // { amount: 2, title: "Russian", roomId: "83c3a194-ec4a-4842-9049-1490eecd6f26" }
        if (flashGoals?.length > 0) {
          tipForGoal({ token, data: { amount: tipAmount, title: flashGoals[0].title, roomId: modal?.roomId } })
            .then(async e => {
              console.log(e?.error, ':::::::::::', tipAmount);

              if (e?.error?.data?.status_code === 401) {
                autoLogout();
              } else if (e?.error?.data?.message?.search('insufficient') >= 0) {
                ChatWindowError('Insufficient number of coins');
                dispatch(customTipAmount({ amount: 10 }));
                setLoading(false);
              } else {
                dispatch(customTipAmount({ amount: 10 }));
                dispatch(toggleLiveStreamTipModal({ info: { roomId: '', show: false } }));
                setLoading(false);

                setTimeout(() => {
                  chatRoomSuccess(e?.data?.message);
                  fetchCoins();
                }, 500);
                console.log(e?.data);
              }
            })
            .catch(e => {
              console.log('There was error while sending tip', e);
              ChatWindowError('There was error while sending tip');
              dispatch(customTipAmount({ amount: 10 }));
              setLoading(false);
            });
        } else {
          liveStreamTip({ token, data: { amount: tipAmount, roomId: modal?.roomId, type: 'LIVESTREAM' } })
            .then(async e => {
              console.log(e?.error, ':::::::::::', tipAmount);

              if (e?.error?.data?.status_code === 401) {
                autoLogout();
              } else if (e?.error?.data?.message?.search('insufficient') >= 0) {
                ChatWindowError('Insufficient number of coins');
                dispatch(customTipAmount({ amount: 10 }));
                setLoading(false);
              } else {
                dispatch(customTipAmount({ amount: 10 }));
                dispatch(toggleLiveStreamTipModal({ info: { roomId: '', show: false } }));
                setLoading(false);

                setTimeout(() => {
                  chatRoomSuccess(e?.data?.message);
                  fetchCoins();
                }, 500);
                console.log(e?.data);
              }
            })
            .catch(e => {
              console.log('There was error while sending tip', e);
              ChatWindowError('There was error while sending tip');
              dispatch(customTipAmount({ amount: 10 }));
              setLoading(false);
            });
        }
      } else {
        ChatWindowError('The max tip amount is 10,000');
      }
    } else {
      startShake();
    }
  };

  if (modal?.show) {
    return (
        <Modal
          animationIn={'slideInUp'}
          animationOut={'slideOutDown'}
          animationInTiming={150}
          animationOutTiming={150}
          onRequestClose={() => {
            dispatch(customTipAmount({ amount: 10 }));
            dispatch(toggleLiveStreamTipModal({ info: { roomId: '', show: false } }));
          }}
          avoidKeyboard={true}
          transparent={true}
          isVisible={modal?.show}
          backdropColor="#00000060"
          onBackButtonPress={() => {
            dispatch(customTipAmount({ amount: 10 }));
            dispatch(toggleLiveStreamTipModal({ info: { roomId: '', show: false } }));
          }}
          onBackdropPress={() => {
            dispatch(customTipAmount({ amount: 10 }));
            dispatch(toggleLiveStreamTipModal({ info: { roomId: '', show: false } }));
          }}
          style={{
            margin: 0,
            justifyContent: 'flex-end',
          }}>
          <View
            style={[
              styles.modalInnerWrapper,
              { paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
            ]}>
            <View style={styles.headerRow}>
              <Text style={styles.sendTipText}>Send Tip</Text>
              <TouchableOpacity onPress={() => {
                dispatch(customTipAmount({ amount: 10 }));
                dispatch(toggleLiveStreamTipModal({ info: { roomId: '', show: false } }));
              }}>
                <DIcon provider={'Entypo'} name={'cross'} color={'#000'} size={responsiveFontSize(3.5)} />
              </TouchableOpacity>
            </View>
            <View style={styles.tipContainer}>
              <View style={styles.tipCounterContainer}>
                <View style={styles.sendTipInputContainer}>
                  {tipAmount >= 0 && tipAmount < 10 && (
                    <Animated.View style={{ position: 'absolute', right: responsiveWidth(24), backgroundColor: '#EAEAEA', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, transform: [{ translateX: shakeAnimation }] }}>
                      <Text style={{ fontSize: 10, color: '#666', fontFamily: 'Rubik-Regular', fontStyle: 'italic' }}>Min is 10</Text>
                    </Animated.View>
                  )}
                  <View style={styles.leftAction}>
                    <Paisa />
                  </View>
                  <TextInput 
                    placeholder="0" 
                    maxLength={5} 
                    value={String(tipAmount)} 
                    style={styles.amountInput} 
                    onChangeText={x => dispatch(customTipAmount({ amount: x.replace(/[^0-9]/g, '') }))} 
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
                      <View style={[styles.plusMinusButtonInside, {backgroundColor: '#ff6961'}]}>
                        <DIcon provider={'Entypo'} name={'minus'} size={18} />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.plusMinusButton} 
                      onPress={() => {
                        dispatch(increaseTipAmount());
                        triggerImpactHeavy();
                      }}>
                      <View style={[styles.plusMinusButtonInside, {backgroundColor: '#bafca2'}]}>
                        <DIcon provider={'Entypo'} name={'plus'} size={18} />
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: responsiveWidth(2.5), marginTop: responsiveWidth(4), justifyContent: 'center', width: responsiveWidth(80), alignSelf: 'center' }}>
                {[10, 20, 50].map((amount, index) => (
                  <Pressable 
                    key={amount} 
                    onPress={() => {
                      dispatch(customTipAmount({ amount }));
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
                      backgroundColor: pressed ? '#FFA86B' : 'transparent',
                    })}>
                    <Paisa />
                    <Text style={{ color: 'black' }}>{amount}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={{ width: responsiveWidth(78), alignSelf: 'center', marginTop: responsiveWidth(6) }}>
                <AnimatedButton loading={loading} title={'Send'} onPress={handleSendTipAmount} />
              </View>
            </View>
          </View>
        </Modal>
    );
  }
};

const styles = StyleSheet.create({
  modalInnerWrapper: {
    width: responsiveWidth(100),
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    alignItems: 'center',
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
    color: 'black',
    fontSize: responsiveFontSize(2.3),
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
    backgroundColor: '#FFFFFF',
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
    borderColor: '#282828',
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
    borderColor: '#282828',
    height: responsiveWidth(14),
    borderRadius: responsiveWidth(3),
    backgroundColor: '#FFFFFF', 
    overflow: 'hidden', 
    zIndex: 1,
    elevation: 1,
    alignSelf: 'center',
  },
  amountInput: {
    flex: 1,
    textAlign: 'left',
    color: '#282828',
    fontFamily: 'MabryPro-Regular',
    fontSize: responsiveFontSize(2.2),
    paddingLeft: responsiveWidth(3),
    paddingVertical: Platform.OS === 'ios' ? responsiveWidth(3) : 0,
  },
});
export default LiveStreamTip;
