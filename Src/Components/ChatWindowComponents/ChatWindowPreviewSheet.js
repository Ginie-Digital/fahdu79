import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Image,
  Pressable,
  BackHandler,
  Vibration,
  ToastAndroid,
  TextInput,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Alert,
} from 'react-native';
import React, {useMemo, useCallback, useRef, useState, useEffect} from 'react';
import {
  responsiveWidth,
  responsiveFontSize,
  responsiveScreenWidth,
} from 'react-native-responsive-dimensions';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import {useDispatch, useSelector} from 'react-redux';
import {
  setPostsCardType,
  toggleChatWindowPreviewSheet,
} from '../../../Redux/Slices/NormalSlices/HideShowSlice';

import {useFocusEffect} from '@react-navigation/native';
import {
  ChatWindowError,
  ChatWindowFollowError,
  LoginPageErrors,
} from '../ErrorSnacks';
import {updateCacheRoomList} from '../../../Redux/Slices/NormalSlices/RoomListSlice';
import {
  dismissProgressNotification,
  displayNotificationProgressIndicator,
} from '../../../Notificaton';
import {pushSentMessageResponse} from '../../../Redux/Slices/NormalSlices/MessageSlices/ThreadSlices';
import {
  generateVideoThumbnail,
  getVideoMetadata,
  videoReducer,
} from '../../../FFMPeg/FFMPegModule';

import {token as memoizedToken} from '../../../Redux/Slices/NormalSlices/AuthSlice';
import {useSendMessageMutation} from '../../../Redux/Slices/QuerySlices/roomListSliceApi';
import {
  setAsPremium,
  setMediaData,
} from '../../../Redux/Slices/NormalSlices/MessageSlices/ChatWindowPreviewDataSlice';

import {
  useFollowUserMutation,
  useUploadAttachmentMutation,
} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {VideoView, useVideoPlayer} from 'expo-video';
import {
  FONT_SIZES,
  nTwins,
  nTwinsFont,
  padios,
  selectionTwin,
  WIDTH_SIZES,
} from '../../../DesiginData/Utility';
import AnimatedButton from '../AnimatedButton';
import Paisa from '../../../Assets/svg/paisa.svg';
import DIcon from '../../../DesiginData/DIcons';

//Main

async function generateThumbnail(docPath) {
  //Removed react native pdf thumbnail
  return '';
}

