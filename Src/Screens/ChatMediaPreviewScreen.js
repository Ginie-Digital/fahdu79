import {StyleSheet, View, TouchableOpacity, Text, BackHandler, TextInput, ActivityIndicator, LayoutAnimation, Platform, useWindowDimensions, PanResponder, Keyboard, ScrollView, Animated, UIManager} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import RNFS from 'react-native-fs';
import { Image } from 'expo-image';
import React, {useMemo, useCallback, useRef, useState, useEffect} from 'react';
import {responsiveWidth, responsiveHeight} from 'react-native-responsive-dimensions';
import {useDispatch, useSelector} from 'react-redux';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';

import {ChatWindowError, ChatWindowFollowError, LoginPageErrors} from '../Components/ErrorSnacks';
import {updateCacheRoomList} from '../../Redux/Slices/NormalSlices/RoomListSlice';
import {dismissProgressNotification, displayNotificationProgressIndicator} from '../../Notificaton';
import {pushSentMessageResponse} from '../../Redux/Slices/NormalSlices/MessageSlices/ThreadSlices';
import {cropToAspectAndResize, generateVideoThumbnail, getVideoMetadata, videoReducer} from '../../FFMPeg/FFMPegModule';

import {useSendMessageMutation} from '../../Redux/Slices/QuerySlices/roomListSliceApi';
import {setAsPremium, setMediaData} from '../../Redux/Slices/NormalSlices/MessageSlices/ChatWindowPreviewDataSlice';
// Removed react-native-pdf-thumbnail as per user request to avoid new native libraries
import {useFollowUserMutation, useUploadAttachmentMutation} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {FONT_SIZES, selectionTwin} from '../../DesiginData/Utility';
import Paisa from '../../Assets/svg/paisa.svg';
import DIcon from '../../DesiginData/DIcons';
import SendButton from '../Components/SendButton';

const formatIndianNumber = num => {
  if (!num) return '';
  let x = num.toString().replace(/[^0-9]/g, '');
  return Number(x).toLocaleString('en-IN');
};

const ChatMediaPreviewScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const {chatRoomId, name, recipientId, profileImage, role, onlineStatus} = route.params;



  const [uploadAttachment] = useUploadAttachmentMutation();
  const [sendMessage] = useSendMessageMutation();
  const [followUser] = useFollowUserMutation();

  const [mediaPath, setMediaPath] = useState(undefined);
  const [attachmentType, setAttachmentType] = useState(undefined);
  const [amount, setAmount] = useState('');
  const [disableSendButton, setDisableSendButton] = useState(false);
  const [message, setMessage] = useState('');
  const [next, setNext] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [localMessage, setLocalMessage] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const isKeyboardVisibleRef = useRef(false);
  const previewOpacity = useRef(new Animated.Value(0)).current;

  const [inputHeight, setInputHeight] = useState(44);
  const animHeight = useRef(new Animated.Value(44)).current;

  const player = useVideoPlayer(attachmentType === 'video' ? mediaPath : null, player => {
    player.loop = true;
    if (!isPaused) {
      player.play();
    }
  });

  useEffect(() => {
    if (attachmentType === 'video' && mediaPath) {
       player.replace(mediaPath);
    }
  }, [mediaPath, attachmentType]);

  useEffect(() => {
    if (isPaused) {
      player.pause();
    } else {
      player.play();
    }
  }, [isPaused, player]);

  const inputRadius = animHeight.interpolate({
    inputRange: [44, 65, 85, 105],
    outputRange: [36, 30, 24, 14],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    Animated.spring(animHeight, {
      toValue: inputHeight,
      useNativeDriver: false,
      friction: 10,
      tension: 40,
    }).start();
  }, [inputHeight]);

  const handleContentSizeChange = useCallback(
    event => {
      const {height} = event.nativeEvent.contentSize;
      if (Math.abs(height - inputHeight) > 1) {
        requestAnimationFrame(() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setInputHeight(height);
        });
      }
    },
    [inputHeight],
  );

  const {width: screenWidth} = useWindowDimensions();
  const horizontalPadding = responsiveWidth(8);
  const containerWidth = screenWidth - horizontalPadding;
  const fixedMediaHeight = (containerWidth * 5) / 4;

  const messageUpdateTimeout = useRef(null);
  const localMessageRef = useRef('');
  const attachmentInputRef = useRef();

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 50 && isKeyboardVisibleRef.current) {
          Keyboard.dismiss();
        }
      },
    })
  ).current;

  const userRole = useSelector(state => state.auth.user.role);
  const token = useSelector(state => state.auth.user.token);
  const selectedMedia = useSelector(state => state.chatWindowPreviewData.media);
  const isAttachmentPremium = useSelector(state => state.chatWindowPreviewData.premium);
  const isFahduChat = role !== 'creator' && role !== 'user';

  const handleFinalizeAndBack = useCallback(() => {
    setIsPaused(true);
    dispatch(setMediaData({type: 'removeData'}));
    if (isAttachmentPremium) {
      dispatch(setAsPremium());
    }
    navigation.goBack();
  }, [navigation, dispatch, isAttachmentPremium]);

  const onBackPress = useCallback(() => {
    if (next) {
      setNext(false);
      return true;
    }
    handleFinalizeAndBack();
    return true;
  }, [next, handleFinalizeAndBack]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => {
        subscription.remove();
      };
    }, [onBackPress]),
  );

  const handleAttachmentAsPremium = useCallback(
    isFree => {
      if (!next) {
        if (isFree !== isAttachmentPremium) {
          dispatch(setAsPremium());
        }
      }
    },
    [isAttachmentPremium, next, dispatch],
  );

  const updateRoomCache = useCallback(
    messageData => {
      const cachePayload = {
        chatRoomId,
        createdAt: messageData?.createdAt || new Date().toISOString(),
        message: messageData?.message || '',
        hasAttachment: true,
        senderId: messageData?.sender?._id,
        recipientId: recipientId,
        userName: name,
        profileImage: profileImage || '',
        role: role || 'user',
        onlineStatus: onlineStatus,
        unreadCount: 0,
      };
      dispatch(updateCacheRoomList(cachePayload));
    },
    [chatRoomId, name, recipientId, profileImage, role, onlineStatus, dispatch],
  );

  const handleUploadAttachment = useCallback(async () => {
    if (messageUpdateTimeout.current) clearTimeout(messageUpdateTimeout.current);
    const currentMessage = localMessageRef.current ?? '';

    if (isAttachmentPremium === true && (amount < 1 || amount === undefined)) {
      ChatWindowError('You must add atleast 1 coin');
      return;
    }

    if (isAttachmentPremium === true && amount > 50000) {
      ChatWindowError('Set Fee Amount Under 50,000');
      return;
    }

    if (attachmentType === undefined) return;

    displayNotificationProgressIndicator();
    setIsPaused(true);
    setDisableSendButton(true);

    if (attachmentType === 'image') {
      const attachment = {};
      let fileForUpload = selectedMedia?.image?.fileData;
      try {
        const compressedUri = await cropToAspectAndResize(mediaPath);
        if (compressedUri && compressedUri !== mediaPath) {
          fileForUpload = {
            uri: compressedUri.startsWith('file://') ? compressedUri : `file://${compressedUri}`,
            type: 'image/jpeg',
            name: `image_${Date.now()}.jpg`,
          };
        }
      } catch (err) {
        console.warn('PPV: Compression failed', err);
      }

      const formData = new FormData();
      formData.append('keyName', 'message_attachment');
      formData.append('file', fileForUpload);

      uploadAttachment({token, formData}).then(e => {
        if (e?.data?.statusCode === 200) {
          attachment.charge_amount = isAttachmentPremium && amount >= 1 ? amount : 0;
          attachment.format = 'image';
          attachment.is_charagble = isAttachmentPremium && amount >= 1 ? 'true' : 'false';
          attachment.paid_by_reciever = false;
          attachment.preview = selectedMedia?.image?.preview;
          attachment.type = e?.data?.data?.key;
          attachment.url = e?.data?.data?.url;
          attachment.room_id = chatRoomId;

          sendMessage({ token, message: currentMessage, roomId: chatRoomId, attachment }).then(e => {
            if (e?.error) {
              if (e?.error?.data?.message?.search('Follow') >= 0) ChatWindowFollowError(e?.error?.data?.message, followUser, token, name);
              if (e?.error?.data?.message?.search('insufficient') >= 0) LoginPageErrors('Insufficient Balance');
              setDisableSendButton(false);
              return;
            }
            dismissProgressNotification();
            updateRoomCache(e?.data?.data);
            dispatch(pushSentMessageResponse({chatRoomId, sentMessageResponse: e.data.data}));
            handleFinalizeAndBack();
          }).catch(() => {
            LoginPageErrors('There was some error sending the image');
            setDisableSendButton(false);
            dismissProgressNotification();
          });
        } else {
          ChatWindowError('There was error while sending image');
          setDisableSendButton(false);
        }
      }).catch(() => {
        LoginPageErrors('There was some error uploading the image');
        setDisableSendButton(false);
        dismissProgressNotification();
      });
    }

    if (attachmentType === 'pdf') {
        const attachment = {};
        const formData = new FormData();
        formData.append('keyName', 'message_attachment');
        formData.append('file', {
          uri: selectedMedia?.pdf?.fileData?.uri,
          type: selectedMedia?.pdf?.fileData?.type || 'application/pdf',
          name: selectedMedia?.pdf?.fileData?.name || 'document.pdf',
        });
  
        uploadAttachment({token, formData}).then(e => {
          if (e?.data?.statusCode === 200) {
            attachment.charge_amount = isAttachmentPremium && amount >= 1 ? amount : 0;
            attachment.format = 'document';
            attachment.is_charagble = isAttachmentPremium && amount >= 1 ? 'true' : 'false';
            attachment.paid_by_reciever = false;
            attachment.preview = 'assets/icons/pdf.png';
            attachment.type = e?.data?.data?.key;
            attachment.url = e?.data?.data?.url;
            attachment.room_id = chatRoomId;
  
            sendMessage({ token, message: currentMessage, roomId: chatRoomId, attachment }).then(e => {
              if (e?.error) {
                if (e?.error?.data?.message?.search('Follow') >= 0) ChatWindowFollowError(e?.error?.data?.message, followUser, token, name);
                if (e?.error?.data?.message?.search('insufficient') >= 0) LoginPageErrors('Insufficient Balance');
                setDisableSendButton(false);
                return;
              }
              dismissProgressNotification();
              updateRoomCache(e?.data?.data);
              dispatch(pushSentMessageResponse({chatRoomId, sentMessageResponse: e.data.data}));
              handleFinalizeAndBack();
            }).catch(() => {
              LoginPageErrors('There was some error sending the PDF');
              setDisableSendButton(false);
              dismissProgressNotification();
            });
          } else {
            LoginPageErrors('Failed to upload PDF');
            setDisableSendButton(false);
            dismissProgressNotification();
          }
        }).catch(() => {
          LoginPageErrors('There was some error uploading the PDF');
          setDisableSendButton(false);
          dismissProgressNotification();
        });
      }

    if (attachmentType === 'video') {
      const attachment = {};
      async function videoFormatter(uri) {
        let normalizedUri = uri;
        if (Platform.OS === 'android' && uri.startsWith('content://')) {
          try {
            const localPath = `${RNFS.CachesDirectoryPath}/video_ppv_${Date.now()}.mp4`;
            await RNFS.copyFile(uri, localPath);
            normalizedUri = `file://${localPath}`;
          } catch (copyErr) {
            console.error('PPV: Failed to copy video', copyErr);
          }
        }
        let meta = await getVideoMetadata(normalizedUri);
        if (meta?.duration > 300000) {
          LoginPageErrors('Video duration must be less than 5 min.');
          setDisableSendButton(false);
          return null;
        }
        const [thumbnail, compressedVideo] = await Promise.all([
          generateVideoThumbnail(normalizedUri),
          videoReducer(normalizedUri, meta),
        ]);
        return {thumbnail, compressedVideo};
      }

      videoFormatter(mediaPath).then(async result => {
        if (!result) {
          setDisableSendButton(false);
          dismissProgressNotification();
          return;
        }
        const {thumbnail, compressedVideo} = result;
        const formData = new FormData();
        formData.append('keyName', 'video_thumbnail');
        formData.append('file', {uri: thumbnail, type: 'image/jpg', name: 'image.jpg'});

        uploadAttachment({token, formData}).then(e => {
          if (e?.data?.statusCode === 200) {
            let preview = e?.data?.data?.url;
            const formData = new FormData();
            formData.append('keyName', 'message_attachment');
            formData.append('file', {uri: compressedVideo, type: 'video/mp4', name: 'attachmentVideo.mp4'});

            uploadAttachment({token, formData}).then(e => {
              if (e?.data?.statusCode === 200) {
                attachment.charge_amount = isAttachmentPremium && amount >= 1 ? amount : 0;
                attachment.format = 'video';
                attachment.is_charagble = (isAttachmentPremium === true && amount >= 1);
                attachment.paid_by_reciever = false;
                attachment.preview = preview;
                attachment.type = e?.data?.data?.key;
                attachment.url = e?.data?.data?.url;
                attachment.room_id = chatRoomId;

                sendMessage({ token, message: currentMessage, roomId: chatRoomId, attachment }).then(e => {
                  if (e?.error) {
                    if (e?.error?.data?.message?.search('Follow') >= 0) ChatWindowFollowError(e?.error?.data?.message, followUser, token, name);
                    setDisableSendButton(false);
                    dismissProgressNotification();
                    return;
                  }
                  dismissProgressNotification();
                  updateRoomCache(e?.data?.data);
                  dispatch(pushSentMessageResponse({chatRoomId, sentMessageResponse: e.data.data}));
                  handleFinalizeAndBack();
                }).catch(() => {
                  setDisableSendButton(false);
                  dismissProgressNotification();
                });
              } else {
                setDisableSendButton(false);
                dismissProgressNotification();
                LoginPageErrors('There was some error');
              }
            }).catch(() => {
              setDisableSendButton(false);
              dismissProgressNotification();
              LoginPageErrors('There was some error');
            });
          } else {
            setDisableSendButton(false);
            dismissProgressNotification();
            LoginPageErrors('There was some error');
          }
        }).catch(() => {
          setDisableSendButton(false);
          dismissProgressNotification();
          LoginPageErrors('There was some error');
        });
      });
    }
  }, [selectedMedia, attachmentType, amount, isAttachmentPremium, token, mediaPath, chatRoomId, updateRoomCache, dispatch, followUser, name, handleFinalizeAndBack, sendMessage, uploadAttachment]);

  useEffect(() => {
    if (selectedMedia?.image?.fileData) {
      setAttachmentType('image');
      setMediaPath(selectedMedia?.image?.fileData?.uri);
    } else if (selectedMedia?.video?.fileData) {
      setAttachmentType('video');
      setMediaPath(selectedMedia?.video?.fileData?.uri);
    } else if (selectedMedia?.pdf?.fileData) {
      setAttachmentType('pdf');
      // Using a static PDF icon instead of generating a thumbnail to avoid extra native libraries
      setMediaPath(Image.resolveAssetSource(require('../../Assets/Images/pdf-thumbnail.png')).uri);
    }
    setIsPaused(true);
  }, [selectedMedia]);
  
  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      isKeyboardVisibleRef.current = true;
      if (next) {
        setIsKeyboardVisible(true);
        Animated.timing(previewOpacity, { toValue: 0, duration: 250, useNativeDriver: true }).start();
      }
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      isKeyboardVisibleRef.current = false;
      if (next) {
        setIsKeyboardVisible(false);
        Animated.timing(previewOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      }
    });
    if (next && !isKeyboardVisible) previewOpacity.setValue(1);
    else previewOpacity.setValue(0);
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [next]);

  return (
    <View style={[styles.whatsappContainer, {paddingTop: insets.top, paddingBottom: insets.bottom}]}>
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
              <DIcon provider={'AntDesign'} name={'arrowleft'} color="#1e1e1e" size={responsiveWidth(7)} />
            </TouchableOpacity>
            {!next && (
              <Text style={styles.headerTitle}>{attachmentType === 'image' ? 'Image' : attachmentType === 'video' ? 'Video' : 'Document'}</Text>
            )}
          </View>
          {!next && !isFahduChat && (
            <View style={styles.headerToggleRow}>
              <TouchableOpacity disabled={disableSendButton} onPress={() => handleAttachmentAsPremium(false)} style={[styles.headerToggleBtn, !isAttachmentPremium && styles.headerToggleBtnActive]}><Text style={[styles.headerToggleText, !isAttachmentPremium && styles.headerToggleTextActive]}>Free</Text></TouchableOpacity>
              <TouchableOpacity disabled={disableSendButton} onPress={() => handleAttachmentAsPremium(true)} style={[styles.headerToggleBtn, isAttachmentPremium && styles.headerToggleBtnActive]}><Text style={[styles.headerToggleText, isAttachmentPremium && styles.headerToggleTextActive]}>Paid</Text></TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[styles.mediaContainer, next && {paddingVertical: 0, overflow: 'visible'}]} {...(!next || isKeyboardVisible ? panResponder.panHandlers : {})}>
          <View style={[styles.mediaInnerWrapper, attachmentType === 'pdf' && {borderWidth: 1, borderColor: '#1e1e1e'}]}>
            <View style={styles.fullMediaWrapper}>
              {attachmentType !== 'video' ? (
                <Image source={!mediaPath ? require('../../Assets/Images/DefaultPost.jpg') : {uri: mediaPath}} style={styles.fullImage} contentFit="contain" />
              ) : (
                <TouchableOpacity activeOpacity={0.9} onPress={() => setIsPaused(!isPaused)} style={styles.fullMediaWrapper}>
                  <VideoView player={player} style={styles.fullVideo} contentFit="cover" nativeControls={false} />
                  {isPaused && (
                    <View style={styles.playButtonOverlay}>
                      <View style={styles.playIconContainer}><DIcon provider={'AntDesign'} name={'play'} color="#fff" size={responsiveWidth(10)} /></View>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
            
            {!next && attachmentType === 'pdf' && (
              <TouchableOpacity style={styles.pdfReadBtn} onPress={() => navigation.navigate('pdfReader', { url: selectedMedia?.pdf?.fileData?.fileCopyUri || selectedMedia?.pdf?.fileData?.uri })}><Text style={styles.pdfReadText}>Read</Text></TouchableOpacity>
            )}

            {next && (
              <View style={styles.premiumCardOverlay}>
                <View style={styles.premiumCard}>
                  <View style={styles.premiumCardHeader}><Text style={styles.premiumTitle}>Set Chat Fee</Text></View>
                  <Text style={styles.premiumSubTitle}>Earn coins from your premium media</Text>
                  <View style={styles.amountInputContainer}>
                    <View style={styles.titleback}><Text style={styles.titleSetPrice}>Set Price</Text></View>
                    <View style={styles.amountInputInner}>
                      <TextInput 
                        editable={!disableSendButton} 
                        maxLength={9} 
                        keyboardType="number-pad" 
                        style={styles.amountStyle} 
                        value={amount ? formatIndianNumber(amount) : ''} 
                        textAlign="right" 
                        selectionColor={selectionTwin()} 
                        placeholder="0" 
                        placeholderTextColor="#999" 
                        onChangeText={t => {
                          const numericValue = t.replace(/[^0-9]/g, '');
                          setAmount(numericValue);
                        }} 
                        showsVerticalScrollIndicator={false} 
                      />
                      <Paisa width={responsiveWidth(5)} height={responsiveWidth(5)} style={{marginLeft: 5}} />
                    </View>
                  </View>
                  <View style={styles.cardActionRow}>
                    {!disableSendButton && <TouchableOpacity onPress={onBackPress} style={styles.cardBackBtn}><DIcon provider={'AntDesign'} name={'arrowleft'} color="#1E1E1E" size={responsiveWidth(6)} /></TouchableOpacity>}
                    <TouchableOpacity onPress={() => { setIsPaused(true); handleUploadAttachment(); }} disabled={disableSendButton} style={styles.cardSendBtn}>{disableSendButton ? <ActivityIndicator color="#fff" /> : <Text style={styles.cardSendText}>Set & Send</Text>}</TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
          {next && !isKeyboardVisible && message.length > 0 && (
            <Animated.View style={[styles.previewCaptionBox, {opacity: previewOpacity}]}>
              <Text style={styles.previewCaptionLabel}>Message Preview:</Text>
              <ScrollView style={styles.previewScroll} showsVerticalScrollIndicator={false}><Text style={styles.previewCaptionText}>{message}</Text></ScrollView>
            </Animated.View>
          )}
        </View>

        <View style={styles.bottomControls}>
          {!next && (
            <View style={styles.captionContainer}>
              <View style={styles.inputRow}>
                <Animated.View style={[styles.whatsappInputContainer, {borderRadius: inputRadius}]}>
                  <TextInput editable={!disableSendButton} style={styles.whatsappInput} maxLength={250} placeholder="Add a caption..." placeholderTextColor="#B2B2B2" selectionColor={selectionTwin()} multiline={true} showsVerticalScrollIndicator={false} ref={attachmentInputRef} defaultValue={message} onChangeText={text => { const noNewLines = text.replace(/\n/g, ''); setLocalMessage(noNewLines); localMessageRef.current = noNewLines; if (messageUpdateTimeout.current) clearTimeout(messageUpdateTimeout.current); messageUpdateTimeout.current = setTimeout(() => setMessage(noNewLines), 300); }} onContentSizeChange={handleContentSizeChange} returnKeyType="done" />
                </Animated.View>
                <SendButton handleOnclick={() => { if (isAttachmentPremium) { setIsPaused(true); setNext(true); } else { handleUploadAttachment(); } }} disableSendButton={disableSendButton} userRole={userRole} secondUserRole={role} />
              </View>
              <Text style={styles.whatsappCharCount}>{`${localMessage.length}/250`}</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  whatsappContainer: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: responsiveWidth(4), height: responsiveWidth(15), zIndex: 10, backgroundColor: '#fff' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backButton: { padding: responsiveWidth(2) },
  headerTitle: { color: '#1e1e1e', fontSize: FONT_SIZES[18], fontFamily: 'Rubik-Medium', marginLeft: responsiveWidth(2) },
  mediaContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: responsiveWidth(4), paddingVertical: responsiveWidth(2), overflow: 'hidden' },
  fullMediaWrapper: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  fullImage: { width: '100%', height: '100%' },
  fullVideo: { width: '100%', height: '100%' },
  mediaInnerWrapper: { width: '100%', aspectRatio: 4 / 5, maxHeight: '100%', borderRadius: 20, overflow: 'hidden', backgroundColor: '#000' },
  bottomControls: { paddingHorizontal: responsiveWidth(4), paddingBottom: responsiveWidth(4) },
  captionContainer: { width: '100%' },
  headerToggleRow: { flexDirection: 'row', backgroundColor: '#F3F3F3', borderRadius: responsiveWidth(6), padding: responsiveWidth(0.8), borderWidth: 1, borderColor: '#E8E8E8', marginRight: responsiveWidth(1) },
  headerToggleBtn: { paddingHorizontal: responsiveWidth(4), paddingVertical: responsiveWidth(1.5), borderRadius: responsiveWidth(5) },
  headerToggleBtnActive: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.1, shadowRadius: 2 },
  headerToggleText: { fontSize: FONT_SIZES[14], fontFamily: 'Rubik-Medium', color: '#999' },
  headerToggleTextActive: { color: '#1e1e1e' },
  playButtonOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },
  playIconContainer: { width: responsiveWidth(18), height: responsiveWidth(18), borderRadius: responsiveWidth(9), backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pdfReadBtn: { position: 'absolute', bottom: 20, right: 20, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  pdfReadText: { color: '#1e1e1e', fontFamily: 'Rubik-Medium' },
  premiumCardOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  premiumCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, width: '100%', alignItems: 'center' },
  premiumCardHeader: { marginBottom: 15 },
  premiumTitle: { fontSize: FONT_SIZES[22], fontFamily: 'Rubik-Bold', color: '#1E1E1E' },
  premiumSubTitle: { fontSize: FONT_SIZES[14], color: '#666', fontFamily: 'Rubik-Regular', marginBottom: 25, textAlign: 'center' },
  amountInputContainer: { width: '100%', marginBottom: 30 },
  titleback: { marginBottom: 8 },
  titleSetPrice: { fontSize: FONT_SIZES[14], fontFamily: 'Rubik-Medium', color: '#1E1E1E' },
  amountInputInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F8F8', borderRadius: 16, paddingHorizontal: 15, height: 56, borderWidth: 1, borderColor: '#EEE' },
  amountStyle: { flex: 1, fontSize: FONT_SIZES[20], fontFamily: 'Rubik-Bold', color: '#1E1E1E', padding: 0 },
  cardActionRow: { flexDirection: 'row', width: '100%', gap: 12 },
  cardBackBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  cardSendBtn: { flex: 1, height: 56, borderRadius: 28, backgroundColor: '#1E1E1E', justifyContent: 'center', alignItems: 'center' },
  cardSendText: { color: '#FFF', fontSize: FONT_SIZES[16], fontFamily: 'Rubik-Bold' },
  previewCaptionBox: { position: 'absolute', top: -100, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.95)', padding: 15, borderRadius: 15, maxHeight: 80, elevation: 5 },
  previewCaptionLabel: { fontSize: 10, color: '#999', fontFamily: 'Rubik-Medium', marginBottom: 4 },
  previewScroll: { flex: 1 },
  previewCaptionText: { fontSize: 13, color: '#1E1E1E', fontFamily: 'Rubik-Regular' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  whatsappInputContainer: { flex: 1, backgroundColor: '#F0F0F0', paddingHorizontal: 16, paddingVertical: 8, minHeight: 44, maxHeight: 120, justifyContent: 'center' },
  whatsappInput: { color: '#1E1E1E', fontSize: 16, fontFamily: 'Rubik-Regular', padding: 0, textAlignVertical: 'center' },
  whatsappCharCount: { fontSize: 10, color: '#999', alignSelf: 'flex-end', marginTop: 4, marginRight: 60 }
});

export default ChatMediaPreviewScreen;
