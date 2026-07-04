import {StyleSheet, Text, View, Animated, TouchableOpacity, Image, TextInput, Platform, Pressable, ActivityIndicator, KeyboardAvoidingView, Dimensions} from 'react-native';
import React, {useCallback, useState, useRef, useMemo, useEffect} from 'react';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {BlurView} from 'expo-blur';
import DIcon from '../../../DesiginData/DIcons';
import {useSelector, useDispatch} from 'react-redux';
import {toggleChatWindowTipModal, toggleShowRechargeModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {increaseTipAmount, decreaseTipAmount, customTipAmount} from '../../../Redux/Slices/NormalSlices/MessageSlices/ChatWindowTipAmountSlice';
import {useSendTipMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {authLogout} from '../../../Redux/Slices/NormalSlices/AuthSlice';
import {deleteCachedMessages, pushSentMessageResponse} from '../../../Redux/Slices/NormalSlices/MessageSlices/ThreadSlices';
import {removeRoomList, updateCacheRoomList} from '../../../Redux/Slices/NormalSlices/RoomListSlice';
import {ChatWindowError} from '../ErrorSnacks';
import {emptyUnreadRoomList} from '../../../Redux/Slices/NormalSlices/UnReadThreadSlice';
import {signOutGoogle} from '../../../OAuth';
import {WIDTH_SIZES} from '../../../DesiginData/Utility';
import Paisa from '../../../Assets/svg/paisa.svg';
import AnimatedButton from '../AnimatedButton';
import {triggerImpactHeavy, triggerImpactLight, triggerSuccess, triggerError} from '../../Utils/Haptics';

const WINDOW_HEIGHT = Dimensions.get('window').height;

const ChatWindowTipModal = ({chatRoomId: propChatRoomId}) => {
  const currentChatRoomId = useSelector(state => state.chatWindowCurrentChattingRoom.data.roomId);
  const chatRoomId = propChatRoomId || currentChatRoomId;

  const [loading, setLoading] = useState(false);
  const showModal = useSelector(state => state.hideShow.visibility.chatWindowTipModal);
  const dispatch = useDispatch();
  const tipAmount = useSelector(state => state.chatWindowTipAmount.data.amount);
  const [sendTip] = useSendTipMutation();
  const token = useSelector(state => state.auth.user.token);
  
  const slideAnim = useRef(new Animated.Value(WINDOW_HEIGHT)).current;
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showModal) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(WINDOW_HEIGHT);
    }
  }, [showModal]);

  const startShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {toValue: 10, duration: 50, useNativeDriver: true}),
      Animated.timing(shakeAnimation, {toValue: -10, duration: 50, useNativeDriver: true}),
      Animated.timing(shakeAnimation, {toValue: 10, duration: 50, useNativeDriver: true}),
      Animated.timing(shakeAnimation, {toValue: 0, duration: 50, useNativeDriver: true}),
    ]).start();
    
    // Strong haptic multiple times for emphasis
    triggerImpactHeavy();
    setTimeout(() => triggerImpactHeavy(), 100);
    setTimeout(() => triggerImpactHeavy(), 200);
  };

  const handleClose = () => {
    triggerImpactLight();
    dispatch(toggleChatWindowTipModal());
    dispatch(customTipAmount({amount: 10}));
  };

  const handleSendTipAmount = () => {
    if (tipAmount >= 10) {
      if (tipAmount <= 100000) {
        setLoading(true);
        sendTip({token, tipAmount, chatRoomId})
          .then(async e => {
            if (e?.error) {
              console.log('💰 [Tip Error]', JSON.stringify(e?.error, null, 2));
              if (e?.error?.status === 401) {
                // Session expired — re-login modal is shown by baseQueryWithReauth
                setLoading(false);
              } else if (e?.error?.data?.status_code === 2044) {
                dispatch(authLogout());
                dispatch(deleteCachedMessages());
                dispatch(removeRoomList());
                dispatch(emptyUnreadRoomList());
                await signOutGoogle();
              } else if (e?.error?.data?.message?.search('insufficient') >= 0) {
                handleClose();
                setTimeout(() => {
                  dispatch(toggleShowRechargeModal({show: true}));
                  setLoading(false);
                }, 500);
              } else {
                ChatWindowError(e?.error?.data?.message || 'There was error while sending tip');
                setLoading(false);
              }
            } else {
              dispatch(updateCacheRoomList({chatRoomId: e?.data?.data?.room_id, createdAt: e?.data?.data?.createdAt, message: e?.data?.data?.message, hasAttachment: false, senderId: e?.data?.data?.sender_id}));
              dispatch(pushSentMessageResponse({chatRoomId: e?.data?.data?.room_id, sentMessageResponse: e?.data?.data}));
              handleClose();
              triggerSuccess();
              setLoading(false);
            }
          })
          .catch(e => {
            ChatWindowError('There was error while sending tip');
            dispatch(customTipAmount({amount: 10}));
            setLoading(false);
          });
      } else {
        ChatWindowError('The max tip amount is 1,00,000');
      }
    } else {
      ChatWindowError('Minimum tip amount is 10');
      startShake();
    }
  };

  if (!showModal) return null;

  return (
    <View style={styles.overlay}>
      <BlurView intensity={15} style={styles.blurBackground} />
      <Pressable style={styles.touchOutside} onPress={handleClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <Animated.View style={[styles.dialog, {transform: [{translateY: slideAnim}]}]}>
          <View style={styles.contentContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.sendTipText}>Send Tip</Text>
              <TouchableOpacity onPress={handleClose}>
                <DIcon provider={'Entypo'} name={'cross'} color={'#000'} size={responsiveFontSize(3.5)} />
              </TouchableOpacity>
            </View>
            <View style={styles.tipContainer}>
              <View style={styles.tipCounterContainer}>
                <View style={styles.sendTipInputContainer}>
                  {tipAmount >= 0 && tipAmount < 10 && (
                    <Animated.View style={{position: 'absolute', right: responsiveWidth(24), backgroundColor: '#EAEAEA', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, transform: [{translateX: shakeAnimation}]}}>
                      <Text style={{fontSize: 10, color: '#666', fontFamily: 'Rubik-Regular', fontStyle: 'italic'}}>Min is 10</Text>
                    </Animated.View>
                  )}
                  <View style={styles.leftAction}>
                    <Paisa />
                  </View>
                  <TextInput 
                    placeholder="0" 
                    maxLength={6} 
                    value={String(tipAmount)} 
                    style={styles.amountInput} 
                    onChangeText={x => {
                      dispatch(customTipAmount({amount: x.replace(/[^0-9]/g, '')}));
                      triggerImpactLight();
                    }} 
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
              <View style={{flexDirection: 'row', gap: responsiveWidth(2.5), marginTop: responsiveWidth(4), justifyContent: 'center', width: responsiveWidth(80), alignSelf: 'center'}}>
                {[10, 20, 50].map(amount => (
                  <Pressable
                    key={amount}
                    onPress={() => {
                      dispatch(customTipAmount({amount}));
                      triggerImpactLight();
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
                    <Text style={{color: 'black'}}>{amount}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={{width: responsiveWidth(78), alignSelf: 'center', marginTop: responsiveWidth(4)}}>
                <AnimatedButton title={'Send'} onPress={handleSendTipAmount} loading={loading} />
              </View>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 9999,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  touchOutside: {
    flex: 1,
  },
  dialog: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#fff',
    width: '100%',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  contentContainer: {
    paddingHorizontal: responsiveWidth(4),
    paddingTop: responsiveWidth(2),
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 28,
  },
  sendTipText: {
    textAlign: 'left',
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
    backgroundColor: '#FFFFFF', // Solid background for masking
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
    backgroundColor: '#FFFFFF', // Ensures no transparency artifacts
    overflow: 'hidden', // Prevents content bleeding
    zIndex: 1,
    elevation: 1,
    alignSelf: 'center',
  },
  amountInput: {
    flex: 1,
    textAlign: 'left',
    color: '#282828',
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(2.2),
    paddingLeft: responsiveWidth(3),
    paddingVertical: Platform.OS === 'ios' ? responsiveWidth(3) : 0,
  },
});

export default ChatWindowTipModal;

