import React, { useEffect, useState, useRef, useLayoutEffect, useCallback } from 'react';
import { Audio } from 'expo-av';
import RingtoneManager from './RingtoneManager';
import { View, Text, StyleSheet, TouchableOpacity, PermissionsAndroid, Platform, BackHandler, Alert, ActivityIndicator, AppState } from 'react-native';
import { responsiveHeight, responsiveWidth, responsiveFontSize } from 'react-native-responsive-dimensions';
import Back from '../../../Assets/svg/back.svg';
import { Image } from 'expo-image';
import { FONT_SIZES, WIDTH_SIZES } from '../../../DesiginData/Utility';
import { useNavigation } from '@react-navigation/native';
import ZegoExpressEngine, { ZegoRoomConfig, ZegoScenario, ZegoAudioRoute } from 'zego-express-engine-reactnative';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { useCallAcceptManualMutation, useLazyGetCallTokenQuery, useLazyRenewTokenCallQuery, useLeaveCallMutation, useRejectCallMutation } from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { useDispatch, useSelector } from 'react-redux';
import DeviceInfo from 'react-native-device-info';
import TimerText from './TimerText';
import axios from 'axios';
import { navigate } from '../../../Navigation/RootNavigation';
import { setCallRejected, clearAcceptedRoomId, clearProcessedRoomId } from '../../../Redux/Slices/NormalSlices/Call/CallSlice';
import StreamEndedUserModal from '../../Screens/Stream/StreamEndedUserModal';
import { toggleCallAccepted, toggleNewMessageRecieved } from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import { LoginPageErrors } from '../ErrorSnacks';
import NetworkQualityBadge from './NetworkQualityBadge';
import { useKeepAwake } from '@sayem314/react-native-keep-awake';
import { ZEGO_APP_ID, ZEGO_APP_SIGN } from '../../Configs/ZegoConfig';
import CallingStatusText from './CallingStatusText';
import { AppLog } from '../../Utils/Logger';
import { useCallStatusPolling } from './useCallStatusPolling';
import { CallDebugConsole } from './CallDebugConsole';
import { shouldTreatBlurAsCallEnd } from './callLifecycle';
import { getLocalCallTerminationStatus } from './callFlow';

const requestMicrophonePermission = async () => {
  if (Platform.OS === 'ios') {
    const result = await request(PERMISSIONS.IOS.MICROPHONE);
    return result === RESULTS.GRANTED;
  } else if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  return false;
};

const handleIcon = {
  micMute: require('../../../Assets/Images/callMute.png'),
  micUnMute: require('../../../Assets/Images/unnamed.png'),
  speakerMute: require('../../../Assets/Images/callSpeaker.png'),
  speakerUnMute: require('../../../Assets/Images/speakerMuted.png'),
};

// 🔒 MODULE-LEVEL guard: tracks roomIds that have already sent UNAVAILABLE.
// This is OUTSIDE the component so it survives re-mounts, React 19 double-invocations,
// and any scenario where multiple component instances could exist.
const _unavailableSentForRoom = new Set();
let _callScreenMountCount = 0;

