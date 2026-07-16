import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNCallKeep from 'react-native-callkeep';
import VoipPushNotification from 'react-native-voip-push-notification';
import store from '../../Redux/Store';
import { BASE_URL } from '../Configs/ApiConfig';
import { navigate } from '../../Navigation/RootNavigation';

const PENDING_CALL_KEY = 'pendingCall';
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

let configured = false;
let eventsRegistered = false;
let activeCall = null;
let _appStateSubscription = null;

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
    callUUID: content.callUUID || content.callUuid || makeUuid(),
    callId: content.callId || content.call_id || '',
    roomId: content.roomId || content.room_id || '',
    callType: content.callType === 'video' ? 'video' : 'audio',
    name: content.name || content.displayName || content.username || 'Incoming call',
    callerId: content.callerId || content.senderId || content.sender_id || '',
    profileImageUrl: content.profileImageUrl || content.profileImage || content.profile_image || content.profileImageurl || '',
    status: 'PENDING',
    callAccepted: false,
  };
};

const callStatus = async (call, status) => {
  const token = store.getState()?.auth?.user?.token;
  if (!token || !call.roomId) return false;

  try {
    const response = await fetch(`${BASE_URL}/api/stream/call/accept/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ roomId: call.roomId, callType: call.callType, status }),
    });
    return response.ok;
  } catch (error) {
    console.warn('[IncomingCallService] Unable to update call state:', error?.message);
    return false;
  }
};

const persist = async call => {
  activeCall = call;
  await AsyncStorage.setItem(PENDING_CALL_KEY, JSON.stringify(call));
};

const clear = async () => {
  activeCall = null;
  await AsyncStorage.removeItem(PENDING_CALL_KEY);
};

const getPendingCall = async callUUID => {
  if (activeCall && (!callUUID || activeCall.callUUID === callUUID)) return activeCall;
  const raw = await AsyncStorage.getItem(PENDING_CALL_KEY);
  if (!raw) return null;
  const call = JSON.parse(raw);
  activeCall = call;
  return !callUUID || call.callUUID === callUUID ? call : null;
};

const openAcceptedCall = call => {
  RNCallKeep.backToForeground();
  navigate(call.callType === 'video' ? 'videoCallScreen' : 'callScreen', {
    roomId: call.roomId,
    name: call.name,
    callType: call.callType,
    callerId: call.callerId,
    profileImageUrl: call.profileImageUrl,
    callAccepted: true,
  });
};

const registerEvents = () => {
  if (eventsRegistered) return;
  eventsRegistered = true;

  RNCallKeep.addEventListener('answerCall', async ({ callUUID }) => {
    const call = await getPendingCall(callUUID);
    if (!call) return;
    const accepted = await callStatus(call, 'ACCEPTED');
    if (accepted) openAcceptedCall(call);
    else RNCallKeep.endCall(callUUID);
    await clear();
  });

  RNCallKeep.addEventListener('endCall', async ({ callUUID }) => {
    const call = await getPendingCall(callUUID);
    if (call) await callStatus(call, 'REJECTED');
    await clear();
  });

  RNCallKeep.addEventListener('didLoadWithEvents', events => {
    events?.forEach(({ name, data }) => {
      if (name === 'RNCallKeepPerformAnswerCallAction') {
        RNCallKeep.emit('answerCall', data);
      }
    });
  });
};

const _startAppStateWatcher = () => {
  if (_appStateSubscription) return;
  try {
    _appStateSubscription = AppState.addEventListener('change', async next => {
      try {
        if (next === 'active') {
          const pending = await getPendingCall();
          if (pending && pending.roomId) {
            if (pending.status === 'ACCEPTED' || pending.callAccepted) {
              openAcceptedCall(pending);
            } else if (pending.status === 'REJECTED') {
              await clear();
            } else {
              try {
                navigate('incomingCall', {
                  roomId: pending.roomId,
                  name: pending.name,
                  callType: pending.callType,
                  callerId: pending.callerId,
                  profileImageUrl: pending.profileImageUrl,
                });
              } catch (navErr) {
                console.warn('[IncomingCallService] Navigation to incomingCall failed:', navErr?.message || navErr);
              }
            }
          }
        }
      } catch (err) {
        console.warn('[IncomingCallService] AppState watcher handler error:', err?.message || err);
      }
    });
  } catch (err) {
    console.warn('[IncomingCallService] Failed to start AppState watcher:', err?.message || err);
  }
};

const configure = async () => {
  if (!configured) {
    configured = true;
    await RNCallKeep.setup(CALLKEEP_OPTIONS);
    RNCallKeep.setAvailable(true);
  }
  _startAppStateWatcher();
  registerEvents();
};

const showIncomingCall = async payload => {
  const call = normalizeCall(payload);
  if (!call.roomId) {
    console.warn('[IncomingCallService] Ignoring incoming call without roomId');
    return null;
  }
  await configure();
  await persist(call);
  try {
    const isActive = AppState.currentState === 'active';
    if (isActive) {
      // If app is active, open in-app incoming call UI instead of system call UI
      navigate('incomingCall', {
        roomId: call.roomId,
        name: call.name,
        callType: call.callType,
        callerId: call.callerId,
        profileImageUrl: call.profileImageUrl,
      });
    } else {
      await RNCallKeep.displayIncomingCall(
        call.callUUID,
        call.callerId || call.name,
        call.name,
        'generic',
        call.callType === 'video',
        call,
      );
    }
  } catch (err) {
    console.warn('[IncomingCallService] showIncomingCall failed:', err?.message || err);
  }
  return call;
};

const registerVoipPushes = onToken => {
  if (Platform.OS !== 'ios') return () => {};
  const onRegister = token => onToken?.(token);
  const onNotification = async notification => {
    try {
      await showIncomingCall(notification);
    } finally {
      VoipPushNotification.onVoipNotificationCompleted(notification.uuid);
    }
  };
  const onLoaded = events => events?.forEach(event => {
    if (event.name === VoipPushNotification.RNVoipPushRemoteNotificationReceivedEvent) onNotification(event.data);
    if (event.name === VoipPushNotification.RNVoipPushRemoteNotificationsRegisteredEvent) onRegister(event.data);
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

const endSystemCall = async callUUID => {
  const call = await getPendingCall(callUUID);
  if (call?.callUUID) RNCallKeep.endCall(call.callUUID);
  await clear();
};

export default { configure, showIncomingCall, registerVoipPushes, endSystemCall, getPendingCall };