const ChatWindowPreviewSheet = ({chatRoomId, name}) => {
  const bottomSheetRef = useRef(null);

  const homeBottomSheetVisibility = useSelector(
    state => state.hideShow.visibility.chatWindowPreview,
  );

  const dispatch = useDispatch();

  const handleSheetChanges = useCallback(index => {
    if (index === -1) {
      dispatch(toggleChatWindowPreviewSheet({show: -1}));
    }
  }, []);

  const {height: windowHeight} = useWindowDimensions();
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);

  // Calculate dynamic snap points based on content height
  const snapPoints = useMemo(() => {
    // Add some padding and ensure it doesn't exceed 90% of screen height
    const calculatedHeight = Math.min(contentHeight + 100, windowHeight * 0.9);
    return [calculatedHeight * 0.4, calculatedHeight, calculatedHeight];
  }, [contentHeight, windowHeight]);

  // Measure content height when it changes
  const onContentLayout = useCallback(event => {
    const {height} = event.nativeEvent.layout;
    setContentHeight(height);
  }, []);

  const onBackPress = () => {
    if (bottomSheetRef !== null) {
      bottomSheetRef.current?.close();
      handlePreviewModalClose();
      return true;
    }
  };

  const handlePresentModalPress = useCallback(() => {
    if (bottomSheetRef.current) {
      bottomSheetRef.current?.present();
    }
  }, []);

  useEffect(() => {
    if (homeBottomSheetVisibility === 1) {
      handlePresentModalPress();
    }
  }, [homeBottomSheetVisibility]);

  //!<---------------------Refs--------->

  const attachmentInputRef = React.useRef();

  //!<---------------------States--------->

  const [uploadAttachment] = useUploadAttachmentMutation();

  const [sendMessage] = useSendMessageMutation();

  const [mediaPath, setMediaPath] = useState(undefined);

  const [attachmentType, setAttachmentType] = useState(undefined);

  const [amount, setAmount] = useState(0);

  const [disableSendBtton, setDisableSendButton] = useState(false);

  const [forSubscribers, setForSubscribers] = useState(false);

  const [message, setMessage] = useState('');

  const [next, setNext] = useState(false);

  const [count, setCount] = React.useState(0);

  //!<---------------------Selectors--------->

  const token = useSelector(state => state.auth.user.token);

  const selectedMedia = useSelector(state => state.chatWindowPreviewData.media);

  const isAttachmentPremium = useSelector(
    state => state.chatWindowPreviewData.premium,
  );
  const [followUser] = useFollowUserMutation();

  // Initialize Expo Video Player for preview
  const player = useVideoPlayer(
    mediaPath && attachmentType === 'video' ? mediaPath : null,
    player => {
      if (player && mediaPath && attachmentType === 'video') {
        player.loop = false;
        player.muted = false;
      }
    },
  );

  useEffect(() => {
    if (bottomSheetRef.current !== null) {
      if (homeBottomSheetVisibility === -1) {
        bottomSheetRef.current.close();
        handlePreviewModalClose();
        setNext(false);
        handleAttachmentAsPremium(false);
        setDisableSendButton(false);
        setAmount(0);
        console.log('Closing');
      } else {
        const backHandler = BackHandler.addEventListener(
          'hardwareBackPress',
          onBackPress,
        );

        return () => backHandler.remove(); // Use .remove() instead
      }
    }
  }, [homeBottomSheetVisibility]);

  useFocusEffect(
    useCallback(() => {
      setDisableSendButton(false);
    }, []),
  );

  //!<---------------------Handlers--------->

  const handleAttachmentAsPremium = useCallback(
    isFree => {
      if (!next) {
        if (isFree !== isAttachmentPremium) {
          dispatch(setAsPremium());
        }
      } else {
        console.log('Next is true');
      }
    },
    [isAttachmentPremium, next],
  );

  function handlePreviewModalClose() {
    try {
      dispatch(setMediaData({type: 'removeData'}));
      attachmentInputRef.current.value = '';
      setAttachmentType(undefined);
      setNext(false);
      handleAttachmentAsPremium(false);

      if (isAttachmentPremium) {
        dispatch(setAsPremium());
      }
    } catch (e) {
      console.log('handlePreviewModalClose', e.message);
    }
  }

  const handleAmount = x => {
    setAmount(x);
  };

  const handleUploadAttachment = useCallback(() => {
    console.log('🚀 Handle upload');

    if (isAttachmentPremium === true && (amount < 1 || amount === undefined)) {
      ChatWindowError('You must add atleast 1 coin');
      return 0;
    }

    if (isAttachmentPremium === true && amount > 10000) {
      ChatWindowError('Set Fee Amount Under 10,000');
      return 0;
    }

    displayNotificationProgressIndicator();

    if (attachmentType !== undefined) {
      setDisableSendButton(true);

      if (attachmentType === 'image') {
        const attachment = Object.assign({});
        const formData = new FormData();
        formData.append('keyName', 'message_attachment');
        formData.append('file', selectedMedia?.image?.fileData);

        uploadAttachment({token, formData}).then(e => {
          if (e?.data?.statusCode === 200) {
            attachment.charge_amount =
              isAttachmentPremium && amount >= 1 ? amount : 0;
            attachment.format = 'image';
            attachment.is_charagble =
              isAttachmentPremium && amount >= 1 ? 'true' : 'false';
            attachment.paid_by_reciever = false;
            attachment.preview = selectedMedia?.image?.preview;
            attachment.type = e?.data?.data?.key;
            attachment.url = e?.data?.data?.url;
            attachment.room_id = chatRoomId;

            sendMessage({
              token,
              message: message,
              roomId: chatRoomId,
              attachment,
            })
              .then(e => {
                setDisableSendButton(false);

                if (e?.error?.data?.message?.search('Follow') >= 0) {
                  ChatWindowFollowError(
                    e?.error?.data?.message,
                    followUser,
                    token,
                    name,
                  );
                }

                if (e?.error?.data?.message?.search('insufficient') >= 0) {
                  LoginPageErrors('Insufficient Balance');
                }

                console.log(
                  'Attachemet Image Sent with after message***********',
                  e,
                );
                dismissProgressNotification();
                dispatch(
                  updateCacheRoomList({
                    chatRoomId,
                    createdAt: e?.data?.data?.createdAt,
                    message: '',
                    hasAttachment: true,
                    senderId: e?.data?.data?.sender?._id,
                  }),
                );
                setAmount(undefined);
                setDisableSendButton(false);
                handleAttachmentAsPremium(false);
                setNext(false);

                dispatch(
                  pushSentMessageResponse({
                    chatRoomId,
                    sentMessageResponse: e.data.data,
                  }),
                );
                onBackPress();
              })
              .catch(e =>
                console.log('Uploaded Image attachment After Error', e),
              );
          } else {
            ChatWindowError('There was error while sending image');
            setDisableSendButton(false);
            return 0;
          }
        });
      }

      if (attachmentType === 'pdf') {
        console.log('PDFFFFFFFFF', message);

        const attachment = Object.assign({});
        const formData = new FormData();

        formData.append('keyName', 'message_attachment');
        formData.append('file', selectedMedia?.pdf?.fileData);

        uploadAttachment({token, formData})
          .then(e => {
            if (e?.data?.statusCode === 200) {
              attachment.charge_amount =
                isAttachmentPremium && amount >= 1 ? amount : 0;
              attachment.format = 'document';
              attachment.is_charagble =
                isAttachmentPremium && amount >= 1 ? 'true' : 'false';
              attachment.paid_by_reciever = false;
              attachment.preview = 'assets/icons/pdf.png';
              attachment.type = e?.data?.data?.key;
              attachment.url = e?.data?.data?.url;
              attachment.room_id = chatRoomId;

              sendMessage({
                token,
                message: message ?? '',
                roomId: chatRoomId,
                attachment,
              })
                .then(e => {
                  if (e?.error?.data?.message?.search('Follow') >= 0) {
                    ChatWindowFollowError(
                      e?.error?.data?.message,
                      followUser,
                      token,
                      name,
                    );
                  }

                  if (e?.error?.data?.message?.search('insufficient') >= 0) {
                    LoginPageErrors('Insufficient Balance');
                    setDisableSendButton(false);
                  } else {
                    setDisableSendButton(false);
                  }

                  setDisableSendButton(false);
                  handleAttachmentAsPremium(false);
                  setNext(false);

                  console.log('Attachemet Sent with After message', e);
                  dismissProgressNotification();
                  dispatch(
                    updateCacheRoomList({
                      chatRoomId,
                      createdAt: e?.data?.data?.createdAt,
                      message: '',
                      hasAttachment: true,
                      senderId: e?.data?.data?.sender?._id,
                    }),
                  );
                  setAmount(undefined);
                  setDisableSendButton(false);
                  dispatch(
                    pushSentMessageResponse({
                      chatRoomId,
                      sentMessageResponse: e.data.data,
                    }),
                  );
                  onBackPress();
                })

                .catch(e => console.log('upload attachment After Error', e));
            } else {
              console.log('upload Attachment PDF Error', e);
            }
          })
          .catch(e => console.log('Upload attachment Error', e));
      }

      if (attachmentType === 'video') {
        const attachment = Object.assign({});

        try {
          async function videoFormatter(uri) {
            let meta = await getVideoMetadata(uri);

            if (meta?.duration > 300000) {
              bottomSheetRef.current.close();
              handlePreviewModalClose();
              LoginPageErrors('Video duration must be less than 5 min.');
              setDisableSendButton(false);

              return;
            }

            console.log(meta, ':::META');

            const result = await videoReducer(uri);
            return result;
          }

          videoFormatter(mediaPath).then(async compressedVideoUrl => {
            if (compressedVideoUrl) {
              let compressedVideoThumbnail = await generateVideoThumbnail(
                compressedVideoUrl,
              );

              const formData = new FormData();

              formData.append('keyName', 'video_thumbnail');

              formData.append('file', {
                uri: compressedVideoThumbnail,
                type: 'image/jpg',
                name: 'image.jpg',
              });

              uploadAttachment({token, formData}).then(e => {
                if (e?.data?.statusCode === 200) {
                  let preview = e?.data?.data?.url;

                  const formData = new FormData();

                  formData.append('keyName', 'message_attachment');

                  formData.append('file', {
                    uri: compressedVideoUrl,
                    type: 'video/mp4',
                    name: 'attachmentVideo.mp4',
                  });

                  uploadAttachment({token, formData}).then(e => {
                    console.log('Uploading video to server');
                    if (e?.data?.statusCode === 200) {
                      attachment.charge_amount =
                        isAttachmentPremium && amount >= 1 ? amount : 0;
                      attachment.format = 'video';
                      attachment.is_charagble =
                        isAttachmentPremium && amount >= 1 ? 'true' : 'false';
                      attachment.paid_by_reciever = false;
                      attachment.preview = preview;
                      attachment.type = e?.data?.data?.key;
                      attachment.url = e?.data?.data?.url;
                      attachment.room_id = chatRoomId;

                      console.log(attachment, '()()()()()()()()()()');

                      sendMessage({
                        token,
                        message: message,
                        roomId: chatRoomId,
                        attachment,
                      })
                        .then(e => {
                          if (e?.error?.data?.message?.search('Follow') >= 0) {
                            ChatWindowFollowError(
                              e?.error?.data?.message,
                              followUser,
                              token,
                              name,
                            );
                            setDisableSendButton(false);
                            return;
                          }

                          console.log(
                            'Video Attachemet Sent with After message',
                          );
                          dismissProgressNotification();
                          dispatch(
                            updateCacheRoomList({
                              chatRoomId,
                              createdAt: e?.data?.data?.createdAt,
                              message: '',
                              hasAttachment: true,
                              senderId: e?.data?.data?.sender?._id,
                            }),
                          );
                          setAmount(undefined);
                          setDisableSendButton(false);
                          handleAttachmentAsPremium(false);
                          handleAttachmentAsPremium(false);
                          setNext(false);

                          dispatch(
                            pushSentMessageResponse({
                              chatRoomId,
                              sentMessageResponse: e.data.data,
                            }),
                          );
                          onBackPress();
                        })

                        .catch(e =>
                          console.log('Video upload attachment After Error', e),
                        );
                    } else {
                      console.log('Error while sending video', e);
                      setDisableSendButton(false);
                      LoginPageErrors('There was some error');
                    }
                  });
                } else {
                  console.log('Video thumbnail upload error');
                  setDisableSendButton(false);
                  LoginPageErrors('There was some error');
                }
              });
            }
          });
        } catch (e) {
          console.log('Vide Upload CWPM Error', e);
          setDisableSendButton(false);
        }
      }
    } else {
      console.log('No attachment selected to send');
    }
  }, [selectedMedia, attachmentType, amount, isAttachmentPremium]);

  React.useEffect(() => {
    if (selectedMedia?.image?.fileData) {
      console.log('Preview of image');
      setAttachmentType('image');

      setMediaPath(selectedMedia?.image?.fileData?.uri);
    } else if (selectedMedia?.video?.fileData) {
      console.log('Preview of video');

      setAttachmentType('video');

      setMediaPath(selectedMedia?.video?.fileData?.uri);
    } else if (selectedMedia?.pdf?.fileData) {
      console.log('Preview of pdf');
      setAttachmentType('pdf');

      let pdfUri = selectedMedia?.pdf?.fileData?.uri;

      if (pdfUri) {
        generateThumbnail(pdfUri).then(e => {
          setMediaPath(e);
        });
      }
    } else {
      console.log('No preview to show');
    }
  }, [selectedMedia]);

  const renderBackdrop = useCallback(
    props => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={1}
      />
    ),
    [],
  );

  return (
      <BottomSheetModal
        ref={bottomSheetRef}
        index={homeBottomSheetVisibility === 1 ? 0 : -1}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={true}
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive"
        backgroundStyle={{backgroundColor: '#fffef9'}}>
        <View
          ref={contentRef}
          onLayout={onContentLayout}
          style={styles.contentContainer}>
          {!next ? (
            <Text style={styles.title}>Attach Media</Text>
          ) : (
            <View>
              <Text
                style={{
                  marginLeft: responsiveWidth(3),
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: FONT_SIZES[20],
                  color: '#1E1E1E',
                  marginTop: responsiveWidth(2),
                }}>
                Set Chat Fee
              </Text>
              <Text
                style={{
                  marginLeft: responsiveWidth(3),
                  fontFamily: 'Rubik-Regular',
                  fontSize: FONT_SIZES[12],
                  color: '#1e1e1e',
                  marginTop: responsiveWidth(1),
                }}>
                Create your custom automated message
              </Text>
            </View>
          )}

          {!next && (
            <View style={styles.textInputContainer}>
              <View
                style={[
                  styles.selectImageBox,
                  {flexDirection: 'row', alignItems: 'center'},
                ]}>
                <View style={styles.previewModalImageWrapper}>
                  {attachmentType !== 'video' ? (
                    <Image
                      source={
                        !mediaPath
                          ? require('../../../Assets/Images/Profile.jpg')
                          : {uri: mediaPath}
                      }
                      style={{
                        flex: 1,
                        width: '100%',
                        resizeMode: 'cover',
                        borderRadius: responsiveWidth(4),
                      }}
                      resizeMethod="resize"
                      resizeMode="contain"
                    />
                  ) : (
                    <VideoView
                      player={player}
                      style={{
                        flex: 1,
                        width: '100%',
                        backgroundColor: '#f3f3f3',
                        borderRadius: responsiveWidth(4),
                      }}
                      contentFit="contain"
                      nativeControls={true}
                    />
                  )}
                </View>
              </View>

              <BottomSheetTextInput
                editable={!disableSendBtton}
                style={styles.textInputStyle}
                maxLength={120}
                placeholder="Write caption here..."
                multiline
                ref={attachmentInputRef}
                onChangeText={t => {
                  setCount(t.length);
                  setMessage(t);
                }}
                selectionColor={selectionTwin()}
                selectionHandleColor={'#ffa86b'}
                cursorColor={'#1e1e1e'}
                autoCorrect={false}
                placeholderTextColor="#B2B2B2"
              />
              <Text style={styles.charCount}>{`${count}/120`}</Text>
            </View>
          )}

          {!next && (
            <View
              style={{
                borderWidth: responsiveWidth(0.5),
                borderRadius: responsiveWidth(3.73),
                width: responsiveWidth(80),
                marginTop: 20,
                alignSelf: 'center',
              }}>
              <View style={styles.FollowersSubScribersToggle}>
                <TouchableOpacity
                  onPress={() => handleAttachmentAsPremium(false)}
                  style={[
                    styles.Followers,
                    isAttachmentPremium === false
                      ? {
                          backgroundColor: '#FFA86B',
                          borderWidth: responsiveWidth(0.3),
                          borderRadius: responsiveWidth(2.5),
                        }
                      : null,
                  ]}>
                  <Text
                    style={{
                      fontFamily: 'Rubik-SemiBold',
                      fontSize: FONT_SIZES[14],
                      color: '#282828',
                    }}>
                    Free
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleAttachmentAsPremium(true)}
                  style={[
                    styles.SubScribers,
                    isAttachmentPremium === true
                      ? {
                          backgroundColor: '#FFA86B',
                          borderWidth: responsiveWidth(0.3),
                          borderRadius: responsiveWidth(2.5),
                        }
                      : null,
                  ]}>
                  <Text
                    key={'2SubScribers'}
                    style={{
                      fontFamily: 'Rubik-SemiBold',
                      fontSize: FONT_SIZES[14],
                      color: '#282828',
                    }}>
                    Paid
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {next && (
            <View style={[styles.amountInput]}>
              <View style={{flexDirection: 'row', backgroundColor: 'red'}}>
                <View style={[styles.titleback]}>
                  <Text style={[styles.titleSetPrice]}>Set Price</Text>
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginRight: responsiveWidth(2),
                  gap: Platform.OS == 'ios' ? responsiveWidth(2) : null,
                }}>
                <BottomSheetTextInput
                  maxLength={6}
                  keyboardType="number-pad"
                  style={[
                    {padding: 0, color: '#1e1e1e', fontFamily: 'Rubik-Medium'},
                    styles.amountStyle,
                  ]}
                  value={amount}
                  textAlign="right"
                  selectionColor={selectionTwin()}
                  selectionHandleColor={'#ffa86b'}
                  cursorColor={'#1e1e1e'}
                  placeholderTextColor="#B2B2B2"
                  onChangeText={t => handleAmount(t.replace(/[^0-9]/g, ''))}
                />
                <Paisa />
              </View>
            </View>
          )}

          {isAttachmentPremium ? (
            <View style={styles.buttonContainer}>
              <View style={{flexBasis: '20%'}}>
                <AnimatedButton
                  title={<DIcon provider={'Feather'} name={'chevron-left'} />}
                  showOverlay={false}
                  style={{backgroundColor: 'white'}}
                  onPress={() => setNext(false)}
                  highlightOnPress={true}
                  highlightColor="#FFF3EB"
                />
              </View>

              {next ? (
                <View style={{flexBasis: '76%'}}>
                  <AnimatedButton
                    title={'Send'}
                    showOverlay={false}
                    onPress={() => handleUploadAttachment()}
                    loading={disableSendBtton}
                    disabled={disableSendBtton}
                    highlightOnPress={true}
                    highlightColor="#FFC399"
                  />
                </View>
              ) : (
                <View style={{flexBasis: '76%'}}>
                  <AnimatedButton
                    title={'Next'}
                    showOverlay={false}
                    onPress={() => setNext(true)}
                    highlightOnPress={true}
                    highlightColor="#FFC399"
                  />
                </View>
              )}
            </View>
          ) : (
            <View>
              <AnimatedButton
                showOverlay={false}
                title={'Send'}
                onPress={() => handleUploadAttachment()}
                loading={disableSendBtton}
                disabled={disableSendBtton}
                highlightOnPress={true}
                highlightColor="#FFC399"
              />
            </View>
          )}
        </View>
      </BottomSheetModal>
  );
};

