import React, { useEffect, useState, useRef, useLayoutEffect, useCallback } from 'react';
import { Audio } from 'expo-av';
import RingtoneManager from './RingtoneManager';
import { View, Text, StyleSheet, TouchableOpacity, PermissionsAndroid, Platform, BackHandler, StatusBar, Pressable, findNodeHandle, Animated as RNAnimated, ActivityIndicator, Dimensions, AppState } from 'react-native';
import { responsiveHeight, responsiveWidth, responsiveFontSize } from 'react-native-responsive-dimensions';
import Back from '../../../Assets/svg/back.svg';
import { Image } from 'expo-image';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import {FONT_SIZES, WIDTH_SIZES} from '../../../DesiginData/Utility';
import {useNavigation} from '@react-navigation/native';
import ZegoExpressEngine, {ZegoAudioRoute, ZegoRoomConfig, ZegoScenario, ZegoTextureView, ZegoVideoCodecID, ZegoViewMode} from 'zego-express-engine-reactnative';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {useCallAcceptManualMutation, useLazyGetCallTokenQuery, useLazyRenewTokenCallQuery, useLeaveCallMutation, useRejectCallMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useDispatch, useSelector} from 'react-redux';
import DeviceInfo from 'react-native-device-info';
import TimerText from './TimerText';
import axios from 'axios';
import {navigate} from '../../../Navigation/RootNavigation';
import StreamEndedUserModal from '../../Screens/Stream/StreamEndedUserModal';
import CallingStatusText from './CallingStatusText';
import CallingTip from './CallingTip';
import {updateWallet} from '../../../Redux/Slices/NormalSlices/Wallet/WalletSlice';
import {setLatestTip, toggleCallAccepted, toggleCallTipModal, toggleNewMessageRecieved} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {clearAcceptedRoomId, clearProcessedRoomId} from '../../../Redux/Slices/NormalSlices/Call/CallSlice';
import {LoginPageErrors} from '../ErrorSnacks';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Wall from '../../../Assets/svg/wall.svg';
import NetworkQualityBadge from './NetworkQualityBadge';
import { ZEGO_APP_ID, ZEGO_APP_SIGN } from '../../Configs/ZegoConfig';
import { useKeepAwake } from '@sayem314/react-native-keep-awake';
import { AppLog } from '../../Utils/Logger';
import { useCallStatusPolling } from './useCallStatusPolling';
import { CallDebugConsole } from './CallDebugConsole';
import { getLocalCallTerminationStatus } from './callFlow';
import { shouldTreatBlurAsCallEnd } from './callLifecycle';

const requestPermissions = async () => {
  if (Platform.OS === 'ios') {
    const results = await Promise.all([
      request(PERMISSIONS.IOS.MICROPHONE),
      request(PERMISSIONS.IOS.CAMERA),
    ]);
    return results.every(result => result === RESULTS.GRANTED);
  } else if (Platform.OS === 'android') {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      PermissionsAndroid.PERMISSIONS.CAMERA,
    ]);
    return Object.values(results).every(result => result === PermissionsAndroid.RESULTS.GRANTED);
  }
  return false;
};

// 🔧 Set to true to disable all Zego/API logic and preview UI only
const DESIGN_MODE = false;
const SAMPLE_IMAGE = 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=1200&q=90';
const SAMPLE_IMAGE_LOCAL = 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=90';

// 🔒 MODULE-LEVEL guard: tracks roomIds that have already sent UNAVAILABLE.
const _videoUnavailableSentForRoom = new Set();
let _videoCallScreenMountCount = 0;

