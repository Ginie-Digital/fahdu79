import { Image, StyleSheet, Text, TouchableOpacity, View, Linking, ImageBackground, Vibration, ToastAndroid, Pressable, Platform, Alert, ActivityIndicator } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import React from 'react';
import { responsiveFontSize, responsiveWidth } from 'react-native-responsive-dimensions';

import Moment from 'react-moment';
import DIcon from '../../../DesiginData/DIcons';
import { useDispatch, useSelector } from 'react-redux';
import { toggleChatWindowFullSizedImageModal, toggleChatWindowPaymentModal, toggleChatWindowVideoModal } from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import { useDeclineCallRequestMutation, useInitiatePaymentMutation, useStartCallMutation } from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';

import { setUnlockPremiumTempData } from '../../../Redux/Slices/NormalSlices/MessageSlices/ChatWindowUnlockPremiumTempDataSlice';

import Clipboard from '@react-native-clipboard/clipboard';

import Hyperlink from 'react-native-hyperlink';
import { navigate } from '../../../Navigation/RootNavigation';
import { FONT_SIZES, isSingleEmoji, WIDTH_SIZES } from '../../../DesiginData/Utility';
import WhatsAppTime from '../WhatsAppTime';
import TippedBadge from '../../Screens/Stream/Comments/TippedBadge';
import { CommonSuccess, LoginPageErrors } from '../ErrorSnacks';
import socketServcies from '../../../SocketServices';
import { AppLog } from '../../../Src/Utils/Logger';
import MicPermissionModal from '../Calling/MicPermissionModal';

const externalPdfLinkingHandler = url => {
  navigate('pdfReader', { url });
};

const handleCopyToClipBoard = text => {
  if (!text) return;

  // 1. Haptic Feedback
  Vibration.vibrate(Platform.OS === 'android' ? 50 : [0]);

  // 2. Copy Action
  Clipboard.setString(text);

  // 3. Visual Feedback
  if (Platform.OS === 'android') {
    ToastAndroid.showWithGravityAndOffset('Copied to clipboard', ToastAndroid.SHORT, ToastAndroid.BOTTOM, 0, 150);
  } else {
    CommonSuccess('Copied to clipboard!');
  }
};

export const useStartCallAction = ({ displayThread, roomId, token, currentUserId }) => {
  const [startCall, { isLoading: isStartingCall }] = useStartCallMutation();
  const [showMicModal, setShowMicModal] = React.useState(false);

  const checkMicAndCamPermission = React.useCallback(async (callType) => {
    try {
      const isVideo = callType === 'video';
      const micPermission = Platform.OS === 'ios' ? PERMISSIONS.IOS.MICROPHONE : PERMISSIONS.ANDROID.RECORD_AUDIO;
      let micStatus = await check(micPermission);

      if (micStatus === RESULTS.DENIED) {
        micStatus = await request(micPermission);
      }

      let camStatus = RESULTS.GRANTED;
      if (isVideo) {
        const camPermission = Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;
        camStatus = await check(camPermission);
        if (camStatus === RESULTS.DENIED) camStatus = await request(camPermission);
      }

      const micGranted = micStatus === RESULTS.GRANTED || micStatus === RESULTS.LIMITED;
      const camGranted = camStatus === RESULTS.GRANTED || camStatus === RESULTS.LIMITED;

      if (!micGranted || (isVideo && !camGranted)) {
        setShowMicModal(true);
        return false;
      }
      return true;
    } catch (error) {
      console.log('⚠️ Mic/Cam permission check error:', error);
      return false;
    }
  }, []);

  const handleStartCallAction = React.useCallback(async () => {
    try {
      const duration = displayThread?.attachment?.duration || displayThread?.callRecord?.duration;
      if (!duration) {
        LoginPageErrors('Call duration is missing. Cannot initiate the call.');
        return;
      }

      const resolvedCallType = displayThread?.callRecord?.type?.toLowerCase() || 'audio';

      // 🔒 Pre-check microphone (and camera) permissions before starting the call
      const hasPermissions = await checkMicAndCamPermission(resolvedCallType);
      if (!hasPermissions) return;

      const payload = {
        roomId: roomId,
        callType: displayThread?.callRecord?.type?.toLowerCase() || 'audio',
        userId: displayThread?.callRecord?.initiator,
      };

      // Check if socket (redis) is connected, if not force connection
      if (!socketServcies.isConnected()) {
        AppLog('SOCKET', 'Socket disconnected when starting call from chat room, forcing reconnection', { roomId });
        socketServcies.initializeSocket(currentUserId, token);
      }

      console.log('Starting Call with Payload:', payload);
      const response = await startCall({ token, data: payload });
      console.log('Start Call Response:', response);

      const isSuccess = response?.data?.statusCode === 200 || response?.data?.success || response?.data?.data?.roomId;

      if (isSuccess) {
        CommonSuccess(response?.data?.message || "Call initiated successfully");
        // Use the OTHER party's profile, not the sender's (which may be ourselves)
        const otherParty = displayThread?.sender_id === currentUserId ? displayThread?.reciever : displayThread?.sender;
        navigate(payload.callType === 'video' ? 'videoCallScreen' : 'callScreen', {
          roomId: roomId,
          name: otherParty?.fullName || otherParty?.displayName,
          callType: payload.callType,
          callerId: currentUserId,
          profileImageUrl: otherParty?.profile_image?.url,
          totalDuration: duration,
        });
      } else {
        const errorMessage = response?.error?.data?.message || response?.error?.message || "Failed to start call";
        LoginPageErrors(errorMessage);
      }
    } catch (error) {
      console.error('Error starting call:', error);
      LoginPageErrors(error?.message || "An unexpected error occurred");
    }
  }, [displayThread, roomId, token, currentUserId, startCall, checkMicAndCamPermission]);

  return { handleStartCallAction, isStartingCall, showMicModal, setShowMicModal };
};

