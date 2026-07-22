import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Audio } from 'expo-av';
import RingtoneManager from './RingtoneManager';
import { View, Text, StyleSheet, StatusBar, Dimensions, ActivityIndicator, Platform, Linking, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
// TouchableOpacity from gesture-handler — RN Touchable inside GestureHandlerRootView
// often swallows Decline presses on Android.
import { Gesture, GestureDetector, GestureHandlerRootView, TouchableOpacity } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Image } from 'expo-image';
import { useSelector, useDispatch } from 'react-redux';
import { useCallAcceptManualMutation } from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { clearProcessedRoomId } from '../../../Redux/Slices/NormalSlices/Call/CallSlice';
import { LoginPageErrors } from '../ErrorSnacks';
import socketServcies from '../../../SocketServices';
import { AppLog } from '../../Utils/Logger';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import { responsiveWidth } from 'react-native-responsive-dimensions';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import MicPermissionModal from './MicPermissionModal';
import { useCallStatusPolling } from './useCallStatusPolling';
import { CallDebugConsole } from './CallDebugConsole';
import { getLocalCallTerminationStatus, shouldRejectIncomingCall } from './callFlow';
import {
  getPendingCallSync,
  wasRecentlyAccepted,
  wasRecentlyRejected,
  wasCallEndedRecently,
  clearPendingCall,
  acceptCallFromNotification,
  declineCallFromNotification,
  dismissIncomingCallScreen,
  subscribeCallIntent,
  invalidateIncomingCall,
} from '../../Utils/callAcceptFlow';
import { cancelIncomingCallNotification } from '../../../Notificaton';

const { width, height } = Dimensions.get('window');
const ACCEPT_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 500;
const BUTTON_SIZE = 72;
const DECLINE_SIZE = 64;

// ─── Animated chevron arrow ───
const ChevronArrow = ({ delay }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(6);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) }),
          withTiming(0, { duration: 400 }),
        ),
        -1,
        false,
      ),
    );
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 400, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) }),
          withTiming(6, { duration: 400 }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Ionicons name="chevron-up" size={20} color="#10B981" />
    </Animated.View>
  );
};

// ─── Minimal Pulse Ring ───
const PulseRing = () => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(1.15, { duration: 2000, easing: Easing.out(Easing.ease) }), 
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 0 }),
        withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.pulseRing, animStyle]} />;
};

// ─── Legacy Loader Component (Matches Src/Components/Loader.js) ───
const LegacyLoader = () => {
  return (
    <View style={styles.legacyLoaderContainer}>
      <ActivityIndicator color={"#ffa07a"} size={"small"} />
    </View>
  );
};

