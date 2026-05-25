import {StyleSheet, View, TextInput, TouchableOpacity, Keyboard, ActivityIndicator, Platform, Linking, Pressable, Text, Animated, LayoutAnimation, UIManager} from 'react-native';
import DIcon from '../../../DesiginData/DIcons';
import React, {useEffect, useState, useCallback, useLayoutEffect, useRef} from 'react';

import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import {useDispatch, useSelector} from 'react-redux';
import {toggleCallMethodSelector, toggleCallPriceModal, toggleCallRequestModal, toggleChatWindowClipModal, toggleChatWindowTipModal, toggleAttachmentMediaLoading, toggleChatWindowPreviewSheet} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {selectMediaImage, selectMediaVideo, selectDocument, afterImageClipSelected} from './ChatWindowClipModal';
import {setMediaData} from '../../../Redux/Slices/NormalSlices/MessageSlices/ChatWindowPreviewDataSlice';
import {FONT_SIZES, nTwins, selectionTwin, twins, WIDTH_SIZES} from '../../../DesiginData/Utility';
import {callMethodSelectorList} from '../../../DesiginData/Data';

import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import Clip from '../../../Assets/svg/clip.svg';
import Cam from '../../../Assets/svg/chatCam.svg';
import Paisa from '../../../Assets/svg/paisa.svg';
import {Image} from 'expo-image';
import SendButton from '../SendButton';
import dayjs from 'dayjs';
import socketServices from '../../../SocketServices';
import {navigate} from '../../../Navigation/RootNavigation';
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

// Popup styles removed since we are going inline now