export default ChatWindowPreviewSheet;

const styles = StyleSheet.create({
  contentContainer: {
    backgroundColor: '#fffef9',
    paddingHorizontal: 32,
    paddingBottom: 20,
  },
  previewModalImageWrapper: {
    flexBasis: '100%',
    width: '100%',
  },

  previewModalInput: {
    paddingHorizontal: nTwins(4, 2),
    borderColor: '#282828',
    color: '#353535',
    borderRadius: responsiveWidth(2),
    backgroundColor: 'transparent',
    height: responsiveWidth(20),
    borderWidth: 1,
    fontFamily: 'MabryPro-Regular',
    marginVertical: responsiveWidth(4),
    fontSize: nTwinsFont(1.8, 1.8),
  },

  previewModalSendButton: {
    fontSize: responsiveFontSize(2.2),
    fontWeight: '400',
    color: '#205cd4',
    textAlign: 'right',
    marginLeft: responsiveWidth(10),
  },

  modalSendContainer: {
    flexDirection: 'column',
    alignItems: 'space-around',
    justifyContent: 'center',
    gap: 5,
  },

  freePaidToggleText: {
    fontSize: responsiveFontSize(2.2),
    textAlignVertical: 'center',
  },

  freePaidToggle: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: responsiveWidth(2),
    backgroundColor: 'transparent',
    height: responsiveWidth(12),
    borderColor: '#282828',
  },

  attachFileText: {
    textAlign: 'center',
    fontFamily: 'Lexend-Bold',
    color: '#ffa07a',
    fontSize: responsiveFontSize(2.2),
    marginVertical: responsiveWidth(2),
  },
  free: {
    borderWidth: 1,
    flexBasis: '40%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: responsiveWidth(2),
    borderBottomLeftRadius: responsiveWidth(2),
    backgroundColor: '#fffdf6',
  },
  paid: {
    borderWidth: 1,
    flexBasis: '40%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: responsiveWidth(2),
    borderBottomRightRadius: responsiveWidth(2),
    backgroundColor: '#fffdf6',
  },
  titleSetPrice: {
    fontSize: responsiveFontSize(2),
    flexDirection: 'column',
    backgroundColor: '#e3dff2',
    height: '100%',
    lineHeight: Platform.OS === 'ios' ? 50 : 25,
    borderRadius: responsiveWidth(2),
    textAlign: 'center',
    textAlignVertical: 'center',
    flexBasis: '55%',
    fontFamily: 'MabryPro-Regular',
    overflow: 'hidden',
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

  confirmationView: {
    flexDirection: 'column',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: responsiveWidth(2),
  },
  confirmationViewTextTitle: {
    fontFamily: 'MabryPro-Bold',
  },
  title: {
    fontSize: FONT_SIZES[20],
    fontFamily: 'Rubik-Bold',
    color: '#1e1e1e',
    marginLeft: responsiveWidth(3),
  },

  /* Video */

  textInputContainer: {
    borderWidth: responsiveWidth(0.5),
    marginTop: responsiveWidth(4),
    padding: 13,

    backgroundColor: '#fff',
    borderRadius: responsiveWidth(4),
    height: 275,
    width: responsiveWidth(80),
    alignSelf: 'center',
  },

  selectImageBox: {
    borderWidth: responsiveWidth(0.5),
    // padding: responsiveWidth(4),
    borderRadius: 10,
    borderStyle: 'dashed',
    width: responsiveWidth(72),
    // backgroundColor: 'red',
    height: 147,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },

  textInputStyle: {
    // backgroundColor: 'green',
    width: '100%',
    color: '#1e1e1e',
    paddingLeft: responsiveWidth(2),
    fontFamily: 'Rubik-Regular',
    borderColor: 'red',
    height: responsiveWidth(19),
    textAlignVertical: 'top',
    marginTop: 8,
    fontSize: 14,
  },

  charCount: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.5),
    textAlign: 'right',
    marginRight: responsiveWidth(0.9),
    // backgroundColor : 'red',
    paddingBottom: responsiveWidth(1),
    // marginBottom : responsiveWidth(7)
  },

  FollowersSubScribersToggle: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: responsiveWidth(2.8),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: responsiveWidth(2),
    // backgroundColor: "#f3f3f3",
    height: 54,
    padding: responsiveWidth(1),
    width: '90%',
  },

  Followers: {
    flexBasis: '53%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  SubScribers: {
    flexBasis: '53%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  amountInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderLeftWidth: 1,
    borderColor: '#1e1e1e',
    height: responsiveWidth(12),
    borderWidth: 1,
    alignSelf: 'center',
    marginTop: responsiveWidth(4.3),
    borderRadius: responsiveWidth(3.14),
    width: '92%',
    fontFamily: 'MabryPro-Regular',
    overflow: 'hidden',
  },

  titleback: {
    backgroundColor: '#FFE1CC', // Just for visibility
    paddingHorizontal: 30,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%', // Ensures full height
    alignSelf: 'stretch', // Makes it stretch fully,
    borderRightWidth: 2,
  },
  titleSetPrice: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
  },
  amountStyle: {
    backgroundColor: '#fff',
    width: responsiveWidth(35),
    height: '100%',
    fontFamily: 'Rubik-Medium',
    fontSize: FONT_SIZES[14],
    paddingRight: WIDTH_SIZES[10],
  },
});