const VideoCallScreen = ({route}) => {
  console.log(route?.params, '`params`');
  useKeepAwake();

  const navigation = useNavigation();
  const ringtoneRef = useRef(null);
  const callAcceptedRef = useRef(route?.params?.callAccepted || false);
  const isCallEndedRef = useRef(false);
  const timeoutIdRef = useRef(null);
  const hasNavigatedAwayRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  const stopAndUnloadRingtone = useCallback(async () => {
    RingtoneManager.stopAll();
  }, []);

  // Receiver Accept path — kill leftover incoming ring hard.
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

  const localViewRef = useRef(null);
  const remoteViewRef = useRef(null);
  const isEngineActive = useRef(false);
  const isMounted = useRef(true);

  const {width: SCREEN_W, height: SCREEN_H} = Dimensions.get('window');
  const LOCAL_W = responsiveWidth(28);
  const LOCAL_H = responsiveHeight(18);

  const translateX = useSharedValue(16); // initial left: 16
  const translateY = useSharedValue(SCREEN_H - LOCAL_H - responsiveHeight(15)); // initial bottom-ish
  const savedTranslateX = useSharedValue(16);
  const savedTranslateY = useSharedValue(SCREEN_H - LOCAL_H - responsiveHeight(15));

  const localPreviewAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: translateX.value,
    top: translateY.value,
  }));
  const engineRef = useRef(null);

  const [callDetails, setCallDetails] = useState({});
  const [callStreamEndModal, setCallStreamEndModal] = useState(false);
  const [endTriggerSource, setEndTriggerSource] = useState('LOCAL');
  const [isInMute, setIsInMute] = useState(false);
  const [isSpeakerInMute, setIsSpeakerInMute] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isOtherUserInRoom, setIsOtherUserInRoom] = useState(false);
  const [remoteStreamID, setRemoteStreamID] = useState(null);
  const [networkQuality, setNetworkQuality] = useState(0);
  const [isSwapped, setIsSwapped] = useState(false);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      // Clamp to screen bounds
      // padding: 10px from sides, 50px from top, 100px from bottom (controls area)
      const clampedX = Math.min(Math.max(translateX.value, 10), SCREEN_W - LOCAL_W - 10);
      const clampedY = Math.min(Math.max(translateY.value, 50), SCREEN_H - LOCAL_H - 100);
      translateX.value = withSpring(clampedX, {damping: 15});
      translateY.value = withSpring(clampedY, {damping: 15});
      savedTranslateX.value = clampedX;
      savedTranslateY.value = clampedY;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      console.log('🔄 Double tap detected, swapping views!');
      runOnJS(setIsSwapped)(!isSwapped);
    });


  // Combined gesture for local video (Pan + Double Tap)
  // We need to ensure single tap doesn't conflict. 
  // Actually, the requirement is "click in between screen". 
  // Maybe just wrapping the whole background in a Pressable is easier if gestures allow.
  // The local video has pan/double tap. The background has nothing.
  // Let's rely on a full screen Touch/Pressable for the background if possible, or use gestures.
  
  const combinedGesture = Gesture.Simultaneous(panGesture, doubleTapGesture);

  const {token, currentUserId, currentUserDisplayName} = useSelector(state => state.auth.user);
  const coins = useSelector(state => state.wallet.data.coins);
  const callAccepted = useSelector(state => state.hideShow.visibility.callAccepted);
  const latestTip = useSelector(state => state.hideShow.visibility.latestTip);
  const [isEndingCall, setIsEndingCall] = useState(false);
  // 🔧 One-shot trigger: when callAccepted becomes true, set this to true to trigger engine init.
  const [shouldInitEngine, setShouldInitEngine] = useState(currentUserId !== route?.params?.callerId ? true : false);
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
      // Callee just accepted — ignore flaky UNAVAILABLE while creator still waits.
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
      console.log(`🔄 [Polling] Call ended with status: ${status}`);
      setEndTriggerSource('POLLING');
      isCallEndedRef.current = true;
      stopAndUnloadRingtone();
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      dispatch(toggleCallAccepted({ status: false }));
      setCallStreamEndModal(true);
    },
  });

  // 🔥 Receiver already accepted the call before landing here, so set callAccepted immediately
  useEffect(() => {
    if (!IS_STARTING) {
      dispatch(toggleCallAccepted({status: true}));
    }

    return () => {
      isMounted.current = false;
    };
  }, []);

  // 🔥 Keep callAcceptedRef in sync with Redux state
  useEffect(() => {
    callAcceptedRef.current = callAccepted;
    // 🔧 When callAccepted becomes true for the first time, trigger engine init (one-shot)
    if (callAccepted) {
      if (!shouldInitEngine) {
        setShouldInitEngine(true);
      }
      if (timeoutIdRef.current) {
        console.log(`⏰ [VideoCallScreen] Call accepted! Immediately clearing the 60s ringing timeout.`);
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    }
  }, [callAccepted]);

  // ─── Ringtone for caller ───
  useEffect(() => {
    if (DESIGN_MODE) return;
    if (!IS_STARTING) return;
    
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

  async function getUserCoins() {
    try {
      let {data} = await axios.get('https://api.fahdu.com/api/wallet/get-coins', {
        headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
        timeout: 10000,
      });
      dispatch(updateWallet({coins: data?.data}));
    } catch (error) {
      console.log('⚠️ Error fetching coins:', error);
    }
  }

  const streamHasEndedModalOkay = useCallback(async () => {
    if (hasNavigatedAwayRef.current) return;
    hasNavigatedAwayRef.current = true;
    try {
      if (isEngineActive.current) {
        const engine = ZegoExpressEngine.instance();
        if (engine) {
          await engine.stopPlayingStream();
          await engine.logoutRoom(callDetails.callRoomId || `call_${route?.params?.roomId}`);
        }
      }
    } catch (error) {
      console.log('⚠️ ZEGO cleanup failed or engine already destroyed:', error.message);
    } finally {
      setCallStreamEndModal(false);
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigate('home');
      }
    }
  }, [route?.params?.roomId, navigate, navigation]);

  async function leaveCallHandler() {
    try {
      const {data, error} = await leaveCall({token, data: {roomId: route?.params?.roomId}});
      if (data) console.log(data, 'Leave call success');
      if (error) console.log(error, 'Leave call error');
    } catch (error) {
      console.log('⚠️ Exception in leaveCallHandler:', error);
    }
  }

  async function rejectCallHandler() {
    try {
      const {data, error} = await rejectCall({
        token,
        data: {
          roomId: route?.params?.roomId,
          callType: route?.params?.callType || 'video',
          userId: currentUserId,
        },
      });
      if (data) console.log(data, 'Reject call success');
      if (error) console.log(error, 'Reject call error');
    } catch (error) {
      console.log('⚠️ Exception in rejectCallHandler:', error);
    }
  }

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

  const handleVideo = async () => {
    try {
      if (isEngineActive.current) {
        await ZegoExpressEngine.instance().enableCamera(!isVideoEnabled);
        setIsVideoEnabled(!isVideoEnabled);
      }
    } catch (error) {
      console.log('Error toggling video:', error);
    }
  };

  const handleSwitchCamera = async () => {
    try {
      if (isEngineActive.current) {
        await ZegoExpressEngine.instance().useFrontCamera(!isFrontCamera);
        setIsFrontCamera(!isFrontCamera);
      }
    } catch (error) {
      console.log('Error switching camera:', error);
    }
  };

  const handleLogout = async (fromSocket) => {
    // 🔒 Use ref for SYNCHRONOUS guard - state is async/batched and allows double calls
    if (isCallEndedRef.current) {
      console.log(`⛔ [VideoCallScreen] handleLogout BLOCKED - call already ended (ref guard) [room=${route?.params?.roomId}, fromSocket=${fromSocket}]`);
      return;
    }
    setEndTriggerSource(prev => {
      if (prev && prev !== 'LOCAL') return prev;
      return fromSocket ? 'SOCKET/FCM' : 'USER';
    });
    console.log(`🔴 [VideoCallScreen:handleLogout] ENTERED for room ${route?.params?.roomId}, fromSocket=${fromSocket}`);
    console.log(`🔴 [VideoCallScreen:handleLogout] timeoutIdRef.current = ${timeoutIdRef.current}`);
    isCallEndedRef.current = true;
    setIsEndingCall(true);
    stopAndUnloadRingtone();
    if (timeoutIdRef.current) {
      console.log(`🔴 [VideoCallScreen:handleLogout] CLEARING timeout ID ${timeoutIdRef.current}`);
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    } else {
      console.log(`🔴 [VideoCallScreen:handleLogout] ⚠️ NO timeout to clear!`);
    }
    console.log(`Logging out from call_${route?.params?.roomId}`);
    isEngineActive.current = false;

    try {
      const engine = ZegoExpressEngine.instance();
      if (engine) {
        await engine.stopPlayingStream();
        await engine.logoutRoom(callDetails.callRoomId || `call_${route?.params?.roomId}`);
      }
    } catch (error) {
      console.log('⚠️ ZEGO cleanup failed or engine already destroyed:', error.message);
    }

    // Reset callAccepted to false BEFORE navigation
    dispatch(toggleCallAccepted({status: false}));
    // BUG_13: nudge ChatWindow to refetch completion status / attempt counts
    dispatch(toggleNewMessageRecieved());

    if (!fromSocket) {
      const terminationStatus = getLocalCallTerminationStatus({callAccepted: callAcceptedRef.current});
      if (terminationStatus === 'LEAVE') {
        await leaveCallHandler();
        console.log('Leaving call (call was accepted)...');
      } else {
        await rejectCallHandler();
        console.log('Rejecting call (not accepted yet)...');
      }
    }

    // 🔒 Only navigate once
    if (isMounted.current && !hasNavigatedAwayRef.current) {
      hasNavigatedAwayRef.current = true;
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigate('home');
      }
    }
  };

  // 🔥 Bulletproof 60-second timeout — set ONCE, never resets
  useEffect(() => {
    if (!IS_STARTING) return;

    if (DESIGN_MODE) return;
    const mountId = ++_videoCallScreenMountCount;
    const roomId = route?.params?.roomId;
    console.log(`⏰ [VideoCallScreen:Mount#${mountId}] Starting 60-second timeout for room ${roomId}`);
    console.log(`⏰ [VideoCallScreen:Mount#${mountId}] Refs: isMounted=${isMounted.current}, isCallEnded=${isCallEndedRef.current}, callAccepted=${callAcceptedRef.current}`);

    timeoutIdRef.current = setTimeout(async () => {
      console.log(`⏰ [VideoCallScreen:Mount#${mountId}] Timeout FIRED for room ${roomId}`);
      console.log(`⏰ [VideoCallScreen:Mount#${mountId}] Guard check: callAccepted=${callAcceptedRef.current}, isMounted=${isMounted.current}, isCallEnded=${isCallEndedRef.current}`);
      console.log(`⏰ [VideoCallScreen:Mount#${mountId}] Module guard has room? ${_videoUnavailableSentForRoom.has(roomId)}`);

      // 🔒 MODULE-LEVEL guard: prevent duplicate UNAVAILABLE across any re-mounts/instances
      if (_videoUnavailableSentForRoom.has(roomId)) {
        console.log(`⛔ [VideoCallScreen:Mount#${mountId}] BLOCKED by module-level guard — UNAVAILABLE already sent for room ${roomId}`);
        return;
      }

      if (!callAcceptedRef.current && isMounted.current && !isCallEndedRef.current) {
        // 🔒 Mark as ended FIRST so nothing else can fire
        isCallEndedRef.current = true;
        _videoUnavailableSentForRoom.add(roomId);
        console.log(`⏰ [VideoCallScreen:Mount#${mountId}] 60 seconds passed, call not accepted - sending UNAVAILABLE for room ${roomId}`);
        try {
          await callAcceptManual({
            token,
            data: {
              roomId: roomId,
              callType: route?.params?.callType || 'video',
              status: 'UNAVAILABLE',
            },
          });
          console.log(`✅ [VideoCallScreen:Mount#${mountId}] UNAVAILABLE API call completed for room ${roomId}`);
        } catch (error) {
          console.log(`❌ [VideoCallScreen:Mount#${mountId}] Error sending UNAVAILABLE:`, error);
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
        console.log(`⛔ [VideoCallScreen:Mount#${mountId}] Timeout SKIPPED — guards blocked.`);
      }
    }, 60000);

    return () => {
      console.log(`⏰ [VideoCallScreen:Mount#${mountId}] Timeout CLEANUP for room ${roomId}`);
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };
  }, []); // ← Empty deps = runs once, never resets

  // Fetch coins on mount
  useEffect(() => {
    if (DESIGN_MODE) return;
    getUserCoins();
  }, []);

  // Disable back button
  useEffect(() => {
    if (DESIGN_MODE) return;
    let x = BackHandler.addEventListener('hardwareBackPress', () => {
      handleLogout(false);
      return true;
    });
    return () => x.remove();
  }, [isOtherUserInRoom]);

  useEffect(() => {
    if (DESIGN_MODE) return;
    const subscription = AppState.addEventListener('change', nextAppState => {
      appStateRef.current = nextAppState;
      if (nextAppState === 'background') {
        console.log('📱 [VideoCallScreen] App moved to background; keeping call active.');
      }
    });

    return () => subscription.remove();
  }, []);

  // 🧭 Navigation Blur Guard: If the screen loses focus while the app is active,
  // we must immediately end the call context, stop ringing, and clear the 60s timeout.
  useEffect(() => {
    if (DESIGN_MODE) return;
    const unsubscribe = navigation.addListener('blur', () => {
      console.log(`🧭 [VideoCallScreen] BLUR event fired - user navigated away from room ${route?.params?.roomId} (appState=${appStateRef.current})`);
      if (!isCallEndedRef.current && shouldTreatBlurAsCallEnd({ appState: appStateRef.current, isCallEnded: isCallEndedRef.current })) {
        hasNavigatedAwayRef.current = true; // Mark as navigated away since we lost focus!
        handleLogout(true); // End the call context (fromSocket = true skips duplicate API calls)
      } else {
        console.log('🧭 [VideoCallScreen] BLUR ignored while app is backgrounded; keeping call alive');
      }
    });
    return unsubscribe;
  }, [navigation, route?.params?.roomId]);

  // Fetch call token
  useEffect(() => {
    if (DESIGN_MODE) return;
    async function getTokenFromServer() {
      const {data, error} = await getCallToken({token, roomId: route?.params?.roomId});
      if (data) {
        console.log('Success API', data);
        setCallDetails({token: data?.data?.TOKEN, roomId: route?.params?.roomId, callRoomId: data?.data?.callRoomId});
      }
      if (error) {
        console.log('Error api', error, DeviceInfo.isEmulatorSync());
      }
    }
    getTokenFromServer();
  }, [token, route?.params?.roomId]);

  // 🔥 Initialize ZEGO — Following CallScreen pattern exactly
  useEffect(() => {
    if (DESIGN_MODE) return;
    // Wait for call acceptance if starting
    if (IS_STARTING && !shouldInitEngine) {
      console.log('⏳ Waiting for call to be accepted...');
      AppLog('CALL', 'Waiting for video call acceptance (Caller side)', { roomId: route?.params?.roomId });
      return;
    }

    // Wait for token
    if (!callDetails.token) {
      console.log('⏳ Waiting for call token...');
      return;
    }

    console.log('🚀 Initializing ZEGO engine for video call...');
    AppLog('CALL', 'Initializing ZEGO engine for video call', { roomId: callDetails.roomId, isStarting: IS_STARTING });

    const profile = {
      appID: ZEGO_APP_ID,
      appSign: ZEGO_APP_SIGN,
      scenario: ZegoScenario.StandardVideoCall,
    };

    ZegoExpressEngine.createEngineWithProfile(profile).then(async engine => {
      console.log('✅ ZEGO engine created');
      if (!isMounted.current) {
        ZegoExpressEngine.destroyEngine();
        return;
      }
      isEngineActive.current = true;

      try {
        // 🍎 Explicitly set audio mode BEFORE ZEGO uses audio
        // Must be awaited to guarantee the session is ready
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });

        // Enable Hardware Encoder/Decoder for better performance (crucial for Android)
        await engine.enableHardwareEncoder(true);
        await engine.enableHardwareDecoder(true);

        // 🔧 FIX: Attach event listeners IMMEDIATELY, BEFORE the permission request
        engine.on('roomStateUpdate', (roomID, state, errorCode, extendedData) => {
          console.log(`[RoomStateUpdate][${Platform.OS}]`, {roomID, state, errorCode, extendedData});
        });

        engine.on('roomUserUpdate', (roomID, updateType, userList) => {
          console.log(`[RoomUserUpdate][${Platform.OS}]`, {roomID, updateType, userList});
          if (!isMounted.current) return;
          if (updateType === 0) {
            const otherUser = userList.find(user => user.userID !== currentUserId);
            if (otherUser) {
              console.log('✅ Other user joined the room:', otherUser.userID);
              setIsOtherUserInRoom(true);
            }
          } else if (updateType === 1) {
            console.log('❌ User left the room');
            setIsOtherUserInRoom(false);
          }
        });

        engine.on('playerStateUpdate', (streamID, state, errorCode, extendedData) => {
          console.log(`[PlayerStateUpdate][${Platform.OS}]`, {streamID, state, errorCode, extendedData});
          AppLog('ZEGO_RECEIVING_STATE', `Player state update`, { streamID, state, errorCode, os: Platform.OS });
        });
        
        engine.on('publisherStateUpdate', (streamID, state, errorCode, extendedData) => {
          AppLog('ZEGO_SENDING_STATE', `Publisher state update`, { streamID, state, errorCode, os: Platform.OS });
        });

        engine.on('remoteMicStateUpdate', (streamID, state) => {
          AppLog('REMOTE_MIC_STATE', `Remote microphone state updated`, { streamID, state, os: Platform.OS });
        });

        engine.on('roomStreamUpdate', async (roomID, updateType, streamList) => {
          console.log('🎵 [roomStreamUpdate]', {roomID, updateType, streamList});
          if (!isMounted.current) return;
          if (updateType === 1) {
            console.log('❌ Stream removed (ZEGO DISCONNECT)');
            setEndTriggerSource('ZEGO_SDK');
            dispatch(toggleCallAccepted({status: false}));
            setCallStreamEndModal(true);
            return;
          }
          if (streamList?.length > 0) {
            const remoteStream = streamList[0]?.streamID;
            console.log('✅ Stream added, will attach view:', remoteStream);
            AppLog('CALL', 'Remote video stream added', { remoteStreamID: remoteStream });
            setRemoteStreamID(remoteStream);
          }
        });

        engine.on('publisherQualityUpdate', (streamID, quality) => {
          if (!isMounted.current) return;
          const mapping = {0: 1, 1: 2, 2: 3, 3: 5};
          const mapped = mapping[quality.level] ?? 0;
          setNetworkQuality(mapped);
        });

        // 🔧 Now request permissions (listeners already attached, so no race condition)
        const hasPermission = await requestPermissions();
        if (!hasPermission || !isMounted.current || !isEngineActive.current) {
          console.log('❌ Camera/Microphone permission denied or engine stopped');
          if (!hasPermission) LoginPageErrors('Camera and Microphone permissions are required.');
          return;
        }

        // Login to room
        if (Object.keys(callDetails).length > 0 && isMounted.current && isEngineActive.current) {
          const roomConfig = new ZegoRoomConfig();
          roomConfig.isUserStatusNotify = true;
          roomConfig.token = callDetails.token;

          // Video config
          await engine.setVideoConfig({
            captureWidth: 720,
            captureHeight: 1280,
            encodeWidth: 720,
            encodeHeight: 1280,
            bitrate: 1500,
            fps: 30,
            codecID: ZegoVideoCodecID.Default,
          });

          if (!isMounted.current || !isEngineActive.current) return;
          await engine.enableCamera(true);
          await engine.useFrontCamera(true);
          await engine.enableAudioCaptureDevice(true);

          let audioRoute = await engine.getAudioRouteType();
          if (audioRoute === ZegoAudioRoute.Speaker || audioRoute === ZegoAudioRoute.Earpiece) {
            await engine.setAudioRouteToSpeaker(true);
          }

          if (!isMounted.current || !isEngineActive.current) return;
          const myStreamID = 'stream_' + currentUserId;
          
          // 🚀 OPTIMIZATION: Start publishing and logging in concurrently to save 500ms-1s of latency
          await Promise.all([
            engine.loginRoom(
              callDetails.callRoomId,
              {userID: currentUserId, userName: currentUserDisplayName},
              roomConfig,
            ),
            engine.startPublishingStream(myStreamID)
          ]);
          console.log('✅ Logged in and Publishing stream:', myStreamID);

          engineRef.current = engine;
        }

        const ver = await engine.getVersion();
        console.log('Express SDK Version: ' + ver);

      } catch (error) {
        console.log('❌ ZEGO initialization error:', error);
        AppLog('ZEGO_ERROR', 'Failed to initialize ZEGO video engine', { error: error?.message || error, roomId: callDetails.roomId });
      }
    });

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
  }, [callDetails, shouldInitEngine, currentUserId, currentUserDisplayName]);

  // 🔥 Cleanup on unmount — mark refs FIRST to block any pending async work
  useEffect(() => {
    if (DESIGN_MODE) return;
    return () => {
      console.log('VideoCallScreen unmounting, resetting callAccepted for room', route?.params?.roomId);
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
      dispatch(toggleCallAccepted({status: false}));
      // Clear this roomId from accepted list so the same room can be re-accepted
      if (route?.params?.roomId) {
        dispatch(clearAcceptedRoomId(route.params.roomId));
        // 🔒 Clean up module-level guard after unmount so future calls to same room work
        _videoUnavailableSentForRoom.delete(route.params.roomId);
      }
    };
  }, []);

  // ─── Tip Toast Logic ───
  const [tipToastVisible, setTipToastVisible] = useState(false);
  const [confettiVisible, setConfettiVisible] = useState(false);
  const tipOpacity = useSharedValue(0);
  const confettiRef = useRef(null);

  // Plain JS function to clear the tip — safe to call via runOnJS
  const clearTip = () => {
    setTipToastVisible(false);
    dispatch(setLatestTip(null));
  };

  useEffect(() => {
    if (latestTip) {
      console.log('💰 Received Tip, showing confetti and toast simultaneously:', latestTip);
      setConfettiVisible(true);
      showTipToast();
      
      // Auto-hide confetti after 4 seconds (animation is usually 3-4s)
      const confettiTimer = setTimeout(() => {
        setConfettiVisible(false);
      }, 4000); 

      return () => clearTimeout(confettiTimer);
    }
  }, [latestTip]);

  const showTipToast = () => {
    setTipToastVisible(true);
    tipOpacity.value = withSpring(1);

    setTimeout(() => {
      tipOpacity.value = withSpring(0, {}, (finished) => {
        if (finished) {
          runOnJS(clearTip)();
        }
      });
    }, 3000); // Show for exactly 3 seconds
  };

  const tipAnimatedStyle = useAnimatedStyle(() => ({
    opacity: tipOpacity.value,
    transform: [{ scale: tipOpacity.value }],
  }));

  // 📸 Attach Local Preview
  useEffect(() => {
    if (DESIGN_MODE) return;
    if (!engineRef.current) return;

    let cancelled = false;
    let retryCount = 0;

    const attachLocalPreview = async () => {
      if (cancelled || !isMounted.current) return;

      const localTag = findNodeHandle(localViewRef.current);
      if (!localTag) {
        retryCount++;
        if (retryCount <= 10) {
          setTimeout(attachLocalPreview, 200);
        }
        return;
      }

      try {
        const localCanvas = {
          reactTag: localTag,
          viewMode: ZegoViewMode.AspectFill,
          backgroundColor: 0,
        };
        await engineRef.current.startPreview(localCanvas);
        console.log('✅ Local preview attached to tag:', localTag);
      } catch (err) {
        console.log('⚠️ Error starting local preview:', err);
      }
    };

    const timer = setTimeout(attachLocalPreview, 200);
    return () => {
      if (isEngineActive.current && engineRef.current) {
        try {
          console.log('🧹 Stopping local preview for re-attachment/cleanup');
          engineRef.current.stopPreview();
        } catch (e) {
          console.log('⚠️ Error stopping preview:', e.message);
        }
      }
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isSwapped, engineRef.current]);

  // Attach remote view when remoteStreamID is set — retry until ref is available
  useEffect(() => {
    if (DESIGN_MODE) return;
    if (!remoteStreamID || !engineRef.current) return;

    let cancelled = false;
    let retryCount = 0;

    const attachRemoteView = async () => {
      if (cancelled || !isMounted.current) return;

      const remoteTag = findNodeHandle(remoteViewRef.current);
      if (!remoteTag) {
        retryCount++;
        if (retryCount <= 10) {
          console.log(`⏳ Remote view not ready, retry ${retryCount}/10...`);
          setTimeout(attachRemoteView, 200);
        } else {
          console.log('⚠️ Remote view ref never became ready');
        }
        return;
      }

      try {
        const remoteViewConfig = {
          reactTag: remoteTag,
          viewMode: ZegoViewMode.AspectFill,
          backgroundColor: 0,
        };

        await engineRef.current.startPlayingStream(remoteStreamID, remoteViewConfig);
        await engineRef.current.mutePlayStreamVideo(remoteStreamID, false);
        await engineRef.current.setAudioRouteToSpeaker(true);
        console.log('✅ Remote video playing with reactTag:', remoteTag);
      } catch (err) {
        console.log('⚠️ Error starting remote playback:', err);
      }
    };

    // Start trying after a short delay for initial render
    const timer = setTimeout(attachRemoteView, 100);
    return () => {
      if (isEngineActive.current && engineRef.current && remoteStreamID) {
        try {
          console.log('🧹 Stopping remote stream playback for re-attachment/cleanup:', remoteStreamID);
          engineRef.current.stopPlayingStream(remoteStreamID);
        } catch (e) {
          console.log('⚠️ Error stopping stream:', e.message);
        }
      }
      cancelled = true;
      clearTimeout(timer);
    };
  }, [remoteStreamID, isSwapped, engineRef.current]);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* 🎥 Video Views */}
      <View style={styles.videoContainer}>
        {DESIGN_MODE ? (
          <>
            {/* Design Mode: Sample images instead of Zego views */}
            <Image
              source={{uri: isSwapped ? SAMPLE_IMAGE_LOCAL : SAMPLE_IMAGE}}
              style={styles.remoteVideo}
              contentFit="cover"
            />
            <GestureDetector gesture={combinedGesture}>
              <Animated.View style={[styles.localVideoContainer, localPreviewAnimatedStyle]}>
                <Image
                  source={{uri: isSwapped ? SAMPLE_IMAGE : SAMPLE_IMAGE_LOCAL}}
                  style={styles.localVideo}
                  contentFit="cover"
                />
              </Animated.View>
            </GestureDetector>
          </>
        ) : (
          <>
            {/* Remote Video (Full Screen) — always rendered so ref is available */}
            <ZegoTextureView
              key={`remote_view_${isSwapped}`}
              ref={isSwapped ? localViewRef : remoteViewRef}
              style={styles.remoteVideo}
            />

            {/* Waiting overlay — shown on top when no remote stream */}
            {!remoteStreamID && (
              <View style={[styles.waitingContainer, StyleSheet.absoluteFillObject]}>
                {!callAccepted ? (
                  <View style={styles.ringingOverlayContent}>
                    {/* Blurred background profile if available */}
                    {route?.params?.profileImageUrl && (
                      <Image 
                        source={{uri: route?.params?.profileImageUrl}} 
                        style={[StyleSheet.absoluteFill, {opacity: 0.3}]}
                        blurRadius={15}
                      />
                    )}
                    <CallingStatusText username={route?.params?.name} />
                  </View>
                ) : (
                  <>
                    <ActivityIndicator size="large" color="#FFA86B" />
                    <Text style={styles.waitingText}>Connecting...</Text>
                  </>
                )}
              </View>
            )}

            {/* Local Video (Small Preview) — Hidden until accepted */}
            {callAccepted && (
              <GestureDetector gesture={combinedGesture}>
                <Animated.View style={[styles.localVideoContainer, localPreviewAnimatedStyle]}>
                  <ZegoTextureView
                    key={`local_view_${isSwapped}`}
                    ref={isSwapped ? remoteViewRef : localViewRef}
                    style={styles.localVideo}
                  />
                </Animated.View>
              </GestureDetector>
            )}
          </>
        )}
      </View>

      {/* Timer Badge - Always Mounted to prevent reset */}
      <View style={styles.timerBadgeContainer} pointerEvents="none">
         <View style={styles.timerBadge}>
            {!callAccepted ? (
              <Text style={styles.timerCallingText}>Calling...</Text>
            ) : (
              <TimerText
                accepted={callAccepted}
                totalDuration={route?.params?.totalDuration}
                onTimerExpire={() => {
                   if (currentUserId === route?.params?.callerId) {
                      handleLogout(false);
                   }
                }}
                textStyle={styles.timerCallingText}
              />
            )}
         </View>
      </View>

      {/* Top Bar Overlay */}
      <View style={styles.topBarOverlay} pointerEvents="box-none">
          <View style={styles.headerMainRow}>
            {/* Left: Back + Name */}
            <View style={styles.headerLeftGroup}>
              <TouchableOpacity style={styles.backBtn} onPress={() => handleLogout(false)}>
                <Feather 
                  name="arrow-left" 
                  size={24} 
                  color="#fff" 
                  style={{
                    textShadowColor: 'rgba(0, 0, 0, 0.75)',
                    textShadowOffset: {width: 0, height: 1},
                    textShadowRadius: 4,
                  }}
                />
              </TouchableOpacity>
              <Text style={styles.name} numberOfLines={1}>
                {route?.params?.name?.length > 7 ? `${route?.params?.name.substring(0, 7)}...` : route?.params?.name}
              </Text>
            </View>

            {/* Right: Network Quality + Wallet */}
            <View style={{flexDirection: 'column', alignItems: 'flex-end', gap: 4}}>
              <View style={styles.headerNetworkContainer}>
                <NetworkQualityBadge quality={networkQuality} />
              </View>
              
              {/* 💳 Wallet Badge - Hidden for creator */}
              {!IS_STARTING && (
                <View style={styles.headerWalletBadge}>
                  <Wall width={14} height={14} style={{color: '#000'}} />
                  <Text style={styles.headerWalletText}>
                    {Number(coins).toLocaleString('en-IN', {maximumFractionDigits: 0})}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

      <CallingTip roomId={route?.params?.roomId} />



      {/* Right Side Vertical Menu - All 3 Icons */}
      <View style={styles.rightSideMenu}>
          {/* Switch Camera */}
          <Pressable onPress={handleSwitchCamera}>
            {({pressed}) => (
              <View style={[
                styles.sideMenuBtn,
                pressed && {backgroundColor: 'rgba(255, 255, 255, 0.2)'}
              ]}>
                <Image
                  source={require('../../../Assets/Images/CallRequests/VideoCallIcons/Default/swithCameraSkeleton.png')}
                  style={styles.sideMenuIcon}
                  contentFit="contain"
                />
              </View>
            )}
          </Pressable>

          {/* Tip Button - Visible to Receiver (where IS_STARTING is false) */}
          {!IS_STARTING && (
            <Pressable onPress={() => dispatch(toggleCallTipModal({show: true}))}>
              {({pressed}) => (
                <View style={[
                  styles.sideMenuBtn,
                  pressed && {backgroundColor: 'rgba(255, 255, 255, 0.2)'}
                ]}>
                  <Image
                    source={require('../../../Assets/Images/CallRequests/VideoCallIcons/Default/tipSkeleton.png')}
                    style={styles.sideMenuIcon}
                    contentFit="contain"
                  />
                </View>
              )}
            </Pressable>
          )}

          {/* End Call Button inside the stack */}
          <Pressable onPress={() => handleLogout(false)} disabled={isEndingCall}>
            {({pressed}) => (
              <View style={[
                styles.endCallBtn,
                pressed && {opacity: 0.8}
              ]}>
                {isEndingCall ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Image
                    source={require('../../../Assets/Images/CallRequests/VideoCallIcons/Default/phoneSkeleton.png')}
                    style={styles.controlIcon}
                    contentFit="contain"
                  />
                )}
              </View>
            )}
          </Pressable>
          
        </View>
      {tipToastVisible && latestTip && (
        <Animated.View style={[styles.tipToastContainer, tipAnimatedStyle]}>
          <View style={styles.tipToastCapsule}>
            <Text style={styles.tipToastText}>{latestTip?.displayName}</Text>
            <Text style={styles.tipToastTippedLabel}>Tipped</Text>
            <Text style={styles.tipToastAmount}>{latestTip?.amount}</Text>
            <View style={styles.coinCircle}>
              <Text style={styles.rupeeSymbol}>₹</Text>
            </View>
          </View>
        </Animated.View>
      )}

      <StreamEndedUserModal visible={callStreamEndModal} onPress={streamHasEndedModalOkay} title="Call terminated" />

      {/* 🎉 Confetti Lottie Overlay */}
      {confettiVisible && (
        <LottieView
          ref={confettiRef}
          source={require('../../../Assets/Animation/tip.json')}
          autoPlay
          loop={false}
          style={StyleSheet.absoluteFillObject}
          onAnimationFinish={() => {
            console.log('🎉 Confetti finished');
            setConfettiVisible(false);
          }}
          pointerEvents="none"
        />
      )}
      <CallDebugConsole logs={logs} onClear={clearLogs} />
    </View>
  </GestureHandlerRootView>
  );
};