const ChatWindowInput = ({doRaisedRequest, show, onChangeText, onButtonSendButtonClick, disableSendButton, roomId, userId, otherUserId, name, profileImageUrl, role, onlineStatus}) => {

  const insets = useSafeAreaInsets();
  const typingTimerRef = useRef(null);
  const [isKeyboardShown, setIsKeyboardShown] = useState(false);
  const [isCallMode, setIsCallMode] = useState(false);
  const [isAttachmentMode, setIsAttachmentMode] = useState(false);

  useEffect(() => {
    console.log(disableSendButton, 'DSBLSNDBTN');
  }, [disableSendButton]);

  const userRole = useSelector(state => state.auth.user.role);
  const secondUserRole = useSelector(state => state.secondUser.screen.role);

  const dispatch = useDispatch();
  const handleOpenCallRequestModal = () => dispatch(toggleCallRequestModal({show: true}));

  const [value, setValue] = useState('');
  const [inputHeight, setInputHeight] = useState(44);
  const animHeight = useRef(new Animated.Value(44)).current;

  // Continuous Interpolation: 
  // Map absolute height to specific radius values for an "unnoticeable" morph.
  const inputRadius = animHeight.interpolate({
    inputRange: [44, 65, 85, 105], // 1 line, 2 lines, 3 lines, 4+ lines
    outputRange: [36, 30, 24, 14],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    Animated.spring(animHeight, {
      toValue: inputHeight,
      useNativeDriver: false,
      friction: 10,  // Slightly more damping for "unnoticeable" feel
      tension: 40,
    }).start();
  }, [inputHeight]);

  const handleContentSizeChange = useCallback(
    event => {
      const {height} = event.nativeEvent.contentSize;
      if (height !== inputHeight) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setInputHeight(height);
      }
    },
    [inputHeight],
  );

  const handleTextChange = useCallback(
    v => {
      setValue(v);
      onChangeText(v);

      if (v.length > 0 && (isCallMode || isAttachmentMode)) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsCallMode(false);
        setIsAttachmentMode(false);
      }

      // Emit typing indicator
      if (v.length > 0) {
        socketServices.emitTyping(roomId, userId);

        // Clear previous timer
        if (typingTimerRef.current) {
          clearTimeout(typingTimerRef.current);
        }

        // Stop typing after 2 seconds of no typing
        typingTimerRef.current = setTimeout(() => {
          socketServices.emitStopTyping(roomId, userId);
        }, 2000);
      } else {
        socketServices.emitStopTyping(roomId, userId);
      }
    },
    [roomId, userId, isCallMode, isAttachmentMode],
  );

  const handleOnclick = useCallback(() => {
    onButtonSendButtonClick();
    setValue('');
    // Stop typing when message is sent
    socketServices.emitStopTyping(roomId, userId);
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
  }, [roomId, userId]);

  const handleClipClick = useCallback(() => {
    ReactNativeHapticFeedback.trigger("impactLight", hapticOptions);
    dispatch(toggleChatWindowClipModal({show: true}));
  });

  const sendTipHandler = () => {
    Keyboard.dismiss();
    ReactNativeHapticFeedback.trigger("impactMedium", hapticOptions);
    dispatch(toggleChatWindowTipModal());
  };



  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyBoardShown = Keyboard.addListener(showEvent, () => {
      setIsKeyboardShown(true);
    });

    const keyBoardHide = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardShown(false);
    });

    return () => {
      keyBoardShown.remove();
      keyBoardHide.remove();
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  const handleOpenClip = () => {
    ReactNativeHapticFeedback.trigger("impactLight", hapticOptions);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsAttachmentMode(!isAttachmentMode);
    if (isCallMode) setIsCallMode(false);
  };

  const handleAttachmentSelect = (id) => {
    ReactNativeHapticFeedback.trigger("impactLight", hapticOptions);

    if (id === 1) {
      console.log('Selected Gallery 🖼️');
      selectMediaImage('photo').then(e => {
        if (e?.didCancel !== true) {
          console.log('🖼️ File selected');
          dispatch(setMediaData({type: 1, mediaImageInfoSet: e}));
          setIsAttachmentMode(false);
          navigate('ChatMediaPreview', {
            chatRoomId: roomId,
            name: name,
            recipientId: otherUserId,
            profileImage: profileImageUrl,
            role: role,
            onlineStatus: onlineStatus,
          });
        } else {
          console.log('🖼️ No media selected');
          setIsAttachmentMode(false);
        }
      }).catch(err => {
        console.log('Gallery Error:', err);
        setIsAttachmentMode(false);
      });
    } else if (id === 2) {
      console.log('Selected Video 🎥');
      selectMediaVideo().then(e => {
        if (e) {
          dispatch(toggleAttachmentMediaLoading({show: true}));
          dispatch(setMediaData({type: 2, fileData: e?.assets[0]}));
          setIsAttachmentMode(false);
          navigate('ChatMediaPreview', {
            chatRoomId: roomId,
            name: name,
            recipientId: otherUserId,
            profileImage: profileImageUrl,
            role: role,
            onlineStatus: onlineStatus,
          });
          setTimeout(() => dispatch(toggleAttachmentMediaLoading({show: false})), 500);
        } else {
          console.log('📁 No Video file selected');
          setIsAttachmentMode(false);
        }
      }).catch(err => {
        console.log('Video Error:', err);
        setIsAttachmentMode(false);
      });
    } else if (id === 3) {
      console.log('Selected Document 📝');
      selectDocument().then(e => {
        if (e) {
          dispatch(toggleAttachmentMediaLoading({show: true}));
          console.log('📁 Selected file ', e);
          dispatch(setMediaData({type: 3, fileData: e}));
          setIsAttachmentMode(false);
          navigate('ChatMediaPreview', {
            chatRoomId: roomId,
            name: name,
            recipientId: otherUserId,
            profileImage: profileImageUrl,
            role: role,
            onlineStatus: onlineStatus,
          });
          setTimeout(() => dispatch(toggleAttachmentMediaLoading({show: false})), 500);
        } else {
          console.log('📁 No file selected');
          setIsAttachmentMode(false);
        }
      }).catch(err => {
        console.log('Document Error:', err);
        setIsAttachmentMode(false);
      });
    }
  };

  const handleOpenCalling = () => {
    ReactNativeHapticFeedback.trigger("impactLight", hapticOptions);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCallMode(!isCallMode);
    if (isAttachmentMode) setIsAttachmentMode(false);
  };

  const handleCallSelect = (type) => {
    ReactNativeHapticFeedback.trigger("impactLight", hapticOptions);
    setIsCallMode(false);
    navigate('SelectDuration', { callType: type === 'audio' ? 'Audio' : 'Video', userId: otherUserId, roomId: roomId });
  };

  function ShadowBox({children, style}) {
    if (doRaisedRequest && Object.keys(doRaisedRequest).length > 0 && show) {
      return (
        <TouchableOpacity onPress={() => handleOpenCallRequestModal()} style={[styles.box, style]}>
          {children}
        </TouchableOpacity>
      );
    }
    return null;
  }

  return (
    <>
      <View style={[styles.chatInputContainer, { paddingBottom: isKeyboardShown ? 4 : Math.max(insets.bottom, 16) }]}>
        {/* Attachment / Clip icon - acts as toggle */}
        {(userRole === 'creator' || secondUserRole === 'admin') && (
          <TouchableOpacity style={styles.iconButton} onPress={handleOpenClip}>
            {isAttachmentMode ? (
              <DIcon provider={'Entypo'} name={'cross'} size={24} color={'#000'} />
            ) : (
              <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/messageClip.png')} contentFit="contain" style={{width: 24, height: 24}} />
            )}
          </TouchableOpacity>
        )}

        {/* Text input pill */}
        <Animated.View style={[styles.textInputPill, {borderRadius: inputRadius}]}>
          <TextInput
            selectionColor={selectionTwin()}
            selectionHandleColor={'#ffa86b'}
            cursorColor={'#1e1e1e'}
            placeholderTextColor="#B2B2B2"
            placeholder={isCallMode || isAttachmentMode ? 'Type...' : 'Type Something..'}
            style={[
              styles.textInput, 
              Platform.OS === 'ios' ? {fontSize: responsiveFontSize(1.8)} : {},
              (isCallMode || isAttachmentMode) && {maxHeight: 44} // Keep height stable
            ]}
            multiline
            showsVerticalScrollIndicator={false}
            keyboardAppearance="light"
            onFocus={() => {
              if (isCallMode || isAttachmentMode) {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setIsCallMode(false);
                setIsAttachmentMode(false);
              }
            }}
            onChangeText={v => handleTextChange(v)}
            onContentSizeChange={handleContentSizeChange}
            value={value}
            autoCorrect={false}
            maxLength={500}
          />
        </Animated.View>

        {/* Right side action icons */}
        <View style={styles.rightIconsRow}>
          {/* Audio/Video Call Box - Inline */}
          {isCallMode && (
            <View style={styles.inlineCallBox}>
              <Pressable 
                style={styles.inlineCallIconButton} 
                onPress={() => handleCallSelect('video')}
              >
                <Image 
                  cachePolicy="memory-disk" 
                  source={require('../../../Assets/Images/CallRequests/Video.png')} 
                  contentFit="contain" 
                  style={{width: 26, height: 26}} 
                />
              </Pressable>
              <View style={styles.separator} />
              <Pressable 
                style={styles.inlineCallIconButton} 
                onPress={() => handleCallSelect('audio')}
              >
                <Image 
                  cachePolicy="memory-disk" 
                  source={require('../../../Assets/Images/CallRequests/Audio.png')} 
                  contentFit="contain" 
                  style={{width: 21, height: 21}} 
                />
              </Pressable>
            </View>
          )}

          {/* Attachment Box - Inline */}
          {isAttachmentMode && (
            <View style={styles.inlineCallBox}>
              <Pressable 
                style={styles.inlineCallIconButton} 
                onPress={() => handleAttachmentSelect(1)}
              >
                <Image 
                  cachePolicy="memory-disk" 
                  source={require('../../../Assets/Images/ChatWindowClip/gallry.png')} 
                  contentFit="contain" 
                  style={{width: 20, height: 20}} 
                />
              </Pressable>
              <View style={styles.separator} />
              <Pressable 
                style={styles.inlineCallIconButton} 
                onPress={() => handleAttachmentSelect(2)}
              >
                <Image 
                  cachePolicy="memory-disk" 
                  source={require('../../../Assets/Images/ChatWindowClip/video.png')} 
                  contentFit="contain" 
                  style={{width: 20, height: 20}} 
                />
              </Pressable>
              <View style={styles.separator} />
              <Pressable 
                style={styles.inlineCallIconButton} 
                onPress={() => handleAttachmentSelect(3)}
              >
                <Image 
                  cachePolicy="memory-disk" 
                  source={require('../../../Assets/Images/ChatWindowClip/document.png')} 
                  contentFit="contain" 
                  style={{width: 20, height: 20}} 
                />
              </Pressable>
            </View>
          )}

          {/* Tip / Rupee icon */}
          {!isCallMode && !isAttachmentMode && (!value || value.length === 0) && ((userRole === 'creator' && secondUserRole === 'creator') || (userRole !== 'creator' && secondUserRole === 'creator')) ? (
            <Pressable style={styles.iconButton} onPress={() => sendTipHandler()}>
              <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/Coins2.png')} contentFit="contain" style={{width: 22, height: 23}} />
            </Pressable>
          ) : null}

          {/* Send button OR Camera icon */}
          {!isCallMode && !isAttachmentMode && (value?.length > 0 || disableSendButton ? (
            <SendButton handleOnclick={handleOnclick} disableSendButton={disableSendButton} userRole={userRole} secondUserRole={secondUserRole} />
          ) : null)}

          {/* Call icon - acts as toggle */}
          {!isKeyboardShown && !isAttachmentMode && secondUserRole !== 'admin' && secondUserRole === 'creator' && (
            <Pressable style={styles.iconButton} onPress={() => handleOpenCalling()} disabled={disableSendButton}>
              {isCallMode ? (
                <DIcon provider={'Entypo'} name={'cross'} size={24} color={'#000'} />
              ) : (
                <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/chatCall.png')} contentFit="contain" style={{width: 24, height: 24}} />
              )}
            </Pressable>
          )}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 14,
    backgroundColor: '#FFF9F5',
    marginHorizontal: -Math.round(WIDTH_SIZES[24] - 1.1),
  },
  textInputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#1e1e1e',
    borderRadius: 36,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 5,
    minHeight: 44,
    maxHeight: 115, // Limit expansion to ~6 lines
  },
  textInput: {
    flex: 1,
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    fontSize: 14,
    lineHeight: 17,
    padding: 0,
    margin: 0,
    maxHeight: 95, // Sync with pill maxHeight
  },
  rightIconsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
  },
  iconButton: {
    width: 24,
    height: 44, // Increased to match pill height
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineCallBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#1e1e1e',
    borderRadius: 36,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 44,
    gap: 14,
    minWidth: 80, // Ensure enough width for icons
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: '#1e1e1e',
    opacity: 0.2,
  },
  inlineCallIconButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 28,
    height: 28,
    borderRadius: 12,
  },
  box: {
    backgroundColor: '#FFF3EB',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e6e6e6',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#1e1e1e',
  },
});

export default ChatWindowInput;
