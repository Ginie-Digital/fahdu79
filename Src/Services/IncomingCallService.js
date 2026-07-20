import { AppState, Platform } from 'react-native';
import RNCallKeep from 'react-native-callkeep';
import VoipPushNotification from 'react-native-voip-push-notification';
import {
  prepareIncomingCall,
  acceptCallFromNotification,
  declineCallFromNotification,
  markCallAcceptedSync,
  markCallRejectedSync,
  openIncomingCallScreen,
  openActiveCallScreen,
  getPendingCallSync,
  clearPendingCall,
  isTerminalCallStatus,
  invalidateIncomingCall,
  fetchOtherParticipantStatus,
  wasRecentlyRejected,
  wasCallEndedRecently,
  wasRecentlyAccepted,
} from '../Utils/callAcceptFlow';
import { showIncomingCallNotification, cancelIncomingCallNotification } from '../../Notificaton';

const CALLKEEP_OPTIONS = {
  ios: {
    appName: 'Fahdu',
    supportsVideo: true,
    maximumCallGroups: '1',
    maximumCallsPerCallGroup: '1',
    includesCallsInRecents: false,
  },
  android: {
    alertTitle: 'Calling permission',
    alertDescription: 'Fahdu needs calling permission to show incoming calls.',
    cancelButton: 'Cancel',
    okButton: 'Allow',
    foregroundService: {
      channelId: 'fahdu_calls',
      channelName: 'Fahdu calls',
      notificationTitle: 'Fahdu call in progress',
      notificationIcon: 'icon_notification',
    },
  },
};

/** CXCallEndedReasonRemoteEnded */
const CALL_ENDED_REMOTE = 2;
/** CXCallEndedReasonUnanswered / declined */
const CALL_ENDED_UNANSWERED = 3;

let configured = false;
let eventsRegistered = false;
let activeCall = null;
let _appStateSubscription = null;
/** Prevent CallKit endCall-after-answer from firing REJECT API. */
let answeringCallUUID = null;
/** Prevent reportEndCallWithUUID / remote dismiss from firing REJECT API. */
let remoteEndingUUID = null;

const makeUuid = () => {
  const hex = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return hex.replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
};

const normalizeCall = payload => {
  const content = payload?.content || payload?.data?.content || payload || {};
  return {
    // Prefer PushKit / payload uuid so onVoipNotificationCompleted matches AppDelegate handler.
    callUUID:
      payload?.uuid ||
      payload?.callUUID ||
      content.callUUID ||
      content.callUuid ||
      makeUuid(),
    callId: content.callId || content.call_id || '',
    roomId: content.roomId || content.room_id || '',
    callType: content.callType === 'video' ? 'video' : 'audio',
    name: content.name || content.displayName || content.username || content.callerName || 'Incoming call',
    displayName: content.displayName || content.name || content.username || content.callerName || 'Incoming call',
    callerName: content.callerName || content.displayName || content.name || 'Incoming call',
    callerId: content.callerId || content.senderId || content.sender_id || '',
    senderId: content.senderId || content.callerId || content.sender_id || '',
    profileImageUrl:
      content.profileImageUrl ||
      content.profileImage ||
      content.profile_image ||
      content.profileImageurl ||
      '',
    profileImage: content.profileImage || content.profileImageUrl || content.profile_image || '',
    status: 'PENDING',
    callAccepted: false,
  };
};

const toFlowPayload = call => ({
  roomId: call.roomId,
  callId: call.callId,
  callType: call.callType,
  displayName: call.displayName || call.name,
  callerName: call.callerName || call.name,
  senderId: call.senderId || call.callerId,
  callerId: call.callerId || call.senderId,
  profileImage: call.profileImage || call.profileImageUrl,
  profileImageUrl: call.profileImageUrl || call.profileImage,
});

const persistLocal = call => {
  activeCall = call;
  prepareIncomingCall(toFlowPayload(call));
};

const clearActiveOnly = () => {
  activeCall = null;
};

const clearLocal = async () => {
  activeCall = null;
  await clearPendingCall();
};