export default VideoCallScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
  },
  localVideoContainer: {
    width: responsiveWidth(28),
    height: responsiveHeight(18),
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5,
    shadowRadius: 5,
    zIndex: 10,
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  waitingText: {
    color: '#fff',
    marginTop: 12,
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(2),
  },
  ringingOverlayContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Dim the background
  },
  topBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: responsiveHeight(6),
    paddingHorizontal: 20,
    flexDirection: 'column',
    zIndex: 10,
    gap: 8,
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align items to the top to prevent shifting
    justifyContent: 'space-between',
    // height: 40, // Removed fixed height to allow expansion
    position: 'relative',
    marginTop: 4, // Add top margin to align visually
  },
  timerBadgeContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: responsiveHeight(6), // Match row top padding
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  timerBadge: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCallingText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Rubik-Medium',
    marginTop: 0,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    zIndex: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerNetworkContainer: {
    height: 32, // Match backBtn height for perfect vertical alignment
    justifyContent: 'center',
  },
  name: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(1.8),
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
    maxWidth: responsiveWidth(25),
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  
  // Wallet on Left
  headerWalletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D2FFE1', // Light green background
    borderRadius: 12,
    paddingHorizontal: Platform.OS === 'ios' ? 10 : 8,
    paddingVertical: Platform.OS === 'ios' ? 4 : 3,
    borderWidth: 1,
    borderColor: '#A8E6CF',
  },
  headerWalletText: {
    color: '#000', // Black text for contrast
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
  },

  // Right Side Vertical Menu
  rightSideMenu: {
    position: 'absolute',
    right: 20,
    bottom: responsiveHeight(15),
    flexDirection: 'column',
    gap: 12,
    zIndex: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.60)', // Darker background container
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 20, // Rounded container
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sideMenuBtn: {
    width: 48,
    height: 48,
    borderRadius: 16, // Square with border radius
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Semi-transparent button bg
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideMenuIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
  },

  // End Call Button (Square-ish now)
  endCallBtn: {
    width: 48,
    height: 48,
    borderRadius: 16, // Square with border radius
    backgroundColor: '#FF6B6B', // Red background
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8, // Little extra spacing
  },
  controlIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
  },
  // Tip Toast Styles
  tipToastContainer: {
    position: 'absolute',
    top: responsiveHeight(15),
    alignSelf: 'center',
    zIndex: 100,
  },
  tipToastCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 74, 74, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#1e1e1e',
    gap: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  tipToastText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Bold',
  },
  tipToastTippedLabel: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  tipToastAmount: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Bold',
  },
  coinCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  rupeeSymbol: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
});