export const LeftChatBubble = ({ displayThread, setFullVideoModalUri, token, chatRoomId: roomId, setFullSizeImageUri, otherUserId }) => {
  const [initiatePayment] = useInitiatePaymentMutation();
  const [declineCallRequest] = useDeclineCallRequestMutation();

  const dispatch = useDispatch();
  const currentUserId = useSelector(state => state.auth.user.currentUserId);

  const callType = displayThread?.callRecord?.type?.toLowerCase() || 'audio';
  const { handleStartCallAction, isStartingCall, showMicModal, setShowMicModal } = useStartCallAction({ displayThread, roomId, token, currentUserId });

  const handleFullScreenVideoModal = React.useCallback(uri => {
    setFullVideoModalUri(uri);
    dispatch(toggleChatWindowVideoModal());
    console.log(uri);
  }, []);

  const handlePremiumPayment = React.useCallback((conversationId, amount) => {
    initiatePayment({ token, conversationId, roomId })
      .then(e => {
        if (e.error.data.message === 'MESSAGE_ATTACHMENT_PAYMENT') {
          console.log(e.error.data.message);
          dispatch(setUnlockPremiumTempData({ conversationId, canPay: true, amount }));
          dispatch(toggleChatWindowPaymentModal());
        } else {
          dispatch(setUnlockPremiumTempData({ conversationId, canPay: false, amount }));
          dispatch(toggleChatWindowPaymentModal());
        }
      })
      .catch(e => {
        console.log('Handle Premium Payment Error', e);
        LoginPageErrors(e?.data?.message || 'Failed to initiate payment');
      });
  }, []);

  const handleImageZoomView = React.useCallback(uri => {
    setFullSizeImageUri(uri);
    dispatch(toggleChatWindowFullSizedImageModal());
  });

  if (displayThread?.attachment?.updateCoin === true) {
    return (
      <View>
        <View style={styles.feeSetupBlock}>
          <Text style={styles.feeSetupText}>{displayThread.message}</Text>
        </View>
        <WhatsAppTime timestamp={displayThread.createdAt} style={styles.timimingTwo} />
      </View>
    );
  }

  if (String(displayThread.attachment.is_charagble) === 'true' && displayThread.attachment.paid_by_reciever === false) {
    return (
      <View style={[styles.leftChat]}>
        <View>
          <View style={[styles.mediaRichMessageWrapper, { height: displayThread.message !== '' ? undefined : 255 }]}>
            <View style={{ height: 255, width: '100%', position: 'relative' }}>
              {displayThread.attachment.preview && displayThread.attachment.preview !== 'assets/icons/pdf.png' ? (
                <>
                  <Image source={{ uri: displayThread.attachment.preview }} resizeMode={'cover'} resizeMethod={'resize'} style={{ width: '100%', height: '100%', position: 'absolute' }} blurRadius={4} />

                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      justifyContent: 'space-between',
                      paddingHorizontal: WIDTH_SIZES[16],
                      paddingVertical: WIDTH_SIZES[14],
                    }}>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <DIcon name={displayThread?.attachment?.format === 'image' ? 'lock' : 'control-play'} provider={'SimpleLineIcons'} color="#fff" size={responsiveWidth(12)} />
                      <Text
                        style={{
                          fontFamily: 'Rubik-SemiBold',
                          fontSize: FONT_SIZES[14],
                          color: '#fff',
                          marginTop: WIDTH_SIZES[12],
                          textAlign: 'center',
                        }}>
                        {`To unlock the ${displayThread?.attachment?.format}`}
                      </Text>
                    </View>

                    <Pressable onPress={() => handlePremiumPayment(displayThread._id, displayThread.attachment.charge_amount)} style={({ pressed }) => [styles.button, styles.yesButton, { backgroundColor: pressed ? 'black' : '#fff' }]}>
                      {({ pressed }) => (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[styles.buttonText, { color: pressed ? 'white' : '#1e1e1e' }]}>
                            Pay{' '}
                            <Text
                              style={{
                                fontFamily: 'Rubik-Bold',
                                fontSize: FONT_SIZES[16],
                                color: pressed ? 'white' : '#1e1e1e',
                              }}>
                              {displayThread.attachment.charge_amount}
                            </Text>
                          </Text>
                          <Image
                            source={require('../../../Assets/Images/Coins2.png')}
                            style={{
                              height: responsiveWidth(4.5),
                              width: responsiveWidth(4.5),
                              resizeMode: 'contain',
                              alignSelf: 'center',
                              marginLeft: responsiveWidth(1),
                              tintColor: pressed ? 'white' : undefined,
                            }}
                          />
                        </View>
                      )}
                    </Pressable>
                  </View>
                </>
              ) : (
                // PDF CASE - Show same overlay with lock and pay button
                <>
                  <View style={[styles.pdf, { height: '100%', width: '100%' }]}>
                    <Text style={styles.pdfText}>.PDF</Text>
                  </View>

                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      justifyContent: 'space-between',
                      paddingHorizontal: WIDTH_SIZES[16],
                      paddingVertical: WIDTH_SIZES[14],
                    }}>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <DIcon name={'lock'} provider={'SimpleLineIcons'} color="#fff" size={responsiveWidth(12)} />
                      <Text
                        style={{
                          fontFamily: 'Rubik-SemiBold',
                          fontSize: FONT_SIZES[14],
                          color: '#fff',
                          marginTop: WIDTH_SIZES['14'],
                          textAlign: 'center',
                        }}>
                        {`To unlock the ${displayThread?.attachment?.format}`}
                      </Text>
                    </View>

                    <Pressable onPress={() => handlePremiumPayment(displayThread._id, displayThread.attachment.charge_amount)} style={({ pressed }) => [styles.button, styles.yesButton, { backgroundColor: pressed ? 'black' : '#fff' }]}>
                      {({ pressed }) => (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[styles.buttonText, { color: pressed ? 'white' : '#1e1e1e' }]}>
                            Pay{' '}
                            <Text
                              style={{
                                fontFamily: 'Rubik-Bold',
                                fontSize: FONT_SIZES[16],
                                color: pressed ? 'white' : '#1e1e1e',
                              }}>
                              {displayThread.attachment.charge_amount}
                            </Text>
                          </Text>
                          <Image
                            source={require('../../../Assets/Images/Coins2.png')}
                            style={{
                              height: responsiveWidth(4.5),
                              width: responsiveWidth(4.5),
                              resizeMode: 'contain',
                              alignSelf: 'center',
                              marginLeft: responsiveWidth(1),
                              tintColor: pressed ? 'white' : undefined,
                            }}
                          />
                        </View>
                      )}
                    </Pressable>
                  </View>
                </>
              )}
            </View>

            {/* Message Text Section - Show below the locked media if message exists */}
            {displayThread.message !== '' && (
              <Text selectable style={styles.mediaRichChatText}>
                {displayThread.message}
              </Text>
            )}
          </View>

          <WhatsAppTime timestamp={displayThread.createdAt} style={styles.timiming} />
        </View>
      </View>
    );
  }
  if (displayThread?.coinDetail === true) {
    const rawUserName = displayThread.message.split(' tipped ')[0];
    const userName = rawUserName.length > 5 ? rawUserName.substring(0, 5) + '...' : rawUserName;
    const coinAmount = displayThread?.attachment?.charge_amount || displayThread.message.match(/tipped (\d+)/)?.[1] || "";
    const profileImage = displayThread?.attachment?.profileImage || displayThread?.sender?.profile_image?.url;

    return (
      <TouchableOpacity style={styles.leftChat} onLongPress={() => handleCopyToClipBoard(displayThread.message)}>
        <View style={styles.chatContainerLeftWrapper}>
          <View style={[styles.chatContainerLeft, { flexDirection: 'row', alignItems: 'center' }]}>
            <Image
              source={profileImage ? { uri: profileImage } : require('../../../Assets/Images/Profile.jpg')}
              style={styles.profileImage}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
              <Text style={styles.chatText}>
                {userName}
              </Text>
              <Text style={styles.chatText}> tipped </Text>
              <Text style={[styles.chatText, { fontFamily: 'Rubik-SemiBold' }]}>{coinAmount}</Text>
            </View>

            {/* Coin Image */}
            <Image source={require('../../../Assets/Images/Coins.png')} style={styles.coinImage} />
          </View>

          <WhatsAppTime timestamp={displayThread.createdAt} style={styles.timiming} />
        </View>
      </TouchableOpacity>
    );
  }

  if (displayThread.attachment.format === 'video') {
    console.log('🎬 [CWE-LEFT] Video preview:', displayThread.attachment.preview?.substring(0, 80) || '(empty)', '| is_charagble:', displayThread.attachment.is_charagble, '| paid:', displayThread.attachment.paid_by_reciever);
    return (
      <View style={styles.leftChat}>
        <View>
          <View style={[styles.mediaRichMessageWrapper, { height: displayThread.message !== '' ? undefined : 255 }]}>
            <View style={{ height: 255, width: '100%', position: 'relative', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e1e1e' }}>
              {displayThread.attachment.preview ? (
                <Image source={{ uri: displayThread.attachment.preview }} resizeMode={'cover'} resizeMethod={'resize'} style={{ width: '100%', height: '100%', position: 'absolute' }} />
              ) : null}
              <TouchableOpacity style={styles.centeredPlayIcon} onPress={() => handleFullScreenVideoModal(displayThread.attachment.url)}>
                <DIcon name={'control-play'} provider={'SimpleLineIcons'} color="#fff" size={responsiveWidth(12)} />
              </TouchableOpacity>
            </View>
            {displayThread.message !== '' && (
              <Text selectable style={styles.mediaRichChatText}>
                {displayThread.message}
              </Text>
            )}
          </View>
          <WhatsAppTime timestamp={displayThread.createdAt} style={styles.timiming} />
        </View>
      </View>
    );
  }

  if (displayThread.attachment.format === 'document') {
    return (
      <View style={styles.leftChat}>
        <View>
          <TouchableOpacity style={[styles.mediaRichMessageWrapper, displayThread.message !== '' ? { height: undefined } : { height: 255 }]} onPress={() => externalPdfLinkingHandler(displayThread.attachment.url)}>
            {/* PDF Container - Fixed 255px height */}
            <View style={{ height: 255, width: '100%' }}>
              <View style={[styles.pdf, { height: '100%' }]}>
                <Text style={styles.pdfText}>.PDF</Text>
              </View>
            </View>

            {/* Text Section - Only if message exists */}
            {displayThread.message !== '' && (
              <Text selectable style={styles.mediaRichChatText}>
                {displayThread.message}
              </Text>
            )}
          </TouchableOpacity>
          <WhatsAppTime timestamp={displayThread.createdAt} style={styles.timiming} />
        </View>
      </View>
    );
  }

  if (displayThread?.attachment?.format === 'image') {
    return (
      <View style={styles.leftChat}>
        {displayThread.message !== '' && displayThread.attachment.url !== '' ? (
          <View>
            <View style={[styles.mediaRichMessageWrapper, { height: undefined }]}>
              {/* IMAGE SECTION - Fixed height */}
              <View style={{ height: 255, width: '100%', overflow: 'hidden' }}>
                {displayThread.attachment.url !== 'assets/default/default-profile.jpg' ? (
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => handleImageZoomView(displayThread.attachment.url)}>
                    <Image source={{ uri: displayThread.attachment.url }} resizeMode={'cover'} resizeMethod={'resize'} style={{ height: '100%', width: '100%' }} />
                  </TouchableOpacity>
                ) : (
                  <Image source={require('../../../Assets/Images/Profile.jpg')} resizeMode={'cover'} resizeMethod={'resize'} style={{ height: '100%', width: '100%' }} />
                )}
              </View>

              {/* TEXT SECTION */}
              <Text selectable style={styles.mediaRichChatText}>
                {displayThread.message}
              </Text>
            </View>
            <WhatsAppTime timestamp={displayThread.createdAt} style={styles.timiming} />
          </View>
        ) : displayThread.message === '' && displayThread.attachment.url !== '' ? (
          <View style={styles.chatContainerLeftWrapper}>
            <View style={[styles.mediaRichMessageWrapper, { height: 255 }]}>
              {/* IMAGE SECTION - Fixed height */}
              <View style={{ height: 255, width: '100%', overflow: 'hidden' }}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => handleImageZoomView(displayThread.attachment.url)}>
                  <Image source={{ uri: displayThread.attachment.url }} resizeMode={'cover'} resizeMethod={'resize'} style={{ height: '100%', width: '100%' }} />
                </TouchableOpacity>
              </View>
            </View>
            <WhatsAppTime timestamp={displayThread.createdAt} style={styles.timiming} />
          </View>
        ) : null}
      </View>
    );
  }

  if (displayThread?.attachment?.type === 'REQUEST_DECLINED') {
    return (
      <View style={[styles.callExpiredContainer, { alignSelf: 'center' }]}>
          <View style={styles.callRequestHeader}>
            <View style={styles.callExpiredIconBadge}>
              <Image source={require('../../../Assets/Images/CallRequests/phone_cross.png')} style={styles.callExpiredIcon} />
            </View>
            <Text style={styles.callRequestTitle}>Request Declined</Text>
          </View>

          <Text style={styles.callRequestBodyText}>
            The request was declined. The coins have been returned to your wallet. Please connect via chat to reconnect.
          </Text>

          {/* Conditional Button for Initiator */}
          {displayThread?.callRecord?.initiator === currentUserId && (
            <TouchableOpacity
              style={styles.callExpiredButton}
              onPress={() => navigate('SelectDuration', {
                userId: otherUserId,
                roomId: roomId,
                callType: displayThread?.callRecord?.type?.toLowerCase() === 'video' ? 'Video' : 'Audio'
              })}
            >
              <Text style={styles.callExpiredButtonText}>Send New Request</Text>
            </TouchableOpacity>
          )}

          <View style={styles.callRequestFooter}>
            <Moment format="DD MMM, hh:mm A" element={Text} style={styles.callRequestTime}>
              {displayThread.createdAt}
            </Moment>
          </View>
        </View>
    );
  }

  if (displayThread?.attachment?.type === 'CALL_MISSED') {
    return (
      <View style={{ width: '100%', flexDirection: 'column' }}>
        <View style={[styles.callMissedContainer, { alignSelf: 'center' }]}>
          <View style={styles.callMissedHeader}>
            <View style={styles.callMissedTitleBlock}>
              <Text style={styles.callMissedTitle}>Call Missed</Text>
              <Moment format="[Today], hh:mm A" element={Text} style={styles.callMissedSmallTime}>
                {displayThread.createdAt}
              </Moment>
            </View>
            <View style={styles.callMissedIconBadge}>
              <Image source={require('../../../Assets/Images/CallRequests/phone_with_tilt_line.png')} style={styles.callMissedIcon} />
            </View>
          </View>

          <View style={styles.callMissedInfoSection}>
            <Image source={require('../../../Assets/Images/CallRequests/info.png')} style={styles.callMissedInfoIcon} />
            <View style={styles.callMissedInfoContent}>
              <Text style={styles.callMissedInfoTitle}>
                The call wasn’t connected. {displayThread?.attachment?.callTries || 1} attempts remain to complete this call
              </Text>
              <Text style={styles.callMissedInfoBody}>
                If the call isn’t completed after all attempts, the coins will be automatically returned to the payer within 48 hours of the initial request.
              </Text>

              {/* Conditional Call Again Button */}
              {displayThread?.callRecord?.initiator !== currentUserId && (
                <TouchableOpacity
                  style={styles.callMissedButton}
                  onPress={handleStartCallAction}
                  disabled={isStartingCall}
                >
                  {isStartingCall ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.callMissedButtonText}>
                      Call Again ({3 - (displayThread?.attachment?.callTries || 0)}/3)
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (displayThread?.attachment?.type === 'REQUEST_SENT') {
    return (
      <View style={{ width: '100%', flexDirection: 'column' }}>
        <View style={[styles.callRequestContainer, { alignSelf: 'center' }]}>
          <View style={styles.callRequestHeader}>
            <View style={styles.callRequestIconBadge}>
              <Image source={require('../../../Assets/Images/CallRequests/phone_only.png')} style={styles.callRequestIcon} />
            </View>
            <View style={styles.callRequestTitleContainer}>
              <Text style={styles.callRequestTitle}>{(displayThread?.callRecord?.type?.toLowerCase() === 'video' ? 'Video' : 'Audio')} Call Request!</Text>
              <Image source={require('../../../Assets/Images/CallRequests/tickVerified.png')} style={styles.verifiedIcon} />
            </View>
          </View>

          <Text style={styles.callRequestBodyText}>
            A <Text style={styles.callRequestBodyBold}>{displayThread?.attachment?.duration} min</Text> {displayThread?.callRecord?.type?.toLowerCase() || 'audio'} call has been requested. <Text style={styles.callRequestBodyBold}>{displayThread?.attachment?.holdAmount} coins</Text> are on hold for this call and will be sent after the call is completed. If the call isn’t scheduled or connected within <Text style={styles.callRequestBodyBold}>48 hours</Text>, the coins will be automatically <Text style={styles.callRequestBodyBold}>refunded</Text>.{"\n\n"}After <Text style={styles.callRequestBodyBold}>3 missed attempts</Text>, <Text style={styles.callRequestBodyBold}>80%</Text> will be refunded and <Text style={styles.callRequestBodyBold}>20%</Text> will be released to the creator as a compensation fee.
          </Text>

          {displayThread?.callRecord?.initiator !== currentUserId ? (
            <View style={styles.callRequestButtonContainer}>
              <TouchableOpacity
                style={styles.denyButton}
                onPress={() => {
                  const payload = {
                    roomId: roomId,
                    callType: displayThread?.callRecord?.type?.toLowerCase() || 'audio',
                    userId: displayThread?.callRecord?.initiator,
                  };
                  console.log('Declining Call Request with Payload:', payload);
                  declineCallRequest({ token, data: payload })
                    .unwrap()
                    .then(response => {
                      CommonSuccess(response?.message || 'Call request declined successfully');
                    })
                    .catch(error => {
                      LoginPageErrors(error?.data?.message || 'Failed to decline call');
                    });
                }}>
                <Text style={styles.buttonTextDeny}>Deny</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => {
                  navigate('ScheduleCallScreen', {
                    roomId: roomId,
                    userProfileImage: displayThread?.sender?.profile_image?.url,
                    userName: displayThread?.sender?.fullName,
                    callDuration: displayThread?.attachment?.duration,
                    callCost: displayThread?.attachment?.holdAmount,
                    requestCreatedAt: displayThread?.attachment?.initiatedAt || displayThread?.createdAt,
                  });
                }}
              >
                <Text style={styles.buttonTextAccept}>Accept & Schedule</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <View style={styles.pendingBadge}>
                <View style={styles.pendingDot} />
                <Text style={styles.pendingText}>Pending</Text>
              </View>
            </View>
          )}

          <View style={styles.callRequestFooter}>
            <Moment format="DD MMM, hh:mm A" element={Text} style={styles.callRequestTime}>
              {displayThread.createdAt}
            </Moment>
          </View>
        </View>
      </View>
    );
  }

  if (displayThread?.attachment?.type === 'CALL_SCHEDULED') {
    return (
      <View style={{ width: '100%', flexDirection: 'column' }}>
        <View style={[styles.callScheduledContainer, { alignSelf: 'center' }]}>
          <View style={styles.callScheduledHeader}>
            <View style={styles.callScheduledIconBadge}>
              <Image source={require('../../../Assets/Images/CallRequests/phone_calendar.png')} style={styles.callScheduledIcon} />
            </View>
            <Text style={styles.callScheduledTitle}>Call Scheduled!</Text>
          </View>

          <Text style={styles.callScheduledSubtitle}>
            {displayThread?.sender?.fullName} has scheduled your {displayThread?.attachment?.duration} min call for:
          </Text>

          <View style={styles.callScheduledTimeSection}>
            <Moment format="MMM DD, YYYY, hh:mm A" element={Text} style={styles.callScheduledTimeText}>
              {displayThread?.attachment?.availability}
            </Moment>
          </View>

          <Text style={styles.callScheduledInfoText}>
            The call can be initiated up to <Text style={styles.callScheduledBold}>{displayThread?.attachment?.callTries || 3} times</Text> within <Text style={styles.callScheduledBold}>24hr</Text> of the scheduled time.{"\n"}
          </Text>

        </View>
      </View>
    );
  }

  if (displayThread?.attachment?.type === 'REQUEST_EXPIRED') {
    return (
      <View style={{ width: '100%', flexDirection: 'column' }}>
        <View style={[styles.callExpiredContainer, { alignSelf: 'center' }]}>
          <View style={styles.callRequestHeader}>
            <View style={styles.callExpiredIconBadge}>
              <Image source={require('../../../Assets/Images/CallRequests/phone_cross.png')} style={styles.callExpiredIcon} />
            </View>
            <Text style={styles.callRequestTitle}>Request Expired</Text>
          </View>

          <Text style={styles.callRequestBodyText}>
            All <Text style={styles.callRequestBodyBold}>{displayThread?.attachment?.callTries || 3} call attempts</Text> were made and missed. This request has now expired. The coins have been returned to the payer within <Text style={styles.callRequestBodyBold}>1 hour</Text>. Please connect via chat to reconnect.
          </Text>

          {displayThread?.callRecord?.initiator === currentUserId && (
            <TouchableOpacity
              style={styles.callExpiredButton}
              onPress={() => navigate('SelectDuration', {
                userId: otherUserId,
                roomId: roomId,
                callType: displayThread?.callRecord?.type?.toLowerCase() === 'video' ? 'Video' : 'Audio'
              })}
            >
              <Text style={styles.callExpiredButtonText}>Send New Request</Text>
            </TouchableOpacity>
          )}

          <View style={styles.callRequestFooter}>
            <Moment format="DD MMM, hh:mm A" element={Text} style={styles.callRequestTime}>
              {displayThread.createdAt}
            </Moment>
          </View>
        </View>
      </View>
    );
  }

  if (displayThread?.attachment?.type === 'PPV_MESSAGE') {
    return (
      <View style={styles.ppvContainer}>
        <View style={styles.ppvIconWrapper}>
          <Image source={require('../../../Assets/Images/ppv_coins.png')} style={styles.ppvIcon} />
        </View>

        <View style={styles.ppvContent}>
          <Text style={styles.ppvText}>
            <Text style={styles.ppvBold}>{displayThread?.sender?.displayName}</Text>
            <Text> unlocked your PPV and</Text>
          </Text>

          <Text style={styles.ppvText}>
            you earned <Text style={styles.ppvBold}>{displayThread?.callRecord?.charged} coins</Text>
          </Text>

          <View style={styles.ppvBadge}>
            <Text style={styles.ppvBadgeText}>{'+' + displayThread?.callRecord?.charged}</Text>
          </View>
        </View>
      </View>
    );
  }

  if (displayThread?.attachment?.type === 'CALL_DETAILS') {
    const isVideo = displayThread?.callRecord?.type === 'VIDEO';
    const amount = displayThread?.callRecord?.charged || displayThread?.attachment?.charge_amount || 0;
    const duration = displayThread?.callRecord?.duration || displayThread?.attachment?.duration || 1;

    return (
      <View style={[styles.callDetailsContainer, { alignSelf: 'flex-start' }]}>
        <View style={styles.callDetailsBubbleLeft}>
          <View style={[styles.callDetailsIconContainer, { backgroundColor: '#1e1e1e' }]}>
            <Image
              source={isVideo ? require('../../../Assets/Images/CallRequests/leftDurationVideo.png') : require('../../../Assets/Images/CallRequests/leftDurationAudio.png')}
              style={styles.callDetailsIcon}
            />
          </View>
          <View style={styles.callDetailsContent}>
            <Text style={styles.callDetailsTitle}>{isVideo ? 'Video Call' : 'Audio Call'}</Text>
            <Text style={styles.callDetailsDuration}>{duration} mins</Text>
          </View>
          <View style={styles.callDetailsAmountContainer}>
            <Text style={styles.callDetailsAmount}>{amount}</Text>
            <Image
              source={require('../../../Assets/Images/Coins2.png')}
              style={styles.callDetailsCoinImage}
            />
          </View>
        </View>
        <WhatsAppTime timestamp={displayThread.createdAt} style={styles.timiming} />
      </View>
    );
  }

  if (displayThread?.attachment?.format === '') {
    return (
      <TouchableOpacity style={styles.leftChat} onLongPress={() => handleCopyToClipBoard(displayThread.message)}>
        <View style={styles.chatContainerLeftWrapper}>
          <View style={styles.chatContainerLeft}>
            <Hyperlink onPress={(url, text) => Linking.openURL(url)} linkStyle={{ textDecorationLine: 'underline', color: '#2AA6DF' }}>
              <Text style={[styles.chatText]} key={Math.random()}>
                {displayThread.message}
              </Text>
            </Hyperlink>
          </View>
          <WhatsAppTime timestamp={displayThread.createdAt} style={styles.timiming} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <MicPermissionModal
        visible={showMicModal}
        mode="caller"
        callType={callType}
        onCancel={() => setShowMicModal(false)}
      />
    </>
  );
};

export const RightChatBubble = ({ displayThread, setFullVideoModalUri, setFullSizeImageUri, otherUserId, chatRoomId: roomId }) => {
  const dispatch = useDispatch();
  const currentUserId = useSelector(state => state.auth.user.currentUserId);
  const token = useSelector(state => state.auth.user.token);

  const { handleStartCallAction, isStartingCall, showMicModal, setShowMicModal } = useStartCallAction({ displayThread, roomId, token, currentUserId });

  const handleFullScreenVideoModal = React.useCallback(uri => {
    setFullVideoModalUri(uri);
    dispatch(toggleChatWindowVideoModal());
    console.log(uri);
  }, []);

  const handleImageZoomView = React.useCallback(uri => {
    setFullSizeImageUri(uri);
    dispatch(toggleChatWindowFullSizedImageModal());
  });

  if (displayThread?.attachment?.updateCoin === true) {
    return (
      <View>
        <View style={styles.feeSetupBlock}>
          <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/calender.png')} contentFit="contain" style={{ height: 20, width: 20 }} />
          <Text style={styles.feeSetupText}>{displayThread.message}</Text>
        </View>
        <WhatsAppTime timestamp={displayThread.createdAt} style={styles.timimingTwo} />
      </View>
    );
  }

  if (String(displayThread.attachment.is_charagble) === 'true' && displayThread.attachment.format === 'image') {
    return (
      <View style={[styles.rightChat]}>
        <View>
          <View style={[styles.mediaRichMessageWrapperRight, { height: undefined }]}>
            {/* Image Section - Fixed 255px height */}
            <TouchableOpacity style={{ height: 255, width: '100%' }} onPress={() => handleImageZoomView(displayThread.attachment.url)} activeOpacity={0.8}>
              <View style={{ height: 255, width: '100%', overflow: 'hidden' }}>
                <Image
                  source={{ uri: displayThread.attachment.url }}
                  resizeMode={'cover'}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderTopLeftRadius: WIDTH_SIZES[12],
                    borderTopRightRadius: WIDTH_SIZES[12],
                  }}
                />
              </View>
            </TouchableOpacity>

            {/* Text Section */}
            {displayThread.message !== '' && (
              <Text selectable style={styles.mediaRichChatTextRight}>
                {displayThread.message}
              </Text>
            )}

            {/* Payment Badge Section */}
            <View style={styles.paymentBadgeContainer}>
              <View style={styles.paymentBadge}>
                <Text style={styles.buttonText}>
                  <Text style={{ fontFamily: 'Rubik-Bold', fontSize: FONT_SIZES[16] }}>{displayThread.attachment.charge_amount}</Text>
                </Text>
                <Image source={require('../../../Assets/Images/Coins2.png')} style={styles.coinImageSmall} />
              </View>
            </View>
          </View>
          <WhatsAppTime timestamp={displayThread.createdAt} style={styles.timimingTwo} />
        </View>
      </View>
    );
  }

  if (displayThread.attachment.format === 'video') {
    console.log('🎬 [CWE] Rendering video. preview:', displayThread.attachment.preview?.substring(0, 80), '| is_charagble:', displayThread.attachment.is_charagble, '| charge_amount:', displayThread.attachment.charge_amount);
    return (
      <View style={styles.rightChat}>
        <View>
          <View style={[styles.mediaRichMessageWrapperRight, { height: displayThread.message !== '' || displayThread.attachment.charge_amount > 0 ? undefined : 255 }]}>
            {/* IMAGE & PLAY BUTTON CONTAINER */}
            <View style={{ height: 255, width: '100%', position: 'relative', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e1e1e' }}>
              {displayThread.attachment.preview ? (
                <Image source={{ uri: displayThread.attachment.preview }} resizeMode={'cover'} style={{ height: '100%', width: '100%', position: 'absolute' }} />
              ) : null}

              {/* Play button centered */}
              <TouchableOpacity style={styles.centeredPlayIcon} onPress={() => handleFullScreenVideoModal(displayThread.attachment.url)}>
                <DIcon name={'play-circle'} provider={'FontAwesome5'} color="#fff" size={responsiveWidth(12)} />
              </TouchableOpacity>
            </View>

            {/* TEXT SECTION - Always show if message exists */}
            {displayThread.message !== '' && (
              <Text selectable style={styles.mediaRichChatTextRight}>
                {displayThread.message}
              </Text>
            )}

            {/* PAYMENT BADGE - Only show if charge_amount > 0 */}
            {displayThread.attachment.charge_amount > 0 && (
              <View style={styles.paymentBadgeContainer}>
                <View style={styles.paymentBadge}>
                  <Text style={styles.buttonText}>
                    <Text style={{ fontFamily: 'Rubik-Bold', fontSize: FONT_SIZES[16] }}>{displayThread.attachment.charge_amount}</Text>
                  </Text>
                  <Image source={require('../../../Assets/Images/Coins2.png')} style={styles.coinImageSmall} />
                </View>
              </View>
            )}
          </View>
          <WhatsAppTime timestamp={displayThread.createdAt} style={styles.timimingTwo} />
        </View>
      </View>
    );
  }

  if (displayThread.attachment.format === 'document') {
    return (
      <View style={[styles.rightChat]}>
        <View>
          <TouchableOpacity style={[styles.mediaRichMessageWrapperRight, displayThread.message !== '' || displayThread.attachment.charge_amount > 0 ? { height: undefined } : { height: 255 }]} onPress={() => externalPdfLinkingHandler(displayThread.attachment.url)}>
            {/* PDF Container - Fixed 255px height */}
            <View style={{ height: 255, width: '100%' }}>
              <View style={[styles.pdf, { height: '100%' }]}>
                <Text style={styles.pdfText}>.PDF</Text>
              </View>
            </View>

            {/* Text Section - Only if message exists */}
            {displayThread.message !== '' && (
              <Text selectable style={styles.mediaRichChatTextRight}>
                {displayThread.message}
              </Text>
            )}

            {/* Payment Badge - Only if charge_amount > 0 */}
            {displayThread.attachment.charge_amount > 0 && (
              <View style={styles.paymentBadgeContainer}>
                <View style={[styles.paymentBadge]}>
                  <Text style={styles.buttonText}>
                    <Text style={{ fontFamily: 'Rubik-Bold', fontSize: FONT_SIZES[16] }}>{displayThread.attachment.charge_amount}</Text>
                  </Text>
                  <Image source={require('../../../Assets/Images/Coins2.png')} style={styles.coinImageSmall} />
                </View>
              </View>
            )}
          </TouchableOpacity>
          <WhatsAppTime timestamp={displayThread.createdAt} style={styles.timimingTwo} />
        </View>
      </View>
    );
  }

  if (displayThread?.attachment?.format === 'image') {
    return (
      <View style={styles.rightChat}>
        <View>
          <View style={[styles.mediaRichMessageWrapperRight, { height: undefined }]}>
            {/* IMAGE SECTION - Fixed height */}
            <TouchableOpacity
              style={{ height: 255, width: '100%' }}
              onPress={() => {
                console.log('Image clicked!', displayThread.attachment.url);
                handleImageZoomView(displayThread.attachment.url);
              }}
              activeOpacity={0.8}>
              <View style={{ height: 255, width: '100%', overflow: 'hidden' }}>
                {displayThread.attachment.url !== 'assets/default/default-profile.jpg' ? (
                  <Image source={{ uri: displayThread.attachment.url }} resizeMode={'cover'} style={[styles.chatimageRight, styles.imageRadius, { height: '100%', width: '100%' }]} />
                ) : (
                  <Image source={require('../../../Assets/Images/Profile.jpg')} resizeMode={'cover'} style={[styles.chatimageRight, styles.imageRadius, { height: '100%', width: '100%' }]} />
                )}
              </View>
            </TouchableOpacity>

            {/* TEXT SECTION */}
            {displayThread.message !== '' && (
              <Text selectable style={[styles.mediaRichChatTextRight, { borderTopWidth: WIDTH_SIZES[1.5], borderColor: '#1e1e1e' }]}>
                {displayThread.message}
              </Text>
            )}
          </View>

          <WhatsAppTime timestamp={displayThread.createdAt} style={styles.timimingTwo} />
        </View>
      </View>
    );
  }

  if (displayThread.attachment.format === '') {
    if (displayThread?.message?.search('tipped') > 0) {
      const rawUserName = displayThread.message.split(' tipped ')[0];
      const userName = rawUserName.length > 5 ? rawUserName.substring(0, 5) + '...' : rawUserName;
      const coinAmount = displayThread?.attachment?.charge_amount || displayThread.message.match(/tipped (\d+)/)?.[1] || "";
      const profileImage = displayThread?.attachment?.profileImage || displayThread?.sender?.profile_image?.url;

      return (
        <TouchableOpacity style={styles.rightChat} onLongPress={() => handleCopyToClipBoard(displayThread.message)}>
          <View style={styles.chatContainerLeftWrapper}>
            {/* Receiver Profile Image */}
            <View style={[styles.chatContainerRight, { flexDirection: 'row', alignItems: 'center' }]}>
              <Image
                source={profileImage ? { uri: profileImage } : require('../../../Assets/Images/Profile.jpg')}
                style={styles.profileImage}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                <Text style={styles.chatText}>
                  {userName}
                </Text>
                <Text style={styles.chatText}> tipped </Text>
                <Text style={[styles.chatText, { fontFamily: 'Rubik-SemiBold' }]}>{coinAmount}</Text>
              </View>

              <Image source={require('../../../Assets/Images/Coins2.png')} style={styles.coinImage} />
            </View>

            <WhatsAppTime timestamp={displayThread.createdAt} style={styles.timimingTwo} />
          </View>
        </TouchableOpacity>
      );
    }

    if (displayThread?.attachment?.type === 'REQUEST_DECLINED') {
      return (
        <View style={[styles.callExpiredContainer, { alignSelf: 'center' }]}>
            <View style={styles.callRequestHeader}>
              <View style={styles.callExpiredIconBadge}>
                <Image source={require('../../../Assets/Images/CallRequests/phone_cross.png')} style={styles.callExpiredIcon} />
              </View>
              <Text style={styles.callRequestTitle}>Request Declined</Text>
            </View>

            <Text style={styles.callRequestBodyText}>
              The request was declined. The coins have been returned to your wallet. Please connect via chat to reconnect.
            </Text>

            {displayThread?.callRecord?.initiator === currentUserId && (
              <TouchableOpacity
                style={styles.callExpiredButton}
                onPress={() => navigate('SelectDuration', {
                  userId: otherUserId,
                  roomId: roomId,
                  callType: displayThread?.callRecord?.type?.toLowerCase() === 'video' ? 'Video' : 'Audio'
                })}
              >
                <Text style={styles.callExpiredButtonText}>Send New Request</Text>
              </TouchableOpacity>
            )}

            <View style={styles.callRequestFooter}>
              <Moment format="DD MMM, hh:mm A" element={Text} style={styles.callRequestTime}>
                {displayThread.createdAt}
              </Moment>
            </View>
          </View>
      );
    }

    if (displayThread?.attachment?.type === 'CALL_MISSED') {
      return (
        <View style={{ width: '100%', flexDirection: 'column' }}>
          <View style={[styles.callMissedContainer, { alignSelf: 'center' }]}>
            <View style={styles.callMissedHeader}>
              <View style={styles.callMissedTitleBlock}>
                <Text style={styles.callMissedTitle}>Call Missed</Text>
                <Moment format="[Today], hh:mm A" element={Text} style={styles.callMissedSmallTime}>
                  {displayThread.createdAt}
                </Moment>
              </View>
              <View style={styles.callMissedIconBadge}>
                <Image source={require('../../../Assets/Images/CallRequests/phone_with_tilt_line.png')} style={styles.callMissedIcon} />
              </View>
            </View>

            <View style={styles.callMissedInfoSection}>
              <Image source={require('../../../Assets/Images/CallRequests/info.png')} style={styles.callMissedInfoIcon} />
              <View style={styles.callMissedInfoContent}>
                <Text style={styles.callMissedInfoTitle}>
                  The call wasn’t connected. {displayThread?.attachment?.callTries || 1} attempts remain to complete this call
                </Text>
                <Text style={styles.callMissedInfoBody}>
                  If the call isn’t completed after all attempts, the coins will be automatically returned to the payer within 48 hours of the initial request.
                </Text>

                {/* Conditional Call Again Button */}
                {displayThread?.callRecord?.initiator !== currentUserId && (
                  <TouchableOpacity
                    style={styles.callMissedButton}
                    onPress={handleStartCallAction}
                    disabled={isStartingCall}
                  >
                    {isStartingCall ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.callMissedButtonText}>
                        Call Again ({3 - (displayThread?.attachment?.callTries || 0)}/3)
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      );
    }

    if (displayThread?.attachment?.type === 'REQUEST_SENT') {
      return (
        <View style={{ width: '100%', flexDirection: 'column' }}>
          <View style={[styles.callRequestContainer, { alignSelf: 'center' }]}>
            <View style={styles.callRequestHeader}>
              <View style={styles.callRequestIconBadge}>
                <Image source={require('../../../Assets/Images/CallRequests/phone_only.png')} style={styles.callRequestIcon} />
              </View>
              <View style={styles.callRequestTitleContainer}>
                <Text style={styles.callRequestTitle}>{(displayThread?.callRecord?.type?.toLowerCase() === 'video' ? 'Video' : 'Audio')} Call Request!</Text>
                <Image source={require('../../../Assets/Images/CallRequests/tickVerified.png')} style={styles.verifiedIcon} />
              </View>
            </View>

            <Text style={styles.callRequestBodyText}>
              A <Text style={styles.callRequestBodyBold}>{displayThread?.attachment?.duration} min</Text> {displayThread?.callRecord?.type?.toLowerCase() || 'audio'} call has been requested. <Text style={styles.callRequestBodyBold}>{displayThread?.attachment?.holdAmount} coins</Text> are on hold for this call and will be sent after the call is completed. If the call isn’t scheduled or connected within <Text style={styles.callRequestBodyBold}>48 hours</Text>, the coins will be automatically <Text style={styles.callRequestBodyBold}>refunded</Text>.{"\n\n"}After <Text style={styles.callRequestBodyBold}>3 missed attempts</Text>, <Text style={styles.callRequestBodyBold}>80%</Text> will be refunded and <Text style={styles.callRequestBodyBold}>20%</Text> will be released to the creator as a compensation fee.
            </Text>

            {displayThread?.callRecord?.initiator !== currentUserId ? (
              <View style={styles.callRequestButtonContainer}>
                <TouchableOpacity style={styles.denyButton}>
                  <Text style={styles.buttonTextDeny}>Deny</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.acceptButton}>
                  <Text style={styles.buttonTextAccept}>Accept & Schedule</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <View style={styles.pendingBadge}>
                  <View style={styles.pendingDot} />
                  <Text style={styles.pendingText}>Pending</Text>
                </View>
              </View>
            )}

            <View style={styles.callRequestFooter}>
              <Moment format="DD MMM, hh:mm A" element={Text} style={styles.callRequestTime}>
                {displayThread.createdAt}
              </Moment>
            </View>
          </View>
        </View>
      );
    }

    if (displayThread?.attachment?.type === 'CALL_SCHEDULED') {
      return (
        <View style={{ width: '100%', flexDirection: 'column' }}>
          <View style={[styles.callScheduledContainer, { alignSelf: 'center' }]}>
            <View style={styles.callScheduledHeader}>
              <View style={styles.callScheduledIconBadge}>
                <Image source={require('../../../Assets/Images/CallRequests/phone_calendar.png')} style={styles.callScheduledIcon} />
              </View>
              <Text style={styles.callScheduledTitle}>Call Scheduled!</Text>
            </View>

            <Text style={styles.callScheduledSubtitle}>
              {displayThread?.sender?.fullName} has scheduled your {displayThread?.attachment?.duration} min call for:
            </Text>

            <View style={styles.callScheduledTimeSection}>
              <Moment format="MMM DD, YYYY, hh:mm A" element={Text} style={styles.callScheduledTimeText}>
                {displayThread?.attachment?.availability}
              </Moment>
            </View>

            <Text style={styles.callScheduledInfoText}>
              The call can be initiated up to <Text style={styles.callScheduledBold}>{displayThread?.attachment?.callTries || 3} times</Text> within <Text style={styles.callScheduledBold}>24hr</Text> of the scheduled time.{"\n"}
              If the call doesn’t happen, the coins will be automatically <Text style={styles.callScheduledBold}>refunded within 1 hour</Text>. You’ll receive a <Text style={styles.callScheduledBold}>reminder 10 minutes</Text> before the call.
            </Text>

          </View>
        </View>
      );
    }

    if (displayThread?.attachment?.type === 'REQUEST_EXPIRED') {
      return (
        <View style={{ width: '100%', flexDirection: 'column' }}>
          <View style={[styles.callExpiredContainer, { alignSelf: 'center' }]}>
            <View style={styles.callRequestHeader}>
              <View style={styles.callExpiredIconBadge}>
                <Image source={require('../../../Assets/Images/CallRequests/phone_cross.png')} style={styles.callExpiredIcon} />
              </View>
              <Text style={styles.callRequestTitle}>Request Expired</Text>
            </View>

            <Text style={styles.callRequestBodyText}>
              All <Text style={styles.callRequestBodyBold}>{displayThread?.attachment?.callTries || 3} call attempts</Text> were made and missed. This request has now expired. The coins have been returned to the payer within <Text style={styles.callRequestBodyBold}>1 hour</Text>. Please connect via chat to reconnect.
            </Text>

            {displayThread?.callRecord?.initiator === currentUserId && (
              <TouchableOpacity
                style={styles.callExpiredButton}
                onPress={() => navigate('SelectDuration', {
                  userId: otherUserId,
                  roomId: roomId,
                  callType: displayThread?.callRecord?.type?.toLowerCase() === 'video' ? 'Video' : 'Audio'
                })}
              >
                <Text style={styles.callExpiredButtonText}>Send New Request</Text>
              </TouchableOpacity>
            )}

            <View style={styles.callRequestFooter}>
              <Moment format="DD MMM, hh:mm A" element={Text} style={styles.callRequestTime}>
                {displayThread.createdAt}
              </Moment>
            </View>
          </View>
        </View>
      );
    }


    if (displayThread?.attachment?.type === 'PPV_MESSAGE') {
      return (
        <View style={styles.ppvContainer}>
          <View style={styles.ppvIconWrapper}>
            <Image source={require('../../../Assets/Images/ppv_coins.png')} style={styles.ppvIcon} />
          </View>

          <View style={styles.ppvContent}>
            <Text style={styles.ppvText}>
              <Text style={styles.ppvBold}>{displayThread?.sender?.displayName}</Text>
              <Text> unlocked your PPV and</Text>
            </Text>

            <Text style={styles.ppvText}>
              you earned <Text style={styles.ppvBold}>{displayThread?.callRecord?.charged} coins</Text>
            </Text>

            <View style={styles.ppvBadge}>
              <Text style={styles.ppvBadgeText}>{'+' + displayThread?.callRecord?.charged}</Text>
            </View>
          </View>
        </View>
      );
    }

    if (displayThread?.attachment?.type === 'CALL_DETAILS') {
      const isVideo = displayThread?.callRecord?.type === 'VIDEO';
      const amount = displayThread?.callRecord?.charged || displayThread?.attachment?.charge_amount || 0;
      const duration = displayThread?.callRecord?.duration || displayThread?.attachment?.duration || 1;

      return (
        <View style={[styles.callDetailsContainer, { alignSelf: 'flex-end' }]}>
          <View style={styles.callDetailsBubbleRight}>
            <View style={[styles.callDetailsIconContainer, { backgroundColor: '#fff' }]}>
              <Image
                source={isVideo ? require('../../../Assets/Images/CallRequests/rightDurationVideo.png') : require('../../../Assets/Images/CallRequests/durationAudio.png')}
                style={styles.callDetailsIcon}
              />
            </View>
            <View style={styles.callDetailsContent}>
              <Text style={styles.callDetailsTitle}>{isVideo ? 'Video Call' : 'Audio Call'}</Text>
              <Text style={styles.callDetailsDuration}>{duration} mins</Text>
            </View>
            <View style={styles.callDetailsAmountContainer}>
              <Text style={styles.callDetailsAmount}>{amount}</Text>
              <Image
                source={require('../../../Assets/Images/Coins2.png')}
                style={styles.callDetailsCoinImage}
              />
            </View>
          </View>
          <WhatsAppTime timestamp={displayThread.createdAt} style={styles.timimingTwo} />
        </View>
      );
    }

    if (displayThread?.attachment?.format === '') {
      return (
        <TouchableOpacity style={styles.rightChat} onLongPress={() => handleCopyToClipBoard(displayThread.message)}>
          <View style={styles.chatContainerLeftWrapper}>
            <View style={styles.chatContainerRight}>
              <Hyperlink onPress={(url, text) => Linking.openURL(url)} linkStyle={{ textDecorationLine: 'underline', color: '#2AA6DF' }}>
                <Text style={styles.chatTextRight}>
                  {displayThread.message}
                </Text>
              </Hyperlink>
            </View>
            <WhatsAppTime timestamp={displayThread.createdAt} style={styles.timimingTwo} />
          </View>
        </TouchableOpacity>
      );
    }
  }

  return (
    <>
      <MicPermissionModal
        visible={showMicModal}
        mode="caller"
        callType={callType}
        onCancel={() => setShowMicModal(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  leftChat: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'flex-start',
    paddingHorizontal: 10,
    marginVertical: 6,
  },
  rightChat: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: 10,
    marginVertical: 6,
  },

  chatContainerLeft: {
    maxWidth: responsiveWidth(70),
    minWidth: responsiveWidth(10),
    borderWidth: WIDTH_SIZES[1.5],
    paddingVertical: WIDTH_SIZES[10],
    paddingHorizontal: WIDTH_SIZES[16],
    flexDirection: 'column',
    borderColor: '#1e1e1e',
    borderRadius: WIDTH_SIZES[14],
    backgroundColor: '#FFF9F5',
    borderTopLeftRadius: responsiveWidth(0),
  },

  chatContainerRight: {
    maxWidth: responsiveWidth(70),
    minWidth: responsiveWidth(2),
    borderWidth: WIDTH_SIZES[1.5],
    paddingVertical: WIDTH_SIZES[10],
    paddingHorizontal: WIDTH_SIZES[16],
    flexDirection: 'column',
    borderColor: '#1e1e1e',
    borderRadius: WIDTH_SIZES[14],
    borderBottomRightRadius: responsiveWidth(0),
    backgroundColor: '#FFC399',
  },

  mediaRichMessageWrapper: {
    height: responsiveWidth(100),
    width: responsiveWidth(60),
    backgroundColor: '#FFF9F5',
    borderRadius: WIDTH_SIZES[14],
    overflow: 'hidden',
    borderTopLeftRadius: responsiveWidth(0),
    borderWidth: WIDTH_SIZES[1.5],
  },

  mediaRichMessageWrapperRight: {
    borderWidth: WIDTH_SIZES[1.5],
    borderColor: '#1e1e1e',
    width: responsiveWidth(60),
    backgroundColor: '#FFC399',
    borderRadius: WIDTH_SIZES[14],
    overflow: 'hidden',
    borderBottomRightRadius: responsiveWidth(0),
  },

  chatimage: {
    width: '100%',
    flex: 1,
    resizeMode: 'cover',
    borderTopRightRadius: responsiveWidth(2),
    borderTopLeftRadius: responsiveWidth(0.0),
    borderBottomWidth: WIDTH_SIZES[1.5],
  },
  chatimageRight: {
    width: '100%',
    flex: 1,
    resizeMode: 'cover',
  },
  chatContainerLeftWrapper: {},
  chatText: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: FONT_SIZES[14],
  },
  chatTextRight: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: FONT_SIZES[14],
  },
  mediaRichChatText: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: FONT_SIZES[14],
    paddingVertical: responsiveWidth(2),
    paddingHorizontal: responsiveWidth(2),
    borderTopWidth: WIDTH_SIZES[1.5],
  },
  mediaRichChatTextRight: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: FONT_SIZES[14],
    paddingTop: responsiveWidth(2.5),
    paddingHorizontal: responsiveWidth(3),
    borderTopWidth: WIDTH_SIZES[1.5],
    borderColor: '#1e1e1e',
    paddingBottom: responsiveWidth(1.8),
  },
  timiming: {
    fontSize: FONT_SIZES[10],
    fontFamily: 'Rubik-Regular',
    paddingLeft: responsiveWidth(2),
    paddingTop: responsiveWidth(0.8),
    color: '#1e1e1e',
  },
  playIconContainer: {
    position: 'absolute',
    height: responsiveWidth(22),
    width: responsiveWidth(22),
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    padding: responsiveWidth(4),
    borderRadius: responsiveWidth(15),
  },
  leftChatPdf: {
    height: 255,
  },
  rightChatPdf: {
    height: 255,
  },

  stripContainer: {
    width: '100%',
    height: responsiveWidth(15),
    position: 'absolute',
    marginTop: responsiveWidth(75),
    justifyContent: 'center',
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00000090',
    paddingLeft: responsiveWidth(10),
    alignItems: 'center',
    height: '40%',
  },
  stripText: {
    color: 'white',
    fontFamily: 'Rubik-Regular',
  },
  premiumIcon: {
    position: 'absolute',
    zIndex: 1,
  },

  timimingTwo: {
    fontSize: FONT_SIZES[10],
    fontFamily: 'Rubik-Regular',
    paddingLeft: responsiveWidth(2),
    paddingTop: responsiveWidth(0.8),
    color: '#1e1e1e',
    textAlign: 'right',
    marginRight: WIDTH_SIZES[1.5],
  },

  profileImage: {
    width: WIDTH_SIZES[32] - WIDTH_SIZES[2],
    height: WIDTH_SIZES[32] - WIDTH_SIZES[2],
    borderRadius: responsiveWidth(30),
    marginRight: WIDTH_SIZES[8],
    borderWidth: WIDTH_SIZES[2],
    borderColor: '#1e1e1e',
  },
  coinImage: {
    width: WIDTH_SIZES[16],
    height: WIDTH_SIZES[16],
    marginLeft: WIDTH_SIZES[4],
    marginBottom: WIDTH_SIZES[2],
  },
  premiumOverlay: {
    backgroundColor: '#FFC399',
    top: 0,
    borderTopWidth: WIDTH_SIZES[1.5],
    paddingHorizontal: WIDTH_SIZES[16],
    paddingTop: WIDTH_SIZES[12],
    paddingBottom: WIDTH_SIZES[14],
  },
  textPremium: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES[14],
    color: '#1e1e1e',
  },

  //premium chats overlay

  button: {
    width: responsiveWidth(51),
    height: 48,
    borderRadius: WIDTH_SIZES[14],
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Platform.OS === 'android' ? 6 : 8,
    borderWidth: WIDTH_SIZES[1.5],
    borderColor: '#1E1E1E',
    alignSelf: 'center',
    marginTop: WIDTH_SIZES[8],
  },
  yesButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
  },
  buttonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES[14],
    color: '#1e1e1e',
  },

  pdf: {
    backgroundColor: '#1e1e1e',
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  pdfText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES[32],
    color: '#fff',
    textAlign: 'center',
  },
  feeSetupBlock: {
    padding: WIDTH_SIZES[8],
    backgroundColor: '#FFC39947',
    marginVertical: WIDTH_SIZES[8],
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  feeSetupText: {
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    textAlign: 'center',
    fontSize: FONT_SIZES['14'],
    marginLeft: 6,
  },

  outerBox: {
    backgroundColor: '#FFF3EB',
    padding: 12,
    borderRadius: WIDTH_SIZES['14'],
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '85%',
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#1e1e1e',
    borderTopLeftRadius: 0,
    marginTop: WIDTH_SIZES['8'],
  },
  imgHolder: {
    padding: 8,
    borderRadius: 10,
    marginRight: 10,
  },
  imgIcon: {
    width: 41,
    height: 41,
  },
  contentArea: {
    flex: 1,
  },
  titleText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES['14'],
    color: '#1e1e1e',
  },
  subtitleText: {
    fontSize: FONT_SIZES['12'],
    color: '#1e1e1e',
    fontFamily: 'Rubik-Regular',
  },

  ppvContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFC39933',
    borderWidth: 1,
    borderColor: '#FFC399',
    borderRadius: WIDTH_SIZES['14'],
    padding: 12,
    width: '100%', // fixed width feeling like design
    alignSelf: 'center',
    marginVertical: WIDTH_SIZES['16'],
  },

  ppvIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFA560',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#1e1e1e',
  },

  ppvIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },

  ppvContent: {
    flex: 1,
  },

  ppvText: {
    fontSize: 14,
    color: '#1E1E1E',
    fontFamily: 'Rubik-Regular',
  },

  ppvBold: {
    fontFamily: 'Rubik-Bold',
  },

  ppvBadge: {
    marginTop: 10,
    backgroundColor: '#FFA560',
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#000',
  },

  ppvBadgeText: {
    fontSize: 14,
    fontFamily: 'Rubik-SemiBold', // IMPORTANT
    color: '#000',
  },

  imageRadius: {
    borderTopLeftRadius: WIDTH_SIZES['12'],
    borderTopRightRadius: WIDTH_SIZES['12'],
  },

  centeredPlayIcon: {
    position: 'absolute',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  coinImageSmall: {
    height: responsiveWidth(4.5),
    width: responsiveWidth(4.5),
    resizeMode: 'contain',
    alignSelf: 'center',
    marginLeft: responsiveWidth(1),
  },

  paymentBadgeContainer: {
    paddingHorizontal: WIDTH_SIZES['16'],
    paddingBottom: 14,
    paddingTop: 10,
    width: '100%',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    height: 38,
    width: '100%',
    borderRadius: 10,
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#1E1E1E',
  },

  // Call Request UI Styles
  callRequestContainer: {
    backgroundColor: '#FFF9F5',
    borderWidth: WIDTH_SIZES[1.5],
    borderColor: '#1E1E1E',
    borderRadius: 14,
    padding: WIDTH_SIZES[24],
    width: WIDTH_SIZES[345],
    maxWidth: '92%',
    gap: WIDTH_SIZES[16],
    marginVertical: WIDTH_SIZES[16],
  },
  callRequestHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
  },
  callRequestTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  callRequestIconBadge: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callRequestIcon: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  callRequestTitle: {
    fontFamily: 'Rubik-Bold',
    fontSize: FONT_SIZES[20],
    color: '#101828',
    lineHeight: 24,
    includeFontPadding: false,
  },
  verifiedIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  callRequestBodyText: {
    fontFamily: 'Rubik-Regular',
    fontSize: FONT_SIZES[14],
    lineHeight: 19,
    color: '#1E1E1E',
  },
  callRequestBodyBold: {
    fontFamily: 'Rubik-Bold',
  },
  callRequestButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: WIDTH_SIZES[8],
    marginTop: 8,
  },
  denyButton: {
    width: WIDTH_SIZES[103] || 103, // Using responsive width if available, or fixed with maxWidth safety
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    flex: 1, // To fill remaining space up to 185 if container is wider, or just matching spec
    height: 40,
    backgroundColor: '#FFA86B',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonTextDeny: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 12,
    color: '#000000',
  },
  buttonTextAccept: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 12,
    color: '#000000',
  },
  callRequestFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 36,
    gap: 8,
  },
  pendingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF5353',
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  pendingText: {
    fontFamily: 'Rubik-Bold',
    fontSize: 12,
    color: '#1E1E1E',
    textTransform: 'capitalize',
  },
  callRequestTime: {
    fontFamily: 'Rubik-Regular',
    fontSize: 10,
    color: '#1E1E1E',
  },

  // Call Missed UI Styles
  callMissedContainer: {
    backgroundColor: '#FFA86B',
    borderWidth: WIDTH_SIZES[1.5],
    borderColor: '#1E1E1E',
    borderRadius: 14,
    width: responsiveWidth(92),
    maxWidth: '92%',
    overflow: 'hidden',
    marginVertical: WIDTH_SIZES[16],
  },
  callMissedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: WIDTH_SIZES[24],
    paddingTop: WIDTH_SIZES[24],
    paddingBottom: WIDTH_SIZES[24],
  },
  callMissedTitleBlock: {
    flex: 1,
  },
  callMissedTitle: {
    fontFamily: 'Rubik-Bold',
    fontSize: FONT_SIZES[20],
    color: '#101828',
    marginBottom: 4,
  },
  callMissedSmallTime: {
    fontFamily: 'Rubik-Regular',
    fontSize: FONT_SIZES[14],
    color: '#1E1E1E',
  },
  callMissedIconBadge: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callMissedIcon: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  callMissedInfoSection: {
    backgroundColor: '#FFF9F5',
    borderTopWidth: WIDTH_SIZES[1.5],
    borderColor: '#1E1E1E',
    padding: WIDTH_SIZES[24],
    flexDirection: 'row',
    gap: 10,
  },
  callMissedInfoIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    marginTop: 2,
  },
  callMissedInfoContent: {
    flex: 1,
    gap: 8,
  },
  callMissedInfoTitle: {
    fontFamily: 'Rubik-Bold',
    fontSize: FONT_SIZES[14],
    lineHeight: 18,
    color: '#1E1E1E',
  },
  callMissedInfoBody: {
    fontFamily: 'Rubik-Regular',
    fontSize: FONT_SIZES[12] || 12,
    lineHeight: 18,
    color: '#1E1E1E',
  },
  callMissedButton: {
    backgroundColor: '#FFA86B',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 14,
    height: 48,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  callMissedButtonText: {
    fontFamily: 'Rubik-Bold',
    fontSize: FONT_SIZES[14],
    color: '#000000',
  },

  // Request Expired UI Styles
  callExpiredContainer: {
    backgroundColor: '#FFF9F5',
    borderWidth: WIDTH_SIZES[1.5],
    borderColor: '#1E1E1E',
    borderRadius: 14,
    padding: WIDTH_SIZES[24],
    width: WIDTH_SIZES[345],
    maxWidth: '92%',
    gap: WIDTH_SIZES[16],
    marginVertical: WIDTH_SIZES[16],
  },
  callExpiredIconBadge: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callExpiredIcon: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  callExpiredButton: {
    flex: 1,
    height: 40,
    backgroundColor: '#FFA86B',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  callExpiredButtonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES[12] || 12,
    color: '#000000',
  },

  // Call Scheduled UI Styles
  callScheduledContainer: {
    backgroundColor: '#FFF9F5',
    borderWidth: WIDTH_SIZES[1.5],
    borderColor: '#1E1E1E',
    borderRadius: 14,
    padding: WIDTH_SIZES[24],
    width: WIDTH_SIZES[345],
    maxWidth: '92%',
    gap: WIDTH_SIZES[16],
    marginVertical: WIDTH_SIZES[16],
    alignItems: 'center',
  },
  callScheduledHeader: {
    alignItems: 'center',
    gap: WIDTH_SIZES[14],
  },
  callScheduledIconBadge: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callScheduledIcon: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  callScheduledTitle: {
    fontFamily: 'Rubik-Bold',
    fontSize: FONT_SIZES[20],
    color: '#101828',
    textAlign: 'center',
  },
  callScheduledSubtitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: FONT_SIZES[14],
    lineHeight: 19,
    color: '#1E1E1E',
    textAlign: 'center',
  },
  callScheduledTimeSection: {
    backgroundColor: '#FFFFFF',
    borderWidth: WIDTH_SIZES[1.5],
    borderColor: '#FFA86B',
    borderRadius: 16,
    width: '100%',
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callScheduledTimeText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES[18],
    color: '#1E1E1E',
    textAlign: 'center',
  },
  callScheduledInfoText: {
    fontFamily: 'Rubik-Regular',
    fontSize: FONT_SIZES[12] || 12,
    lineHeight: 18,
    color: '#1E1E1E',
    textAlign: 'center',
  },
  callScheduledBold: {
    fontFamily: 'Rubik-Bold',
  },
  callScheduledButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#FFA86B',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callScheduledButtonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 14,
    color: '#000000',
  },

  // Call Details UI Styles
  callDetailsContainer: {
    marginVertical: 4,
    width: responsiveWidth(64), // 240px
  },
  callDetailsBubbleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFC399',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 14,
    borderBottomRightRadius: 0,
    paddingHorizontal: 10,
    height: responsiveWidth(16.2), // 61px
    width: '100%',
  },
  callDetailsBubbleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 14,
    borderBottomLeftRadius: 0,
    paddingHorizontal: 10,
    height: responsiveWidth(16.2), // 61px
    width: '100%',
  },
  callDetailsIconContainer: {
    width: 41,
    height: 41,
    borderRadius: 10.6,
    borderWidth: 1.1,
    borderColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callDetailsIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  callDetailsContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  callDetailsTitle: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 14,
    color: '#1E1E1E',
    lineHeight: 17,
  },
  callDetailsDuration: {
    fontFamily: 'Rubik-Regular',
    fontSize: 12,
    color: '#1E1E1E',
    lineHeight: 12,
    marginTop: 2,
  },
  callDetailsAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  callDetailsAmount: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 18,
    color: '#1E1E1E',
  },
  callDetailsCoinImage: {
    width: 18.22,
    height: 18.4,
    resizeMode: 'contain',
    marginTop: -1, // Subtle nudge up if user says it looks "downwards"
  },
  callDetailsRupee: {
    fontSize: 8,
    fontFamily: 'Rubik-Bold',
    color: '#1E1E1E',
  },
});