const getPendingCall = async callUUID => {
  if (activeCall && (!callUUID || activeCall.callUUID === callUUID)) {
    return activeCall;
  }
  const pending = getPendingCallSync();
  if (!pending?.roomId) return null;
  const call = {
    ...normalizeCall(pending),
    callUUID: activeCall?.callUUID || makeUuid(),
    status: pending.status || 'PENDING',
    callAccepted: !!pending.callAccepted,
  };
  activeCall = call;
  if (callUUID && activeCall.callUUID !== callUUID) return null;
  return call;
};

const reportCallEnded = (callUUID, reason = CALL_ENDED_REMOTE) => {
  const uuid = callUUID || activeCall?.callUUID;
  if (!uuid) {
    try {
      if (typeof RNCallKeep.endAllCalls === 'function') {
        remoteEndingUUID = 'all';
        RNCallKeep.endAllCalls();
        remoteEndingUUID = null;
      }
    } catch (_) {}
    return;
  }
  try {
    remoteEndingUUID = uuid;
    if (typeof RNCallKeep.reportEndCallWithUUID === 'function') {
      RNCallKeep.reportEndCallWithUUID(uuid, reason);
    } else {
      RNCallKeep.endCall(uuid);
    }
  } catch (e) {
    console.warn('[IncomingCallService] reportCallEnded failed:', e?.message || e);
    try {
      RNCallKeep.endCall(uuid);
    } catch (_) {}
  } finally {
    // Keep flag briefly so async endCall listener can see it.
    setTimeout(() => {
      if (remoteEndingUUID === uuid) remoteEndingUUID = null;
    }, 1500);
  }
};

const registerEvents = () => {
  if (eventsRegistered) return;
  eventsRegistered = true;

  RNCallKeep.addEventListener('answerCall', async ({ callUUID }) => {
    console.log('📱 [IncomingCallService] CallKit answerCall', callUUID);
    answeringCallUUID = callUUID;
    const call = await getPendingCall(callUUID);
    if (!call?.roomId) {
      reportCallEnded(callUUID, CALL_ENDED_UNANSWERED);
      answeringCallUUID = null;
      return;
    }

    const flowPayload = toFlowPayload(call);

    // Stale CallKit answer after creator already cancelled / unavailable (kill-mode).
    if (
      wasCallEndedRecently(flowPayload) ||
      isTerminalCallStatus(getPendingCallSync()?.status)
    ) {
      console.log('📱 [IncomingCallService] Ignoring answer — call already ended locally');
      await invalidateIncomingCall(flowPayload, 'ENDED');
      reportCallEnded(callUUID, CALL_ENDED_REMOTE);
      answeringCallUUID = null;
      clearActiveOnly();
      return;
    }

    // Soft remote check — UNAVAILABLE is often wrong while creator still rings.
    // Body-tap uses strict isIncomingCallStillActive; Answer should still join.
    try {
      const remote = await fetchOtherParticipantStatus(flowPayload.roomId);
      const remoteUpper = remote ? String(remote).toUpperCase() : null;
      if (
        remoteUpper &&
        remoteUpper !== 'UNAVAILABLE' &&
        isTerminalCallStatus(remoteUpper)
      ) {
        console.log('📱 [IncomingCallService] Ignoring answer — remote hard-ended:', remoteUpper);
        await invalidateIncomingCall(flowPayload, remoteUpper);
        reportCallEnded(callUUID, CALL_ENDED_REMOTE);
        answeringCallUUID = null;
        clearActiveOnly();
        return;
      }
    } catch (_) {}

    markCallAcceptedSync(flowPayload);
    try {
      RNCallKeep.backToForeground();
    } catch (_) {}

    await acceptCallFromNotification(flowPayload, { navigateNow: true });

    try {
      await cancelIncomingCallNotification(call.roomId);
    } catch (_) {}
    clearActiveOnly();
    try {
      // Ending CallKit UI after answer also fires endCall — guarded by answeringCallUUID.
      remoteEndingUUID = callUUID;
      RNCallKeep.endCall(callUUID);
    } catch (_) {}
    answeringCallUUID = null;
    setTimeout(() => {
      if (remoteEndingUUID === callUUID) remoteEndingUUID = null;
    }, 1500);
  });

  RNCallKeep.addEventListener('endCall', async ({ callUUID }) => {
    // Ignore synthetic endCall that follows answerCall.
    if (answeringCallUUID && callUUID === answeringCallUUID) {
      console.log('📱 [IncomingCallService] Ignoring endCall after answer');
      return;
    }
    // Ignore remote/creator-ended reportEndCallWithUUID — do NOT treat as user reject.
    if (remoteEndingUUID && (remoteEndingUUID === callUUID || remoteEndingUUID === 'all')) {
      console.log('📱 [IncomingCallService] Ignoring endCall after remote end');
      clearActiveOnly();
      return;
    }

    console.log('📱 [IncomingCallService] CallKit endCall (user decline)', callUUID);
    const call = await getPendingCall(callUUID);
    if (call?.roomId) {
      markCallRejectedSync(toFlowPayload(call));
      try {
        await declineCallFromNotification(toFlowPayload(call), { dismissUi: false });
      } catch (e) {
        console.warn('[IncomingCallService] Decline from CallKit failed:', e?.message || e);
      }
      try {
        await cancelIncomingCallNotification(call.roomId);
      } catch (_) {}
    }
    // Keep ENDED/REJECTED MMKV stamp — never wipe after reject.
    clearActiveOnly();
  });

  RNCallKeep.addEventListener('didLoadWithEvents', events => {
    events?.forEach(({ name, data }) => {
      if (name === 'RNCallKeepPerformAnswerCallAction') {
        RNCallKeep.emit('answerCall', data);
      }
      if (name === 'RNCallKeepPerformEndCallAction') {
        RNCallKeep.emit('endCall', data);
      }
    });
  });
};