// ─── Main screen ───
const IncomingCallScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const token = useSelector(state => state.auth.user.token);
  const currentUserId = useSelector(state => state.auth.user.data?._id);


  const {
    name,
    profileImageUrl,
    callType,
    roomId,
    callerId,
    callId,
  } = route?.params || {};

  const dispatch = useDispatch();
  const [callAcceptManual] = useCallAcceptManualMutation();
  const safetyTimerRef = useRef(null);
  const hasActedRef = useRef(false);
  const ringtoneRef = useRef(null);
  // State (not only ref) so polling `enabled` actually turns off after Accept/Reject.
  const [hasActed, setHasActed] = useState(false);

  const markActed = useCallback(() => {
    hasActedRef.current = true;
    setHasActed(true);
  }, []);

  const { logs, clearLogs } = useCallStatusPolling({
    roomId,
    token,
    enabled: !hasActed,
    callAccepted: false,
    onCallAccepted: () => {
      // Receiver is the one who accepts — ignore ACCEPTED polls here.
    },
    onCallRejected: () => {
      // Creator cancelled while we were ringing (or peer rejected).
      if (hasActedRef.current) return;
      markActed();
      console.log('🔄 [Polling] Call rejected/cancelled by caller, exiting...');
      RingtoneManager.stopAndSuppress(roomId);
      if (callId) dispatch(clearProcessedRoomId(callId));
      invalidateIncomingCall({ roomId, callId, callType }, 'REJECTED');
      LoginPageErrors('Caller cancelled the call');
      navigation.goBack();
    },
    onCallUnavailable: () => {
      // Flaky while creator still ringing — but if creator already stamped ended, cut UI.
      if (hasActedRef.current || wasRecentlyAccepted({ roomId, callId })) return;
      if (wasRecentlyRejected({ roomId, callId }) || wasCallEndedRecently({ roomId, callId })) {
        markActed();
        console.log('🔄 [Polling] UNAVAILABLE + ended stamp — creator cut, dismissing');
        RingtoneManager.stopAndSuppress(roomId);
        if (callId) dispatch(clearProcessedRoomId(callId));
        invalidateIncomingCall({ roomId, callId, callType }, 'UNAVAILABLE');
        LoginPageErrors('Caller cancelled the call');
        navigation.goBack();
        return;
      }
      console.log(
        '🔄 [Polling] Ignoring UNAVAILABLE on IncomingCall (creator may still be ringing)',
      );
    },
    onCallEnded: (status) => {
      // Creator left / force-closed / completed — always cut IncomingCall.
      if (hasActedRef.current || wasRecentlyAccepted({ roomId, callId })) return;
      const upper = String(status || '').toUpperCase();
      if (upper === 'DISCONNECTED') {
        // Same flake as UNAVAILABLE while still ringing — only cut if stamped ended.
        if (!wasRecentlyRejected({ roomId, callId }) && !wasCallEndedRecently({ roomId, callId })) {
          console.log('🔄 [Polling] Ignoring DISCONNECTED on IncomingCall (may be flake)');
          return;
        }
      }
      markActed();
      console.log(`🔄 [Polling] Call ended (${upper}) — dismissing IncomingCall`);
      RingtoneManager.stopAndSuppress(roomId);
      if (callId) dispatch(clearProcessedRoomId(callId));
      invalidateIncomingCall({ roomId, callId, callType }, upper || 'ENDED');
      LoginPageErrors('Caller cancelled the call');
      navigation.goBack();
    },
  });

  // Notification Accept/Reject while this screen is open — stop polling/ringtone immediately.
  useEffect(() => {
    return subscribeCallIntent(({ type, callData }) => {
      const sameRoom =
        callData?.roomId != null &&
        roomId != null &&
        String(callData.roomId) === String(roomId);
      if (!sameRoom) return;

      const sameCall =
        !callId ||
        !callData.callId ||
        String(callData.callId) === String(callId);
      if (!sameCall) return;

      if (type === 'ACCEPTED') {
        console.log('📱 [IncomingCall] Accept intent from notification — stopping local UI/polling');
        markActed();
        RingtoneManager.stopAndSuppress(roomId);
        if (roomId) cancelIncomingCallNotification(roomId).catch(() => {});
        if (safetyTimerRef.current) {
          clearTimeout(safetyTimerRef.current);
          safetyTimerRef.current = null;
        }
        // Do not goBack here — acceptCallFromNotification replaces this screen.
        return;
      }

      if (type === 'REJECTED' || type === 'UNAVAILABLE' || type === 'ENDED') {
        console.log('📱 [IncomingCall] Remote end intent — dismissing', type);
        markActed();
        RingtoneManager.stopAndSuppress(roomId);
        if (roomId) cancelIncomingCallNotification(roomId).catch(() => {});
        if (safetyTimerRef.current) {
          clearTimeout(safetyTimerRef.current);
          safetyTimerRef.current = null;
        }
        if (navigation.canGoBack()) navigation.goBack();
      }
    });
  }, [roomId, callId, markActed, navigation]);
  
  // State for showing loader
  const [showLoader, setShowLoader] = useState(false);
  const [showMicModal, setShowMicModal] = useState(false);
  const [micModalLoading, setMicModalLoading] = useState(false);

  // ─── Shared values ───
  const translateY = useSharedValue(0);
  const hintOpacity = useSharedValue(1);
  const acceptButtonOpacity = useSharedValue(1);
  const declineButtonOpacity = useSharedValue(1);
  const arrowsOpacity = useSharedValue(1);
  const screenOpacity = useSharedValue(1);

  // Hint text fade
  useEffect(() => {
    hintOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  // Safety net: only for THIS callId (roomId alone is reused across chats).
  useEffect(() => {
    if (!roomId || hasActedRef.current) return;

    const callRef = { roomId, callId };
    const pending = getPendingCallSync();
    // Same session only — roomId is reused; don't dismiss next call after prior REJECTED.
    const samePendingCall =
      pending?.roomId != null &&
      String(pending.roomId) === String(roomId) &&
      !!callId &&
      !!pending.callId &&
      String(pending.callId) === String(callId);

    const accepted =
      wasRecentlyAccepted(callRef) ||
      (samePendingCall && (pending.status === 'ACCEPTED' || pending.callAccepted));
    const rejected =
      (callId && wasRecentlyRejected(callRef)) ||
      (samePendingCall &&
        (pending.status === 'REJECTED' ||
          pending.status === 'ENDED' ||
          pending.status === 'CANCELLED'));

    if (rejected) {
      markActed();
      clearPendingCall();
      navigation.goBack();
      return;
    }

    if (accepted) {
      // Notification/bootstrap already owns accept API + navigation — only stop local UI.
      markActed();
      RingtoneManager.stopAndSuppress(roomId);
      if (pending?.apiDone) {
        return;
      }
      acceptCallFromNotification(
        {
          roomId,
          displayName: name,
          callerName: name,
          callType: callType || 'audio',
          senderId: callerId,
          profileImage: profileImageUrl,
          callId,
        },
        { navigateNow: true },
      ).catch(err => {
        console.warn('[IncomingCall] auto-join after notification accept failed:', err?.message || err);
        navigation.replace(callType === 'video' ? 'videoCallScreen' : 'callScreen', {
          roomId,
          name,
          callType: callType || 'audio',
          callerId,
          profileImageUrl,
          callAccepted: true,
          callId,
        });
      });
    }
  }, [roomId, callType, name, callerId, profileImageUrl, callId, navigation, markActed]);

  // Keep CallStyle notification while IncomingCall is open (FG + BG full-screen).
  // Only mark in-app UI so Accept/Reject from either surface stay in sync.
  useEffect(() => {
    if (!roomId) return;
    try {
      const { setAndroidInAppIncomingUi } = require('../../Services/IncomingCallStyle');
      setAndroidInAppIncomingUi(true);
    } catch (_) {}
    return () => {
      try {
        const { setAndroidInAppIncomingUi } = require('../../Services/IncomingCallStyle');
        setAndroidInAppIncomingUi(false);
      } catch (_) {}
    };
  }, [roomId]);

  // ─── One ringtone at a time:
  // If native already ringing (notif tap) → keep it.
  // Else FG → JS. Background → native MediaPlayer. Accept/Reject → stopAndSuppress.
  useEffect(() => {
    console.log('🔔 [IncomingCall] Setting up ringtone...');
    let isCancelled = false;
    let handedOff = false;
    let appStateTimer = null;

    const playFgRingtone = async () => {
      try {
        if (isCancelled || hasActedRef.current) return;
        if (wasRecentlyAccepted({ roomId, callId }) || wasRecentlyRejected({ roomId, callId })) {
          RingtoneManager.stopAndSuppress(roomId);
          return;
        }
        // active + inactive both count as in-app (shade pull is inactive).
        if (AppState.currentState === 'background') return;
        handedOff = false;
        // Keep CallStyle notification visible while ringing in FG.
        // ensureIncoming: adopt native if already playing (notif tap) — never start a 2nd tone.
        await RingtoneManager.ensureIncoming();
      } catch (error) {
        console.log('❌ Failed to play incoming call ringtone:', error);
      }
    };

    const startBackgroundRingtone = () => {
      if (isCancelled || hasActedRef.current || !roomId) return;
      if (wasRecentlyAccepted({ roomId, callId }) || wasRecentlyRejected({ roomId, callId })) {
        RingtoneManager.stopAndSuppress(roomId);
        return;
      }
      if (handedOff) return;
      handedOff = true;

      if (Platform.OS !== 'android') return;

      console.log('🔔 [IncomingCall] Background → native ring NOW');
      RingtoneManager.handOffToBackgroundRing({
        roomId,
        callId,
        callType,
        displayName: name,
        name,
        senderId: callerId,
        callerId,
        profileImage: profileImageUrl,
        profileImageUrl,
      });
    };

    const onAppState = next => {
      if (isCancelled || hasActedRef.current) return;
      if (wasRecentlyAccepted({ roomId, callId }) || wasRecentlyRejected({ roomId, callId })) {
        RingtoneManager.stopAndSuppress(roomId);
        return;
      }
      // Ignore inactive flicker; only react to active ↔ background.
      if (next !== 'active' && next !== 'background') return;
      if (appStateTimer) clearTimeout(appStateTimer);
      appStateTimer = setTimeout(() => {
        if (isCancelled || hasActedRef.current) return;
        if (AppState.currentState === 'active' || AppState.currentState === 'inactive') {
          playFgRingtone();
        } else if (AppState.currentState === 'background') {
          startBackgroundRingtone();
        }
      }, 300);
    };

    // Mount: ring in FG even if briefly inactive (notification shade).
    if (AppState.currentState !== 'background') {
      playFgRingtone();
    } else {
      startBackgroundRingtone();
    }

    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      isCancelled = true;
      if (appStateTimer) clearTimeout(appStateTimer);
      sub.remove();
      // Accept/Reject already suppressed. Soft-stop only if still ringing.
      if (hasActedRef.current) {
        RingtoneManager.stopAndSuppress(roomId);
      } else if (handedOff || RingtoneManager.isNativePlaying()) {
        // Keep native BG / notif-tap MediaPlayer alive across remounts — never restart.
        RingtoneManager.stopJsOnly();
      } else {
        RingtoneManager.stopAll(roomId);
      }
    };
  }, [roomId, callId, callType, name, callerId, profileImageUrl]);

  // ─── Initial Permissions Check ───
  // Delayed to avoid iOS system permission dialog stealing audio focus from the ringtone
  useEffect(() => {
    const checkMicPermissionOnMount = async () => {
      try {
        const micPermission = Platform.OS === 'ios' ? PERMISSIONS.IOS.MICROPHONE : PERMISSIONS.ANDROID.RECORD_AUDIO;
        let micStatus = await check(micPermission);
        if (micStatus === RESULTS.DENIED) {
          micStatus = await request(micPermission);
        }

        let camStatus = RESULTS.GRANTED;
        if (callType === 'video') {
          const camPermission = Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;
          camStatus = await check(camPermission);
          if (camStatus === RESULTS.DENIED) {
            camStatus = await request(camPermission);
          }
        }

        const micGranted = micStatus === RESULTS.GRANTED || micStatus === RESULTS.LIMITED;
        const camGranted = camStatus === RESULTS.GRANTED || camStatus === RESULTS.LIMITED;

        if (!micGranted || (callType === 'video' && !camGranted)) {
          console.log('❌ Microphone/Camera permission denied on IncomingCall screen mount');
          setShowMicModal(true);
        }
      } catch (err) {
        console.log('⚠️ Mic/Cam permission check error:', err);
        AppLog('AUDIO_PERMISSION_ERROR', 'Failed to check camera/mic permissions on IncomingCall mount', { error: err?.message || err, callType });
      }
    };
    // Give ringtone 1.5s to start playing before permission dialog can steal focus
    const timer = setTimeout(checkMicPermissionOnMount, 1500);
    return () => clearTimeout(timer);
  }, [callType]);

  // Helper to stop ringtone — Accept/Reject must suppress late re-ring.
  const stopRingtone = useCallback(() => {
    RingtoneManager.stopAndSuppress(roomId);
  }, [roomId]);

  const finalizeIncomingCallAction = useCallback(async (status, reason) => {
    if (hasActedRef.current) return;
    markActed();
    stopRingtone();
    clearSafetyTimer();

    if (callId) dispatch(clearProcessedRoomId(callId));

    try {
      await callAcceptManual({
        token,
        data: {
          roomId,
          callType: callType || 'audio',
          status,
          reason,
        },
      });
    } catch (error) {
      console.warn('[IncomingCall] finalizeIncomingCallAction failed:', error?.message || error);
    }
  }, [callAcceptManual, callId, clearSafetyTimer, callType, dispatch, roomId, stopRingtone, token, markActed]);

  // ─── Safety timeout (60s) ───
  useEffect(() => {
    safetyTimerRef.current = setTimeout(() => {
      if (!hasActedRef.current) {
        console.log('⏰ Incoming call safety timeout — auto-dismissing');
        finalizeIncomingCallAction('UNAVAILABLE', 'timeout');
        navigation.goBack();
      }
    }, 60000);

    return () => {
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
    };
  }, []);

  // ─── Socket Connection Check ───
  useEffect(() => {
    if (!socketServcies.isConnected()) {
      AppLog('SOCKET', 'Socket disconnected on Incoming Call Screen, forcing reconnection', { roomId });
      socketServcies.initializeSocket(currentUserId, token);
    }
  }, [currentUserId, token, roomId]);


  const clearSafetyTimer = useCallback(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  // ─── Fade Out Sequence & Navigation ───
  const triggerSuccessSequence = useCallback(() => {
    'worklet';
    // 1. Fade out buttons & arrows immediately
    acceptButtonOpacity.value = withTiming(0, { duration: 150 });
    declineButtonOpacity.value = withTiming(0, { duration: 150 });
    arrowsOpacity.value = withTiming(0, { duration: 150 });
    
    // 2. Fade out entire screen slightly later, then show loader
    screenOpacity.value = withDelay(50, withTiming(0, { duration: 200 }, () => {
      runOnJS(setShowLoader)(true);
    }));
  }, []);


  const leaveIncomingUi = useCallback(() => {
    try {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.replace('chatRoomTab', { screen: 'home' });
      }
    } catch (_) {
      dismissIncomingCallScreen();
    }
  }, [navigation]);

  // ─── Accept — tap OR swipe-up ───
  const handleAccept = useCallback(async () => {
    const callPayload = {
      roomId,
      callId,
      callType: callType || 'audio',
      displayName: name,
      name,
      senderId: callerId,
      callerId,
      profileImage: profileImageUrl,
      profileImageUrl,
    };

    if (hasActedRef.current) {
      try {
        await acceptCallFromNotification(callPayload, { navigateNow: true });
      } catch (_) {
        leaveIncomingUi();
      }
      return;
    }
    markActed();
    stopRingtone();
    clearSafetyTimer();
    if (roomId) cancelIncomingCallNotification(roomId).catch(() => {});
    if (callId) dispatch(clearProcessedRoomId(callId));

    ReactNativeHapticFeedback.trigger('notificationSuccess', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });

    triggerSuccessSequence();

    const connectWatchdog = setTimeout(() => {
      try {
        const routeName = navigation.getState?.()?.routes?.slice(-1)?.[0]?.name;
        if (routeName === 'incomingCall') leaveIncomingUi();
      } catch (_) {
        leaveIncomingUi();
      }
    }, 8000);

    try {
      await acceptCallFromNotification(callPayload, { navigateNow: true });
    } catch (err) {
      console.error('❌ Accept API exception:', err);
      LoginPageErrors('Something went wrong');
      leaveIncomingUi();
    } finally {
      clearTimeout(connectWatchdog);
    }
  }, [roomId, name, callerId, profileImageUrl, callType, callId, markActed, stopRingtone, clearSafetyTimer, dispatch, triggerSuccessSequence, leaveIncomingUi, navigation]);

  const triggerAcceptJS = useCallback(() => {
    handleAccept();
  }, [handleAccept]);

  // ─── Decline — leave UI first, reject API in background ───
  const handleDecline = useCallback(() => {
    console.log('📱 [IncomingCall] Decline pressed', { roomId, callId, hasActed: hasActedRef.current });
    if (hasActedRef.current) {
      leaveIncomingUi();
      return;
    }
    if (!shouldRejectIncomingCall({ isCallActive: true, hasActed: hasActedRef.current })) {
      leaveIncomingUi();
      return;
    }
    markActed();
    stopRingtone();
    clearSafetyTimer();
    ReactNativeHapticFeedback.trigger('impactLight');
    if (callId) dispatch(clearProcessedRoomId(callId));
    leaveIncomingUi();

    declineCallFromNotification(
      {
        roomId,
        callId,
        callType: callType || 'audio',
        displayName: name,
        senderId: callerId,
        profileImage: profileImageUrl,
      },
      { dismissUi: false },
    )
      .catch(error => console.error('Background decline API call error:', error))
      .finally(() => clearPendingCall());
  }, [roomId, callType, callId, name, callerId, profileImageUrl, dispatch, leaveIncomingUi, stopRingtone, clearSafetyTimer, markActed]);

  const tapAcceptGesture = Gesture.Tap().onEnd(() => {
    runOnJS(triggerAcceptJS)();
  });

  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      if (e.translationY <= 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd(e => {
      const dragDistance = Math.abs(e.translationY);
      const velocity = Math.abs(e.velocityY);

      if (dragDistance >= ACCEPT_THRESHOLD || velocity >= VELOCITY_THRESHOLD) {
        runOnJS(triggerAcceptJS)();
        triggerSuccessSequence();
      } else {
        translateY.value = withSpring(0, {
          damping: 15,
          stiffness: 300,
          mass: 0.8,
        });
      }
    });

  const acceptGesture = Gesture.Exclusive(tapAcceptGesture, panGesture);

  // ─── Animated styles ───
  const buttonAnimStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      Math.abs(translateY.value),
      [0, ACCEPT_THRESHOLD],
      [1, 1.15],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateY: translateY.value }, { scale }],
      opacity: acceptButtonOpacity.value,
    };
  });

  const trailAnimStyle = useAnimatedStyle(() => {
    const trailHeight = Math.abs(translateY.value);
    return {
      height: trailHeight > 0 ? trailHeight + BUTTON_SIZE / 2 : 0,
      opacity: interpolate(trailHeight, [0, ACCEPT_THRESHOLD], [0, 0.6]),
    };
  });

  const chevronContainerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      Math.abs(translateY.value),
      [0, 50],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return { 
        opacity: opacity * arrowsOpacity.value 
    };
  });

  const declineButtonStyle = useAnimatedStyle(() => ({
    opacity: declineButtonOpacity.value,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  if (showLoader) {
    return (
      <View style={styles.loaderContainer}>
        <LegacyLoader />
        <Text style={styles.loaderText}>Connecting...</Text>
        <TouchableOpacity
          style={styles.loaderCancelBtn}
          onPress={leaveIncomingUi}
          activeOpacity={0.7}>
          <Text style={styles.loaderCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <Animated.View style={[styles.containerInner, containerAnimatedStyle, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* ─── Profile section ─── */}
        <View style={styles.profileSection}>
          <View style={styles.profileContainer}>
            <PulseRing />
            <View style={styles.profileCircle}>
              <Image
                source={{ uri: profileImageUrl }}
                style={styles.profilePhoto}
                contentFit="cover"
              />
            </View>
          </View>

          <Text style={styles.callerName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.callTypeLabel}>{callType === 'video' ? 'Video' : 'Audio'} Call</Text>
        </View>

        {/* ─── Bottom controls ─── */}
        <View style={styles.bottomControls}>
          <View style={styles.declineContainer} pointerEvents="box-none">
            <Animated.View style={declineButtonStyle} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.declineButton}
                onPress={handleDecline}
                activeOpacity={0.7}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                accessibilityRole="button"
                accessibilityLabel="Decline call">
                <Feather name="x" size={28} color="#EF4444" />
              </TouchableOpacity>
            </Animated.View>
            <Text style={styles.buttonLabel}>Decline</Text>
          </View>

          <View style={styles.acceptContainer} pointerEvents="box-none">
            <Animated.View
              style={[styles.chevronContainer, chevronContainerStyle]}
              pointerEvents="none">
              <ChevronArrow delay={0} />
              <ChevronArrow delay={200} />
              <ChevronArrow delay={400} />
            </Animated.View>

            <Animated.View
              style={[styles.trailContainer, trailAnimStyle]}
              pointerEvents="none">
              <LinearGradient
                colors={['transparent', '#10B98140', '#10B98180', '#10B981']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              />
            </Animated.View>

            <GestureDetector gesture={acceptGesture}>
              <Animated.View
                style={[styles.acceptButton, buttonAnimStyle]}
                accessibilityRole="button"
                accessibilityLabel="Accept call">
                <LinearGradient
                  colors={['#34D399', '#10B981']}
                  style={styles.acceptGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}>
                  <Ionicons name="call" size={30} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>
            </GestureDetector>

            <Text style={styles.buttonLabel}>Accept</Text>
          </View>
        </View>
        <CallDebugConsole logs={logs} onClear={clearLogs} />
      </Animated.View>

      <MicPermissionModal
        visible={showMicModal}
        mode="receiver"
        callType={callType}
        isLoading={micModalLoading}
        onGivePermission={async () => {
          console.log('🎤 [IncomingCall] Open Settings tapped, calling reject API...');
          setMicModalLoading(true);
          
          // Clear dedup guard so caller can retry
          if (callId) dispatch(clearProcessedRoomId(callId));

          const safeGoBack = () => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.replace('chatRoomTab', { screen: 'home' });
            }
          };

          try {
            const res = await callAcceptManual({
              token,
              data: {
                roomId: roomId,
                callType: callType || 'audio',
                status: 'REJECTED',
                reason: 'microphone',
              },
            });
            console.log('🎤 [IncomingCall] Reject API response:', JSON.stringify(res));
            if (res?.data?.success || res?.data?.statusCode === 200) {
              console.log('🎤 [IncomingCall] API returned success, opening settings...');
              Linking.openSettings();
              safeGoBack();
            } else {
              console.log('🎤 [IncomingCall] API failed, going back...', res?.error);
              safeGoBack();
            }
          } catch(e) {
            console.log('🎤 [IncomingCall] Reject API exception:', e);
            safeGoBack();
          }
        }}
        onCancel={() => {
          setShowMicModal(false);
          // Clear dedup guard so caller can retry
          if (callId) dispatch(clearProcessedRoomId(callId));
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.replace('chatRoomTab', { screen: 'home' });
          }
        }}
      />
    </GestureHandlerRootView>
  );
};

export default IncomingCallScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerInner: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // ─── Legacy Loader Styles ───
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  legacyLoaderContainer: {
    backgroundColor: "white", 
    padding: responsiveWidth(3), 
    elevation: 2, 
    borderRadius: responsiveWidth(10), 
    justifyContent: "center", 
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.20,
    shadowRadius: 1.41,
  },
  loaderText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Rubik-Medium',
  },
  loaderCancelBtn: {
    marginTop: 28,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FFFFFF',
  },
  loaderCancelText: {
    fontSize: 15,
    color: '#EF4444',
    fontFamily: 'Rubik-Medium',
  },

  // ─── Profile ───
  profileSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: height * 0.05,
  },
  profileContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pulseRing: {
    position: 'absolute',
    width: 170, 
    height: 170,
    borderRadius: 85,
    borderWidth: 2,
    borderColor: '#E5E7EB', 
    backgroundColor: 'transparent',
  },
  profileCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  callerName: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
    color: '#1E1E1E',
    marginBottom: 8,
    maxWidth: width * 0.7,
  },
  callTypeLabel: {
    fontFamily: 'Rubik',
    fontSize: 15,
    textAlign: 'center',
    color: '#6B7280',
  },

  // ─── Bottom controls ───
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'center', 
    gap: 100, 
    marginBottom: 80,
    alignItems: 'flex-end', 
  },
  
  // Left side
  declineContainer: {
    alignItems: 'center',
    marginBottom: 0, 
  },
  declineButton: {
    width: DECLINE_SIZE,
    height: DECLINE_SIZE,
    borderRadius: DECLINE_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
  },

  // Right side
  acceptContainer: {
    alignItems: 'center',
  },
  acceptButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#34D399',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 8,
    zIndex: 10,
  },
  acceptGradient: {
    width: '100%',
    height: '100%',
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Animations
  chevronContainer: {
    alignItems: 'center',
    marginBottom: 10,
    gap: -6,
  },
  trailContainer: {
    position: 'absolute',
    bottom: BUTTON_SIZE / 2 + 8, 
    width: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    overflow: 'hidden',
    alignSelf: 'center',
  },

  buttonLabel: {
    fontFamily: 'Rubik',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
});