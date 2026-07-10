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
import { triggerImpactHeavy, triggerImpactLight, triggerImpactMedium } from '../../Utils/Haptics';
import { useAppTheme } from '../../Hook/useAppTheme';

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

  const { colors, isDark } = useAppTheme();

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
              { backgroundColor: colors.background, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
            ]}>
            <View style={styles.headerRow}>
              <Text style={[styles.sendTipText, { color: colors.text }]}>Send Tip</Text>
              <TouchableOpacity onPress={() => {
                dispatch(customTipAmount({ amount: 10 }));
                dispatch(toggleLiveStreamTipModal({ info: { roomId: '', show: false } }));
              }}>
                <DIcon provider={'Entypo'} name={'cross'} color={colors.text} size={responsiveFontSize(3.5)} />
              </TouchableOpacity>
            </View>
            <View style={styles.tipContainer}>
              <View style={styles.tipCounterContainer}>
                <View style={[styles.sendTipInputContainer, { borderColor: isDark ? '#212121' : colors.border, backgroundColor: isDark ? '#1C1C1C' : colors.inputBg }]}>
                  {tipAmount >= 0 && tipAmount < 10 && (
                    <Animated.View style={{ position: 'absolute', right: 95, backgroundColor: colors.card, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, transform: [{ translateX: shakeAnimation }] }}>
                      <Text style={{ fontSize: 10, color: colors.accent, fontFamily: 'Rubik-Regular', fontStyle: 'italic' }}>Min is 10</Text>
                    </Animated.View>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Paisa />
                    <TextInput 
                      placeholder="0" 
                      placeholderTextColor={colors.placeholder}
                      maxLength={5} 
                      value={String(tipAmount)} 
                      style={[styles.amountInput, { color: colors.text }]} 
                      onChangeText={x => dispatch(customTipAmount({ amount: x.replace(/[^0-9]/g, '') }))} 
                      keyboardType="numeric" 
                      showsVerticalScrollIndicator={false}
                    />
                  </View>
                  <View style={styles.rightAction}>
                    <TouchableOpacity 
                      style={styles.plusMinusButton} 
                      onPress={() => {
                        dispatch(decreaseTipAmount());
                        triggerImpactHeavy();
                      }}>
                      <View style={[styles.plusMinusButtonInside, { backgroundColor: isDark ? '#212121' : colors.card, borderColor: isDark ? '#292929' : colors.border }]}>
                        <DIcon provider={'Entypo'} name={'minus'} size={18} color={colors.text} />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.plusMinusButton} 
                      onPress={() => {
                        dispatch(increaseTipAmount());
                        triggerImpactHeavy();
                      }}>
                      <View style={[styles.plusMinusButtonInside, { backgroundColor: isDark ? '#FFA86B' : colors.accent, borderColor: isDark ? '#FF7819' : colors.border }]}>
                        <DIcon provider={'Entypo'} name={'plus'} size={18} color={isDark ? '#222124' : '#000000'} />
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: responsiveWidth(4), justifyContent: 'center', width: responsiveWidth(80), alignSelf: 'center' }}>
                {[10, 20, 50].map((amount) => (
                  <Pressable 
                    key={amount} 
                    onPress={() => {
                      dispatch(customTipAmount({ amount }));
                      triggerImpactHeavy();
                    }}
                    style={({pressed}) => ({
                      flexDirection: 'row',
                      gap: 7,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1.5,
                      borderRadius: 36,
                      width: 101.67,
                      height: 49,
                      backgroundColor: tipAmount === amount ? colors.accent : (pressed ? '#1C1C1C80' : '#1C1C1C'),
                      borderColor: tipAmount === amount ? colors.accent : '#212121',
                    })}>
                    <Paisa />
                    <Text style={{ 
                      color: tipAmount === amount ? '#000000' : '#FFFFFF', 
                      fontFamily: 'Rubik-Medium',
                      fontSize: 14,
                      lineHeight: 17,
                    }}>{amount}</Text>
                  </Pressable>
                ))}
              </View>

              <TouchableOpacity 
                disabled={loading} 
                onPress={handleSendTipAmount}
                style={[styles.sendButton, { backgroundColor: colors.accent, borderColor: colors.accentBorder }]}>
                {loading ? (
                  <ActivityIndicator size="small" color="#1E1E1E" />
                ) : (
                  <Text style={styles.sendButtonText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
    );
  }
};

const styles = StyleSheet.create({
  modalInnerWrapper: {
    width: responsiveWidth(100),
    backgroundColor: '#0D0D0D',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    alignItems: 'center',
    alignSelf: 'center',
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
    fontSize: responsiveFontSize(2.3),
  },
  tipContainer: {
    marginTop: responsiveWidth(1),
    width: 329,
  },
  tipCounterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: responsiveWidth(4),
  },
  plusMinusButton: {
    backgroundColor: 'transparent',
    zIndex: 2,
    elevation: 2,
  },
  plusMinusButtonInside: {
    borderWidth: 1.5,
    height: 38,
    width: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  rightAction: {
    width: 83,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  sendTipInputContainer: {
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 329,
    height: 54,
    borderRadius: 14,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 20,
    paddingRight: 8,
    overflow: 'hidden', 
    zIndex: 1,
    elevation: 1,
    alignSelf: 'center',
  },
  amountInput: {
    flex: 1,
    textAlign: 'left',
    fontFamily: 'Rubik-Bold',
    fontSize: 16,
    paddingLeft: 0,
    paddingVertical: 0,
  },
  sendButton: {
    width: 329,
    height: 48,
    borderWidth: 1.5,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: responsiveWidth(6),
  },
  sendButtonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 14,
    lineHeight: 14,
    color: '#1E1E1E',
  },
});
export default LiveStreamTip;