/**
 * iOS AppState watcher:
 * - ACCEPTED → open call screen (CallKit answer while app was backgrounded)
 * - ENDED/REJECTED → clean chrome only
 * - PENDING → do NOT auto-open IncomingCall (that races Decline / stale taps).
 *   Body tap is handled by Notifee PRESS / getInitialNotification + openIncomingCallScreenIfActive.
 */
const _startAppStateWatcher = () => {
  if (_appStateSubscription) return;
  try {
    _appStateSubscription = AppState.addEventListener('change', async next => {
      try {
        if (next !== 'active') return;

        const pending = getPendingCallSync();
        if (!pending?.roomId) return;

        const pendingHardEnded =
          pending.status &&
          ['REJECTED', 'ENDED', 'CANCELLED', 'CANCELED', 'MISSED', 'COMPLETED'].includes(
            String(pending.status).toUpperCase(),
          );
        // Do not invalidate on room-level wasCallEndedRecently — that cancelled
        // Accept/Reject Notifee for the next call in the same chat.
        if (
          pendingHardEnded ||
          (pending.callId && wasRecentlyRejected(pending) && wasCallEndedRecently(pending))
        ) {
          console.log('📱 [IncomingCallService] App active — pending hard-ended, dismissing CallKit');
          await invalidateIncomingCall(pending, pending.status || 'ENDED');
          reportCallEnded(activeCall?.callUUID, CALL_ENDED_REMOTE);
          clearActiveOnly();
          return;
        }

        if (
          pending.status === 'ACCEPTED' ||
          pending.callAccepted ||
          wasRecentlyAccepted(pending)
        ) {
          console.log('📱 [IncomingCallService] App active — opening accepted call');
          openActiveCallScreen(pending);
          return;
        }

        // PENDING: intentionally no auto-open on iOS.
        console.log(
          '📱 [IncomingCallService] App active with PENDING — skip auto IncomingCall (Notifee/CallKit own UX)',
        );
      } catch (err) {
        console.warn('[IncomingCallService] AppState watcher error:', err?.message || err);
      }
    });
  } catch (err) {
    console.warn('[IncomingCallService] Failed to start AppState watcher:', err?.message || err);
  }
};

const configure = async () => {
  if (Platform.OS !== 'ios') return;
  if (!configured) {
    configured = true;
    try {
      await RNCallKeep.setup(CALLKEEP_OPTIONS);
      RNCallKeep.setAvailable(true);
    } catch (e) {
      console.warn('[IncomingCallService] RNCallKeep.setup failed:', e?.message || e);
    }
  }
  _startAppStateWatcher();
  registerEvents();
};

