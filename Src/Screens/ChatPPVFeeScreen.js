import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import {useNavigation, useRoute, useFocusEffect} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {responsiveWidth, responsiveFontSize} from 'react-native-responsive-dimensions';
import RNFS from 'react-native-fs';

import {FONT_SIZES, selectionTwin, WIDTH_SIZES} from '../../DesiginData/Utility';
import Paisa from '../../Assets/svg/paisa.svg';
import DIcon from '../../DesiginData/DIcons';
import AnimatedButton from '../Components/AnimatedButton';

import {ChatWindowError, ChatWindowFollowError, LoginPageErrors} from '../Components/ErrorSnacks';
import {updateCacheRoomList} from '../../Redux/Slices/NormalSlices/RoomListSlice';
import {dismissProgressNotification, displayNotificationProgressIndicator} from '../../Notificaton';
import {pushSentMessageResponse} from '../../Redux/Slices/NormalSlices/MessageSlices/ThreadSlices';
import {cropToAspectAndResize, generateVideoThumbnail, getVideoMetadata, videoReducer} from '../../FFMPeg/FFMPegModule';
import {useSendMessageMutation} from '../../Redux/Slices/QuerySlices/roomListSliceApi';
import {setAsPremium, setMediaData} from '../../Redux/Slices/NormalSlices/MessageSlices/ChatWindowPreviewDataSlice';
import {useFollowUserMutation, useUploadAttachmentMutation} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';

const formatIndianNumber = num => {
  if (!num) return '';
  let x = num.toString().replace(/[^0-9]/g, '');
  return Number(x).toLocaleString('en-IN');
};

const ChatPPVFeeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const {chatRoomId, name, recipientId, profileImage, role, onlineStatus, mediaPath, attachmentType, message, popCount} = route.params;

  const [uploadAttachment] = useUploadAttachmentMutation();
  const [sendMessage] = useSendMessageMutation();
  const [followUser] = useFollowUserMutation();

  const [amount, setAmount] = useState('');
  const [disableSendButton, setDisableSendButton] = useState(false);

  const token = useSelector(state => state.auth.user.token);
  const selectedMedia = useSelector(state => state.chatWindowPreviewData.media);
  const isAttachmentPremium = useSelector(state => state.chatWindowPreviewData.premium);

  const handleFinalizeAndBack = useCallback(() => {
    dispatch(setMediaData({type: 'removeData'}));
    if (isAttachmentPremium) {
      dispatch(setAsPremium());
    }
    // Pop back: 2 screens if coming from ChatMediaPreview, 1 otherwise
    navigation.pop(popCount || 1);
  }, [navigation, dispatch, isAttachmentPremium, popCount]);

  const onBackPress = useCallback(() => {
    navigation.goBack();
    return true;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [onBackPress]),
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
    if (!amount || parseInt(amount) < 1) {
      ChatWindowError('You must add atleast 1 coin');
      return;
    }

    if (amount > 50000) {
      ChatWindowError('Set Fee Amount Under 50,000');
      return;
    }

    if (attachmentType === undefined) return;

    Keyboard.dismiss();
    displayNotificationProgressIndicator();
    setDisableSendButton(true);

    const currentMessage = message || '';

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
        console.warn('PPV Fee: Compression failed', err);
      }

      const formData = new FormData();
      formData.append('keyName', 'message_attachment');
      formData.append('file', fileForUpload);

      uploadAttachment({token, formData}).then(e => {
        if (e?.data?.statusCode === 200) {
          attachment.charge_amount = amount >= 1 ? amount : 0;
          attachment.format = 'image';
          attachment.is_charagble = amount >= 1 ? 'true' : 'false';
          attachment.paid_by_reciever = false;
          attachment.preview = selectedMedia?.image?.preview;
          attachment.type = e?.data?.data?.key;
          attachment.url = e?.data?.data?.url;
          attachment.room_id = chatRoomId;

          sendMessage({token, message: currentMessage, roomId: chatRoomId, attachment}).then(e => {
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
          attachment.charge_amount = amount >= 1 ? amount : 0;
          attachment.format = 'document';
          attachment.is_charagble = amount >= 1 ? 'true' : 'false';
          attachment.paid_by_reciever = false;
          attachment.preview = 'assets/icons/pdf.png';
          attachment.type = e?.data?.data?.key;
          attachment.url = e?.data?.data?.url;
          attachment.room_id = chatRoomId;

          sendMessage({token, message: currentMessage, roomId: chatRoomId, attachment}).then(e => {
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
            console.error('PPV Fee: Failed to copy video', copyErr);
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
                attachment.charge_amount = amount >= 1 ? amount : 0;
                attachment.format = 'video';
                attachment.is_charagble = amount >= 1;
                attachment.paid_by_reciever = false;
                attachment.preview = preview;
                attachment.type = e?.data?.data?.key;
                attachment.url = e?.data?.data?.url;
                attachment.room_id = chatRoomId;

                sendMessage({token, message: currentMessage, roomId: chatRoomId, attachment}).then(e => {
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
  }, [selectedMedia, attachmentType, amount, token, mediaPath, chatRoomId, message, updateRoomCache, dispatch, followUser, name, handleFinalizeAndBack, sendMessage, uploadAttachment]);

  return (
    <View style={[styles.container, {paddingTop: insets.top, paddingBottom: insets.bottom}]}>
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
            <DIcon provider={'AntDesign'} name={'arrowleft'} color="#1e1e1e" size={responsiveWidth(6)} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.heading}>Set Chat Fee</Text>
          <Text style={styles.subHeading}>Earn coins from your premium media</Text>

          {/* Price Input */}
          <Text style={styles.setPriceLabel}>Set Price</Text>
          <View style={styles.amountInputContainer}>
            <TextInput
              editable={!disableSendButton}
              maxLength={9}
              keyboardType="number-pad"
              style={styles.amountInput}
              value={amount ? formatIndianNumber(amount) : ''}
              textAlign="left"
              selectionColor={selectionTwin()}
              placeholder="0"
              placeholderTextColor="#999"
              onChangeText={t => {
                const numericValue = t.replace(/[^0-9]/g, '');
                setAmount(numericValue);
              }}
              autoFocus={true}
            />
            <Paisa width={responsiveWidth(5)} height={responsiveWidth(5)} />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={onBackPress} style={styles.backCircle} disabled={disableSendButton}>
              <DIcon provider={'AntDesign'} name={'arrowleft'} color="#1E1E1E" size={responsiveWidth(5.5)} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleUploadAttachment}
              disabled={disableSendButton}
              style={styles.sendButton}>
              {disableSendButton ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Set & Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: responsiveWidth(4),
    height: responsiveWidth(14),
  },
  backButton: {
    padding: responsiveWidth(2),
  },
  content: {
    flex: 1,
    paddingHorizontal: responsiveWidth(8),
    paddingTop: responsiveWidth(8),
  },
  heading: {
    fontSize: FONT_SIZES[24] || responsiveFontSize(3),
    fontFamily: 'Rubik-Bold',
    color: '#1E1E1E',
    marginBottom: 8,
  },
  subHeading: {
    fontSize: FONT_SIZES[14],
    fontFamily: 'Rubik-Regular',
    color: '#666',
    marginBottom: responsiveWidth(10),
  },
  setPriceLabel: {
    fontSize: FONT_SIZES[14],
    fontFamily: 'Rubik-Medium',
    color: '#1E1E1E',
    marginBottom: 10,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 60,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: responsiveWidth(10),
  },
  amountInput: {
    flex: 1,
    fontSize: FONT_SIZES[22] || responsiveFontSize(2.5),
    fontFamily: 'Rubik-Bold',
    color: '#1E1E1E',
    padding: 0,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  backCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: FONT_SIZES[16],
    fontFamily: 'Rubik-Bold',
  },
});

export default ChatPPVFeeScreen;