const CallScreen = ({ route }) => {
  console.log(route?.params, '`params`');
  useKeepAwake();

  const navigation = useNavigation();
  const ringtoneRef = useRef(null);
  const callAcceptedRef = useRef(route?.params?.callAccepted || false);
  const isCallEndedRef = useRef(false);
  const timeoutIdRef = useRef(null);
  const hasNavigatedAwayRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  const { token, currentUserId, currentUserDisplayName } = useSelector(state => state.auth.user);
  const callAccepted = useSelector(state => state.hideShow.visibility.callAccepted);

  const stopAndUnloadRingtone = useCallback(async () => {
    RingtoneManager.stopAll();
  }, []);

  // Receiver Accept path — kill leftover incoming ring hard.
  // Caller path — soft stop only (outgoing ring starts next).
  useEffect(() => {
    if (route?.params?.callAccepted) {
      RingtoneManager.stopAndSuppress(route?.params?.roomId);
    } else {
      RingtoneManager.stopAll();
    }
  }, []);

  useEffect(() => {
    if (callAccepted) {
      callAcceptedRef.current = true;
      RingtoneManager.stopAll();
    }
  }, [callAccepted]);
  const isEngineActive = useRef(false);
  const isMounted = useRef(true);

  const [callDetails, setCallDetails] = useState({});
  const [callStreamEndModal, setCallStreamEndModal] = useState(false);
  const [endTriggerSource, setEndTriggerSource] = useState('LOCAL');
  const [isInMute, setIsInMute] = useState(false);
  const [isSpeakerInMute, setIsSpeakerInMute] = useState(false);
  const [isOtherUserInRoom, setIsOtherUserInRoom] = useState(false);
  const [networkQuality, setNetworkQuality] = useState(0);
  const [isEndingCall, setIsEndingCall] = useState(false);

  const dispatch = useDispatch();

  const [getCallToken] = useLazyGetCallTokenQuery();
  const [renewTokenCall] = useLazyRenewTokenCallQuery();
  const [leaveCall] = useLeaveCallMutation();
  const [rejectCall] = useRejectCallMutation();
  const [callAcceptManual] = useCallAcceptManualMutation();

  // Require both ids — missing callerId must NOT treat receiver as caller (sends false UNAVAILABLE).
  const IS_STARTING =
    !!currentUserId &&
    !!route?.params?.callerId &&
    String(currentUserId) === String(route.params.callerId);

  const { logs, clearLogs } = useCallStatusPolling({
    roomId: route?.params?.roomId,
    token,
    enabled: !isCallEndedRef.current && (IS_STARTING || callAccepted),
    callAccepted,
    onCallAccepted: () => {
      console.log('🔄 [Polling] Call accepted, dispatching toggleCallAccepted');
      dispatch(toggleCallAccepted({ status: true }));
    },
    onCallRejected: () => {
      console.log('🔄 [Polling] Call rejected, exiting...');
      setEndTriggerSource('POLLING');
      stopAndUnloadRingtone();
      dispatch(toggleCallAccepted({ status: false }));
      if (route?.params?.callId) dispatch(clearProcessedRoomId(route.params.callId));
      LoginPageErrors('Call Rejected...');
      handleLogout(true);
    },
    onCallUnavailable: () => {
      // Callee just accepted — server often still returns UNAVAILABLE while creator waits.
      // Only the creator (IS_STARTING) should treat UNAVAILABLE as "user not answering".
      if (!IS_STARTING) {
        console.log('🔄 [Polling] Ignoring UNAVAILABLE for callee (creator may still be ringing)');
        return;
      }
      console.log('🔄 [Polling] Call unavailable, exiting...');
      setEndTriggerSource('POLLING');
      stopAndUnloadRingtone();
      dispatch(toggleCallAccepted({ status: false }));
      if (route?.params?.callId) dispatch(clearProcessedRoomId(route.params.callId));
      LoginPageErrors('User not receiving the call');
      handleLogout(true);
    },
    onCallEnded: (status) => {
      // While still ringing, ignore flaky DISCONNECTED — but LEAVE/ENDED/COMPLETED = creator cut.
      const upper = String(status || '').toUpperCase();
      if (!callAcceptedRef.current && upper === 'DISCONNECTED') {
        console.log('🔄 [Polling] Ignoring DISCONNECTED while ringing');
        return;
      }
      console.log(`🔄 [Polling] Call ended with status: ${status}`);
      setEndTriggerSource('POLLING');
      stopAndUnloadRingtone();
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      dispatch(toggleCallAccepted({ status: false }));
      handleLogout(true);
    },
  });

  // 🔧 One-shot trigger: when callAccepted becomes true, set this to true to trigger engine init.
  // Unlike putting callAccepted in the dep array, this only goes false→true (never back), so
  // it won't cause the engine to be destroyed/re-created when callAccepted flickers.
  // ⚠️ IS_STARTING must be defined BEFORE this line.
  const [shouldInitEngine, setShouldInitEngine] = useState(!IS_STARTING);

  // 🔥 Configure Navigation Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: route?.params?.name || 'Call',
      headerTitleStyle: {
        fontFamily: 'Rubik-Bold',
        fontSize: responsiveFontSize(2),
        color: '#1e1e1e',
      },
      headerTitleAlign: 'left',
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: '#fff',
      },
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => handleLogout(false)}
          style={{ marginLeft: 0, paddingRight: 10 }}>
          <Back />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={{ marginRight: 10 }}>
          <NetworkQualityBadge quality={networkQuality} />
        </View>
      ),
    });
  }, [navigation, route?.params?.name, networkQuality, isOtherUserInRoom]); // Added dependencies

  // 🔥 Receiver already accepted the call before landing here, so set callAccepted immediately
  useEffect(() => {
    if (!IS_STARTING) {
      dispatch(toggleCallAccepted({ status: true }));
    }

    return () => {
      isMounted.current = false;
    };
  }, []);

  console.log('CALL_JO', Platform.OS, callAccepted);

  useEffect(() => {
    if (!IS_STARTING) return; // Only the caller (creator) plays ringtone
    
    let isCancelled = false;
    
    // 🍎 iOS: Audio.setAudioModeAsync doesn't destructively hijack the route 
    // the same way react-native-sound does, so it's safer alongside ZEGO.
    const playRingtone = async () => {
      try {
        if (isCancelled || callAcceptedRef.current || isCallEndedRef.current) {
          console.log('🔕 Call already accepted or ended, skipping outgoing ringtone play');
          return;
        }

        await RingtoneManager.playOutgoing();
      } catch (error) {
        console.log('❌ Failed to play outgoing call ringtone:', error);
      }
    };

    playRingtone();

    // Cleanup on unmount
    return () => {
      isCancelled = true;
      stopAndUnloadRingtone();
    };
  }, []);

  // Stop ringtone when call is accepted
  useEffect(() => {
    if (!callAccepted) return;
    stopAndUnloadRingtone();
    // Reset audio session for ZEGO capture/playback (both platforms)
    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    }).catch(err => console.log('expo-av audio mode reset error:', err));
  }, [callAccepted]);

  async function streamHasEndedModalOkay() {
    if (hasNavigatedAwayRef.current) return;
    hasNavigatedAwayRef.current = true;
    try {
      if (isEngineActive.current) {
        await ZegoExpressEngine.instance().stopPlayingStream();
        await ZegoExpressEngine.instance().logoutRoom(callDetails.callRoomId || `call_${route?.params?.roomId}`);
      }
    } catch (error) {
      console.log('⚠️ Error during stream end cleanup:', error);
    } finally {
      setCallStreamEndModal(false);
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigate('home');
      }
    }
  }

  async function leaveCallHandler() {
    try {
      const { data, error } = await leaveCall({ token, data: { roomId: route?.params?.roomId } });
      if (data) console.log(data, 'Leave call success');
      if (error) console.log(error, 'Leave call error');
    } catch (error) {
      console.log('⚠️ Exception in leaveCallHandler:', error);
    }
  }

  async function rejectCallHandler() {
    try {
      const { data, error } = await callAcceptManual({
        token,
        data: {
          roomId: route?.params?.roomId,
          callType: route?.params?.callType || 'audio',
          status: 'REJECTED',
        },
      });
      if (data) {
        console.log(data, 'Cancel/Reject via callAccept success');
        return;
      }
      if (error) console.log(error, 'callAccept REJECTED error — trying reject-call');
    } catch (error) {
      console.log('⚠️ callAccept REJECTED exception — trying reject-call:', error);
    }
    try {
      const { data, error } = await rejectCall({
        token,
        data: {
          roomId: route?.params?.roomId,
          callType: route?.params?.callType || 'audio',
          userId: currentUserId,
        },
      });
      if (data) console.log(data, 'Reject call success');
      if (error) console.log(error, 'Reject call error');
    } catch (error) {
      console.log('⚠️ Exception in rejectCallHandler:', error);
    }
  }

  const leaveCallUi = () => {
    if (hasNavigatedAwayRef.current) return;
    hasNavigatedAwayRef.current = true;
    try {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigate('home');
      }
    } catch (_) {
      navigate('home');
    }
  };

  const handleMic = async () => {
    try {
      if (isEngineActive.current) {
        let x = await ZegoExpressEngine.instance().isMicrophoneMuted();
        if (!x) {
          await ZegoExpressEngine.instance().muteMicrophone(true);
          setIsInMute(true);
        } else {
          await ZegoExpressEngine.instance().muteMicrophone(false);
          setIsInMute(false);
        }
      }
    } catch (error) {
      console.log('⚠️ Error toggling microphone:', error);
    }
  };

  const handleSpeaker = async () => {
    try {
      if (isEngineActive.current) {
        const newMuteState = !isSpeakerInMute;
        // Mute/unmute speaker audio (always stays on speaker, no earpiece)
        await ZegoExpressEngine.instance().muteSpeaker(newMuteState);
        setIsSpeakerInMute(newMuteState);
      }
    } catch (error) {
      console.log('⚠️ Error toggling speaker:', error);
    }
  };

  const handleLogout = async fromSocket => {
    // Escape hatch: already "ended" but still stuck → force leave.
    if (isCallEndedRef.current) {
      console.log(`⛔ handleLogout already ended — force leave UI [room=${route?.params?.roomId}]`);
      leaveCallUi();
      return;
    }
    setEndTriggerSource(prev => {
      if (prev && prev !== 'LOCAL') return prev;
      return fromSocket ? 'SOCKET/FCM' : 'USER';
    });
    // Snapshot BEFORE any Redux reset / navigate — after BG resume callAccepted
    // can flicker false; we must still POST /leave so chat gets CALL_DETAILS + attempts.
    const wasCallAccepted =
      !!callAcceptedRef.current ||
      !!callAccepted ||
      !!route?.params?.callAccepted ||
      !!isOtherUserInRoom;
    console.log(
      `🔴 [handleLogout] ENTERED room=${route?.params?.roomId} fromSocket=${fromSocket} wasAccepted=${wasCallAccepted}`,
    );
    isCallEndedRef.current = true;
    setIsEndingCall(true);

    stopAndUnloadRingtone();
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }

    try {
      if (isEngineActive.current) {
        const engine = ZegoExpressEngine.instance();
        if (engine) {
          engine.stopPlayingStream?.();
          engine.logoutRoom?.(callDetails.callRoomId || `call_${route?.params?.roomId}`);
        }
        isEngineActive.current = false;
      }
    } catch (error) {
      console.log('⚠️ ZEGO already destroyed or instance failed:', error.message);
    }

    // BUG_13: hangup API MUST complete before unmount — navigating first cancelled
    // /leave and left chat without Call Completed + callTries stuck at 0.
    if (!fromSocket) {
      const terminationStatus = getLocalCallTerminationStatus({
        callAccepted: wasCallAccepted,
      });
      try {
        await Promise.race([
          terminationStatus === 'LEAVE' ? leaveCallHandler() : rejectCallHandler(),
          new Promise(resolve => setTimeout(resolve, 5000)),
        ]);
        console.log(`✅ [handleLogout] hangup API done status=${terminationStatus}`);
      } catch (err) {
        console.log('⚠️ hangup API timed out/failed:', err?.message || err);
      }
    }

    dispatch(toggleCallAccepted({ status: false }));
    // Nudge ChatWindow now + shortly after so CALL_DETAILS / callTries land.
    dispatch(toggleNewMessageRecieved());
    setTimeout(() => {
      try {
        dispatch(toggleNewMessageRecieved());
      } catch (_) {}
    }, 1200);

    leaveCallUi();
  };

  // Remote reject / cancel (FCM or markIncomingCallEndedSync) — cut "Notifying/attempts" immediately.
  useEffect(() => {
    const roomId = route?.params?.roomId;
    const callId = route?.params?.callId;
    if (!roomId) return undefined;
    const { subscribeCallIntent } = require('../../Utils/callAcceptFlow');
    return subscribeCallIntent(({ type, callData }) => {
      if (type !== 'REJECTED' && type !== 'UNAVAILABLE' && type !== 'ENDED') return;
      const sameRoom =
        callData?.roomId != null && String(callData.roomId) === String(roomId);
      if (!sameRoom) return;
      const sameCall =
        !callId ||
        !callData?.callId ||
        String(callData.callId) === String(callId);
      if (!sameCall) return;
      if (isCallEndedRef.current) return;
      console.log('📱 [CallScreen] Remote end intent — hang up', type);
      setEndTriggerSource('SOCKET/FCM');
      stopAndUnloadRingtone();
      dispatch(toggleCallAccepted({ status: false }));
      if (callId) dispatch(clearProcessedRoomId(callId));
      if (type === 'REJECTED') LoginPageErrors('Call Rejected...');
      handleLogout(true);
    });
  }, [route?.params?.roomId, route?.params?.callId, dispatch, stopAndUnloadRingtone]);

  // 🔥 Keep callAcceptedRef in sync with Redux state
  useEffect(() => {
    callAcceptedRef.current = callAccepted;
    // 🔧 When callAccepted becomes true for the first time, trigger engine init (one-shot)
    if (callAccepted) {
      if (!shouldInitEngine) {
        setShouldInitEngine(true);
      }
      if (timeoutIdRef.current) {
        console.log(`⏰ [CallScreen] Call accepted! Immediately clearing the 60s ringing timeout.`);
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    }
  }, [callAccepted]);

  // 🔥 Bulletproof 60-second timeout — set ONCE, never resets
  useEffect(() => {
    if (!IS_STARTING) return; // Only for caller

    const mountId = ++_callScreenMountCount;
    const roomId = route?.params?.roomId;
    console.log(`⏰ [CallScreen:Mount#${mountId}] Starting 60-second timeout for room ${roomId}`);
    console.log(`⏰ [CallScreen:Mount#${mountId}] Refs: isMounted=${isMounted.current}, isCallEnded=${isCallEndedRef.current}, hasNavigatedAway=${hasNavigatedAwayRef.current}, callAccepted=${callAcceptedRef.current}`);
    console.log(`⏰ [CallScreen:Mount#${mountId}] Module guard _unavailableSentForRoom: [${[..._unavailableSentForRoom].join(', ')}]`);

    timeoutIdRef.current = setTimeout(async () => {
      console.log(`⏰ [CallScreen:Mount#${mountId}] Timeout FIRED for room ${roomId}`);
      console.log(`⏰ [CallScreen:Mount#${mountId}] Guard check: callAccepted=${callAcceptedRef.current}, isMounted=${isMounted.current}, isCallEnded=${isCallEndedRef.current}`);
      console.log(`⏰ [CallScreen:Mount#${mountId}] Module guard has room? ${_unavailableSentForRoom.has(roomId)}`);

      // 🔒 MODULE-LEVEL guard: prevent duplicate UNAVAILABLE across any re-mounts/instances
      if (_unavailableSentForRoom.has(roomId)) {
        console.log(`⛔ [CallScreen:Mount#${mountId}] BLOCKED by module-level guard — UNAVAILABLE already sent for room ${roomId}`);
        return;
      }

      if (!callAcceptedRef.current && isMounted.current && !isCallEndedRef.current) {
        // 🔒 Mark as ended FIRST so nothing else can fire
        isCallEndedRef.current = true;
        _unavailableSentForRoom.add(roomId);
        console.log(`⏰ [CallScreen:Mount#${mountId}] 60 seconds passed, call not accepted - sending UNAVAILABLE for room ${roomId}`);
        try {
          await callAcceptManual({
            token,
            data: {
              roomId: roomId,
              callType: route?.params?.callType || 'audio',
              status: 'UNAVAILABLE',
            },
          });
          console.log(`✅ [CallScreen:Mount#${mountId}] UNAVAILABLE API call completed for room ${roomId}`);
        } catch (error) {
          console.log(`❌ [CallScreen:Mount#${mountId}] Error sending UNAVAILABLE:`, error);
        } finally {
          if (isMounted.current && !hasNavigatedAwayRef.current) {
            hasNavigatedAwayRef.current = true;
            LoginPageErrors('User not receiving the call');
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigate('home');
            }
          }
        }
      } else {
        console.log(`⛔ [CallScreen:Mount#${mountId}] Timeout SKIPPED — guards blocked. callAccepted=${callAcceptedRef.current}, isMounted=${isMounted.current}, isCallEnded=${isCallEndedRef.current}`);
      }
    }, 60000);

    return () => {
      console.log(`⏰ [CallScreen:Mount#${mountId}] Timeout CLEANUP for room ${roomId}`);
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };
  }, []); // ← Empty deps = runs once, never resets

  // Disable back button
  useEffect(() => {
    let x = BackHandler.addEventListener('hardwareBackPress', () => {
      handleLogout(false);
      return true;
    });
    return () => x.remove();
  }, [isOtherUserInRoom]); // Dependency on isOtherUserInRoom for handleLogout

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      appStateRef.current = nextAppState;
      if (nextAppState === 'background') {
        console.log('📱 [CallScreen] App moved to background; keeping call active.');
      }
    });

    return () => subscription.remove();
  }, []);

  // 🧭 Blur: cancel for remote. Do NOT pre-set hasNavigatedAwayRef (soft-bricked End Call).
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      console.log(`🧭 [CallScreen] BLUR event fired - user navigated away from room ${route?.params?.roomId} (appState=${appStateRef.current})`);
      if (!isCallEndedRef.current && shouldTreatBlurAsCallEnd({ appState: appStateRef.current, isCallEnded: isCallEndedRef.current })) {
        handleLogout(false);
      } else {
        console.log('🧭 [CallScreen] BLUR ignored while app is backgrounded; keeping call alive');
      }
    });
    return unsubscribe;
  }, [navigation, route?.params?.roomId]);

  // Fetch call token
  useEffect(() => {
    async function getTokenFromServer() {
      const { data, error } = await getCallToken({ token, roomId: route?.params?.roomId });
      if (data) {
        console.log('Success API', data);
        setCallDetails({ token: data?.data?.TOKEN, roomId: route?.params?.roomId, callRoomId: data?.data?.callRoomId });
      }
      if (error) {
        console.log('Error api', error, DeviceInfo.isEmulatorSync());
      }

      console.log("EMOJI", data)
    }

    getTokenFromServer();
  }, [token, route?.params?.roomId]);

  // 🔥 Initialize ZEGO - Fixed: listeners before permissions, no callAccepted in deps
  useEffect(() => {
  // Wait for call acceptance if starting (use ref to avoid dep array issues)
    if (IS_STARTING && !shouldInitEngine) {
      console.log('⏳ Waiting for call to be accepted...');
      AppLog('CALL', 'Waiting for call acceptance (Caller side)', { roomId: route?.params?.roomId });
      return;
    }

    // Wait for token
    if (!callDetails.token) {
      console.log('⏳ Waiting for call token...');
      return;
    }

    console.log('🚀 Initializing ZEGO engine...');
    AppLog('CALL', 'Initializing ZEGO engine', { roomId: callDetails.roomId, isStarting: IS_STARTING });

    const initEngine = async () => {
      const profile = {
        appID: ZEGO_APP_ID,
        appSign: ZEGO_APP_SIGN,
        scenario: ZegoScenario.StandardVoiceCall,
      };

      try {
        console.log('🔄 [CallScreen:ZEGO] Setting Expo AV audio mode...');
        // 🍎 Explicitly set audio mode BEFORE ZEGO engine creation
        // Must be awaited to guarantee the session is ready
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });
        console.log('✅ [CallScreen:ZEGO] Expo AV audio mode set successfully.');

        console.log('🔄 [CallScreen:ZEGO] Creating Engine with Profile...');
        const engine = await ZegoExpressEngine.createEngineWithProfile(profile);
        console.log('✅ [CallScreen:ZEGO] ZEGO engine created successfully.');
        if (!isMounted.current) {
          ZegoExpressEngine.destroyEngine();
          return;
        }
        isEngineActive.current = true;

        // 🔧 FIX: Attach event listeners IMMEDIATELY after engine creation,
        // BEFORE the permission request, so we never miss a stream event.
        engine.on('roomStateUpdate', (roomID, state, errorCode, extendedData) => {
          console.log(`📡 [CallScreen:ZEGO] roomStateUpdate: roomID=${roomID}, state=${state}, errorCode=${errorCode}`);
          AppLog('ZEGO_STATE', 'ZEGO Room State Update', { roomID, state, errorCode, extendedData });
        });

        engine.on('roomUserUpdate', (roomID, updateType, userList) => {
          console.log(`📡 [CallScreen:ZEGO] roomUserUpdate: roomID=${roomID}, updateType=${updateType}, usersCount=${userList?.length}`);
          if (!isMounted.current) return;
          if (updateType === 0) {
            const otherUser = userList.find(user => user.userID !== currentUserId);
            if (otherUser) setIsOtherUserInRoom(true);
          } else if (updateType === 1) {
            setIsOtherUserInRoom(false);
          }
        });

        engine.on('roomStreamUpdate', async (roomID, updateType, streamList) => {
          if (!isMounted.current) return;
          if (updateType === 1) { // Stream removed
            console.log('❌ Stream removed (ZEGO DISCONNECT)');
            AppLog('CALL', 'Remote stream removed', { roomID });
            setEndTriggerSource('ZEGO_SDK');
            dispatch(toggleCallAccepted({ status: false }));
            setCallStreamEndModal(true);
            return;
          }
          if (streamList?.length > 0 && isEngineActive.current) {
            engine.startPlayingStream(streamList[0]?.streamID);
            // Keep earpiece for audio calls — user can toggle to speaker manually
            AppLog('CALL', 'Started playing remote stream', { streamID: streamList[0]?.streamID });
          }
        });

        engine.on('playerStateUpdate', (streamID, state, errorCode, extendedData) => {
          AppLog('ZEGO_RECEIVING_STATE', `Player state update`, { streamID, state, errorCode, os: Platform.OS });
        });
        
        engine.on('publisherStateUpdate', (streamID, state, errorCode, extendedData) => {
          AppLog('ZEGO_SENDING_STATE', `Publisher state update`, { streamID, state, errorCode, os: Platform.OS });
        });

        engine.on('remoteMicStateUpdate', (streamID, state) => {
          AppLog('REMOTE_MIC_STATE', `Remote microphone state updated`, { streamID, state, os: Platform.OS });
        });

        engine.on('publisherQualityUpdate', (streamID, quality) => {
          if (!isMounted.current) return;
          const mapping = { 0: 1, 1: 2, 2: 3, 3: 5 };
          setNetworkQuality(mapping[quality.level] ?? 0);
        });

        console.log('🔄 [CallScreen:ZEGO] Requesting Microphone Permission...');
        // 🔧 Now request permission (listeners already attached, so no race condition)
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission || !isMounted.current) {
          console.log('❌ [CallScreen:ZEGO] Microphone permission denied or unmounted');
          AppLog('CALL', 'Microphone permission denied', { roomId: callDetails.roomId });
          return;
        }
        console.log('✅ [CallScreen:ZEGO] Microphone Permission GRANTED.');

        // Login & Publish
        const roomConfig = new ZegoRoomConfig();
        roomConfig.isUserStatusNotify = true;
        roomConfig.token = callDetails.token;

        console.log('🔄 [CallScreen:ZEGO] Enabling capture devices and setting audio route to speaker...');
        await engine.enableCamera(false);
        await engine.enableAudioCaptureDevice(true);
        // 🔧 Force speaker for audio calls (user can mute/unmute speaker)
        await engine.setAudioRouteToSpeaker(true);
        console.log('✅ [CallScreen:ZEGO] Audio devices configured.');

        const myStreamID = 'stream_' + currentUserId;
        
        console.log(`🔄 [CallScreen:ZEGO] Logging into Room: ${callDetails.callRoomId} as userID: ${currentUserId}`);
        // Login room first, sequentially, to prevent race conditions
        await engine.loginRoom(
          callDetails.callRoomId,
          { userID: currentUserId, userName: currentUserDisplayName },
          roomConfig
        );
        console.log('✅ [CallScreen:ZEGO] engine.loginRoom() completed successfully.');

        console.log(`🔄 [CallScreen:ZEGO] Starting to publish stream: ${myStreamID}`);
        await engine.startPublishingStream(myStreamID);
        console.log('✅ [CallScreen:ZEGO] engine.startPublishingStream() completed successfully.');
        
        AppLog('CALL', 'Logged into room and started publishing (Sequential)', { roomId: callDetails.roomId, streamID: myStreamID });

      } catch (error) {
        console.error('❌ [CallScreen:ZEGO] Failed during engine initialization/login:', error);
        AppLog('ZEGO_ERROR', 'Failed to initialize ZEGO engine', { error: error?.message || error, stack: error?.stack, roomId: callDetails.roomId });
      }
    };

    initEngine();

    return () => {
      console.log('componentWillUnmount');
      try {
        if (isEngineActive.current) {
          console.log('[LZP] destroyEngine');
          ZegoExpressEngine.destroyEngine();
          isEngineActive.current = false;
        }
      } catch (e) {
        console.log('ZEGO engine already destroyed or instance check failed');
      }
    };
    // 🔧 FIX: Removed callAccepted from deps to prevent mid-call engine destruction.
    // shouldInitEngine is a one-shot trigger that only ever goes false→true.
  }, [callDetails, shouldInitEngine, currentUserId, currentUserDisplayName]);

  // 🔥 Cleanup on unmount — mark refs FIRST to block any pending async work
  useEffect(() => {
    return () => {
      console.log('CallScreen unmounting, resetting callAccepted for room', route?.params?.roomId);
      // 🔒 Set refs FIRST so any pending setTimeout/async callbacks are blocked
      isMounted.current = false;
      isCallEndedRef.current = true;
      hasNavigatedAwayRef.current = true;
      // Clear any remaining timeout
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      stopAndUnloadRingtone();
      dispatch(toggleCallAccepted({ status: false }));
      // Clear this roomId from accepted list so the same room can be re-accepted
      if (route?.params?.roomId) {
        dispatch(clearAcceptedRoomId(route.params.roomId));
        // 🔒 Clean up module-level guard after unmount so future calls to same room work
        _unavailableSentForRoom.delete(route.params.roomId);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.outerCircle}>
          <View style={styles.innerCircle}>
            <Image source={{ uri: route?.params?.profileImageUrl }} style={styles.profileImage} />
          </View>
        </View>
        {/* Timer only when both sides are actually in-call.
            Callee used to show 00:0x while caller was still "Notifying..." */}
        {callAccepted && (IS_STARTING || isOtherUserInRoom) ? (
          <TimerText
            accepted={callAccepted}
            totalDuration={route?.params?.totalDuration}
            onTimerExpire={() => {
              if (IS_STARTING) {
                handleLogout(false);
              }
            }}
          />
        ) : (
          <CallingStatusText username={route?.params?.name} />
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* <TouchableOpacity style={styles.controlBtn} onPress={() => handleMic()}>
          <Image source={isInMute ? handleIcon.micMute : handleIcon.micUnMute} style={styles.iconStyle} />
        </TouchableOpacity> */}
        <TouchableOpacity style={styles.controlBtn} onPress={() => handleSpeaker()}>
          <Image source={isSpeakerInMute ? handleIcon.speakerUnMute : handleIcon.speakerMute} style={styles.iconStyle} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.controlBtn, styles.endCallBtn]} 
          onPress={() => handleLogout(false)}
          disabled={isEndingCall}
        >
          {isEndingCall ? (
            <ActivityIndicator color="#1e1e1e" size="small" />
          ) : (
            <Image source={require('../../../Assets/Images/callTelephone.png')} style={styles.iconStyle} />
          )}
        </TouchableOpacity>

        <StreamEndedUserModal visible={callStreamEndModal} onPress={streamHasEndedModalOkay} title="Call terminated" />
      </View>
      <CallDebugConsole logs={logs} onClear={clearLogs} />
    </View>
  );
};

export default CallScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  timerBelowProfile: {
    marginTop: 16,
  },
  rightInfo: {
    flexDirection: 'row',
    gap: 6,
  },
  timerCoinBox: {
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: WIDTH_SIZES['1.5'],
  },
  coinTimerText: {
    fontFamily: 'Rubik-Medium',
    fontSize: FONT_SIZES['10'],
    color: '#1e1e1e',
  },
  profileSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  ringingText: {
    marginTop: 12,
    fontSize: responsiveFontSize(2),
    color: '#888',
    fontFamily: 'Rubik-Regular',
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    backgroundColor: '#FFF9F5',
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  controlBtn: {
    width: 50,
    height: 50,
    borderRadius: WIDTH_SIZES['14'],
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#1e1e1e',
  },
  endCallBtn: {
    backgroundColor: '#FF8580',
  },
  iconStyle: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  verifyContainer: {
    width: 15,
    height: 14.32,
  },
  hiddenView: {
    width: 1,
    height: 1,
    opacity: 0,
  },
});