/**
 * Show incoming call on iOS:
 * - Foreground: in-app IncomingCall + Notifee Accept/Decline
 * - Background/killed: CallKit + Notifee category (Decline foreground:false)
 */
const showIncomingCall = async (payload, { showNotifee = true } = {}) => {
  if (Platform.OS !== 'ios') return null;

  const call = normalizeCall(payload);
  if (!call.roomId) {
    console.warn('[IncomingCallService] Ignoring incoming call without roomId');
    return null;
  }

  const flowPayload = toFlowPayload(call);
  // Always show Accept/Reject Notifee first — never skip for room-level ended stamps.
  if (showNotifee) {
    try {
      await showIncomingCallNotification(flowPayload);
    } catch (e) {
      console.warn('[IncomingCallService] Notifee notification failed:', e?.message || e);
    }
  }

  // Same exact callId already ended → don't re-open CallKit / IncomingCall UI.
  if (wasCallEndedRecently(flowPayload) && call.callId) {
    console.log('📱 [IncomingCallService] Same callId ended — Notifee shown, skip CallKit/UI');
    return call;
  }

  await configure();
  persistLocal(call);

  const isActive = AppState.currentState === 'active';

  try {
    if (isActive) {
      console.log('📱 [IncomingCallService] Foreground — IncomingCall screen + Notifee actions');
      openIncomingCallScreen(flowPayload);
    } else {
      console.log('📱 [IncomingCallService] Background — CallKit UI');
      await RNCallKeep.displayIncomingCall(
        call.callUUID,
        call.callerId || call.name,
        call.name,
        'generic',
        call.callType === 'video',
      );
    }
  } catch (err) {
    console.warn('[IncomingCallService] showIncomingCall UI failed:', err?.message || err);
    if (AppState.currentState === 'active') {
      openIncomingCallScreen(flowPayload);
    }
  }

  return call;
};

const registerVoipPushes = onToken => {
  if (Platform.OS !== 'ios') return () => {};

  const onRegister = token => onToken?.(token);
  const onNotification = async notification => {
    let call = null;
    try {
      call = await showIncomingCall(notification, { showNotifee: true });
    } finally {
      try {
        const uuid =
          notification?.uuid ||
          notification?.callUUID ||
          call?.callUUID;
        if (uuid) {
          VoipPushNotification.onVoipNotificationCompleted(uuid);
        }
      } catch (_) {}
    }
  };
  const onLoaded = events =>
    events?.forEach(event => {
      if (event.name === VoipPushNotification.RNVoipPushRemoteNotificationReceivedEvent) {
        onNotification(event.data);
      }
      if (event.name === VoipPushNotification.RNVoipPushRemoteNotificationsRegisteredEvent) {
        onRegister(event.data);
      }
    });

  VoipPushNotification.addEventListener('register', onRegister);
  VoipPushNotification.addEventListener('notification', onNotification);
  VoipPushNotification.addEventListener('didLoadWithEvents', onLoaded);
  VoipPushNotification.registerVoipToken();

  return () => {
    VoipPushNotification.removeEventListener('register');
    VoipPushNotification.removeEventListener('notification');
    VoipPushNotification.removeEventListener('didLoadWithEvents');
  };
};

/**
 * Dismiss CallKit UI for remote end / Decline — uses reportEndCallWithUUID
 * so the endCall listener does NOT fire a second REJECT API or wipe stamps.
 */
const dismissCallKit = async callUUID => {
  reportCallEnded(callUUID || activeCall?.callUUID, CALL_ENDED_REMOTE);
};

/**
 * Creator cancelled / missed / unavailable — end CallKit + cancel Notifee.
 * Preserves ENDED pending stamp for stale notification taps.
 * Safe to call from invalidateIncomingCall (no re-entry into invalidate).
 */
const endSystemCall = async (callUUID, reason = CALL_ENDED_REMOTE) => {
  reportCallEnded(callUUID || activeCall?.callUUID, reason);
  const roomId = activeCall?.roomId || getPendingCallSync()?.roomId;
  if (roomId) {
    try {
      await cancelIncomingCallNotification(roomId);
    } catch (_) {}
  }
  clearActiveOnly();
};

export default {
  configure,
  showIncomingCall,
  registerVoipPushes,
  endSystemCall,
  dismissCallKit,
  getPendingCall,
};
