import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMMKV } from 'react-native-mmkv';
import { StackActions } from '@react-navigation/native';
import notifee from '@notifee/react-native';
import store from '../../Redux/Store';
import { BASE_URL } from '../Configs/ApiConfig';
import { navigate, navigationRef } from '../../Navigation/RootNavigation';
import RingtoneManager from '../Components/Calling/RingtoneManager';

const PENDING_CALL_KEY = 'pendingCall';
/** In-memory guards keyed by callId (fallback roomId). Never block the next call. */
const recentlyAcceptedKeys = new Set();
const recentlyRejectedKeys = new Set();
const acceptInFlightKeys = new Set();
const rejectInFlightKeys = new Set();
/** Keys where REJECTED API already succeeded (allows safe skip). */
const rejectedApiDoneKeys = new Set();
/** Prevent double navigation from bootstrap + pendingCall startup. */
let launchCallHandled = false;

/** IncomingCall screen listens so notification-Accept can stop ringtone/polling. */
const callIntentListeners = new Set();

export const subscribeCallIntent = listener => {
  callIntentListeners.add(listener);
  return () => callIntentListeners.delete(listener);
};

const emitCallIntent = (type, callData) => {
  callIntentListeners.forEach(listener => {
    try {
      listener({ type, callData });
    } catch (e) {
      console.warn('[emitCallIntent] listener error:', e?.message || e);
    }
  });
};

const mmkv = createMMKV({ id: 'default' });

/** Prefer callId — roomId is reused across calls in the same chat. */
export const callGuardKey = callData => {
  if (!callData) return null;
  if (callData.callId) return `call:${callData.callId}`;
  if (callData.roomId) return `room:${callData.roomId}`;
  return null;
};

const readTokenFromMmkv = () => {
  try {
    const raw = mmkv.getString('persist:root');
    if (!raw) return null;
    const root = JSON.parse(raw);
    const auth = typeof root?.auth === 'string' ? JSON.parse(root.auth) : root?.auth;
    return auth?.user?.token || null;
  } catch (e) {
    console.warn('[getAuthToken] MMKV persist read failed:', e?.message || e);
    return null;
  }
};

/**
 * Wait for Redux rehydration and return the auth token.
 * Falls back to MMKV persist + AsyncStorage login token for headless/background JS.
 */
export const getAuthToken = async (maxAttempts = 20) => {
  for (let i = 0; i < maxAttempts; i++) {
    const state = store.getState();
    const isRehydrated = state?._persist?.rehydrated;
    const token = state?.auth?.user?.token;

    if (token) {
      return token;
    }

    const mmkvToken = readTokenFromMmkv();
    if (mmkvToken) {
      return mmkvToken;
    }

    try {
      const asyncToken = await AsyncStorage.getItem('data');
      if (asyncToken) {
        return asyncToken;
      }
    } catch (e) {
      // ignore
    }

    if (isRehydrated && !token) {
      break;
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return readTokenFromMmkv() || (await AsyncStorage.getItem('data').catch(() => null));
};

const getCurrentUserId = () => {
  try {
    const fromStore = store.getState()?.auth?.user?.data?._id;
    if (fromStore) return fromStore;
    const raw = mmkv.getString('persist:root');
    if (!raw) return null;
    const root = JSON.parse(raw);
    const auth = typeof root?.auth === 'string' ? JSON.parse(root.auth) : root?.auth;
    return auth?.user?.data?._id || null;
  } catch (_) {
    return null;
  }
};

/**
 * Call accept/reject/unavailable API for a room.
 */
export const callAcceptAPI = async (roomId, callType, status) => {
  console.log('📡 [callAcceptAPI] Starting API call', { roomId, callType, status });

  if (!roomId) {
    return { success: false, error: 'No roomId' };
  }

  const token = await getAuthToken();
  if (!token) {
    console.log('❌ [callAcceptAPI] No auth token available');
    return { success: false, error: 'No token' };
  }

  try {
    const response = await fetch(`${BASE_URL}/api/stream/call/accept/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        roomId: String(roomId),
        callType: callType || 'audio',
        status,
      }),
    });

    const result = await response.json().catch(() => ({}));
    console.log('✅ [callAcceptAPI] API Response:', response.status, result);

    if (!response.ok) {
      return { success: false, error: result?.message || `HTTP ${response.status}`, data: result };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('❌ [callAcceptAPI] API Error:', error);
    return { success: false, error: error?.message || 'API error' };
  }
};

/** Fallback reject endpoint used by CallScreen hangup-before-accept. */
export const callRejectAPI = async callData => {
  const roomId = callData?.roomId;
  if (!roomId) {
    return { success: false, error: 'No roomId' };
  }

  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'No token' };
  }

  const userId = callData.userId || callData.receiverId || getCurrentUserId();
  console.log('📡 [callRejectAPI] Starting reject-call', { roomId, userId });

  try {
    const response = await fetch(`${BASE_URL}/api/stream/reject-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        roomId: String(roomId),
        callType: callData.callType || 'audio',
        userId,
      }),
    });

    const result = await response.json().catch(() => ({}));
    console.log('✅ [callRejectAPI] API Response:', response.status, result);

    if (!response.ok) {
      return { success: false, error: result?.message || `HTTP ${response.status}`, data: result };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('❌ [callRejectAPI] API Error:', error);
    return { success: false, error: error?.message || 'API error' };
  }
};

export const buildPendingCallPayload = (callData, { accepted, rejected, apiDone } = {}) => ({
  roomId: callData.roomId,
  callerName: callData.displayName || callData.callerName || 'Call',
  displayName: callData.displayName || callData.callerName || 'Call',
  callType: callData.callType || 'audio',
  senderId: callData.senderId || callData.callerId,
  profileImage: callData.profileImage || callData.profileImageUrl,
  callId: callData.callId,
  callAccepted: !!accepted,
  status: rejected ? 'REJECTED' : accepted ? 'ACCEPTED' : 'PENDING',
  apiDone: !!apiDone,
});

/** Sync write so cold-start cannot race Accept → PENDING IncomingCall. */
export const persistPendingCallSync = (callData, options) => {
  const payload = buildPendingCallPayload(callData, options);
  const json = JSON.stringify(payload);
  try {
    mmkv.set(PENDING_CALL_KEY, json);
  } catch (e) {
    console.warn('[persistPendingCallSync] MMKV write failed:', e?.message || e);
  }
  AsyncStorage.setItem(PENDING_CALL_KEY, json).catch(() => {});
  return payload;
};

export const persistPendingCall = async (callData, options) => {
  persistPendingCallSync(callData, options);
};

export const clearPendingCall = async () => {
  try {
    mmkv.remove(PENDING_CALL_KEY);
  } catch (_) {}
  await AsyncStorage.removeItem(PENDING_CALL_KEY);
};

export const getPendingCallSync = () => {
  try {
    const raw = mmkv.getString(PENDING_CALL_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
};

export const getPendingCall = async () => {
  const sync = getPendingCallSync();
  if (sync) return sync;
  try {
    const raw = await AsyncStorage.getItem(PENDING_CALL_KEY);
    if (raw) {
      try {
        mmkv.set(PENDING_CALL_KEY, raw);
      } catch (_) {}
      return JSON.parse(raw);
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * New ringing call arrived — clear stale Accept/Reject guards for this chat room
 * so the next call always shows IncomingCall.
 */
export const prepareIncomingCall = callData => {
  if (!callData?.roomId) return;

  launchCallHandled = false;

  // Drop room-scoped leftovers from a previous call in the same chat.
  recentlyAcceptedKeys.delete(`room:${callData.roomId}`);
  recentlyRejectedKeys.delete(`room:${callData.roomId}`);

  const existing = getPendingCallSync();
  if (
    existing?.roomId === callData.roomId &&
    callData.callId &&
    existing.callId &&
    existing.callId !== callData.callId
  ) {
    // Different call session for same room — replace pending.
  }

  persistPendingCallSync(callData, {});
};

export const markCallAcceptedSync = callData => {
  const key = callGuardKey(callData);
  if (!key) return;
  recentlyAcceptedKeys.add(key);
  persistPendingCallSync(callData, { accepted: true, apiDone: false });
  emitCallIntent('ACCEPTED', callData);
};

export const markCallRejectedSync = callData => {
  const key = callGuardKey(callData);
  if (!key) return;
  recentlyRejectedKeys.add(key);
  persistPendingCallSync(callData, { rejected: true, apiDone: false });
  emitCallIntent('REJECTED', callData);
};

export const wasRecentlyAccepted = callData => {
  const key = callGuardKey(typeof callData === 'string' ? { roomId: callData } : callData);
  return !!key && recentlyAcceptedKeys.has(key);
};

export const wasRecentlyRejected = callData => {
  const key = callGuardKey(typeof callData === 'string' ? { roomId: callData } : callData);
  return !!key && recentlyRejectedKeys.has(key);
};

export const claimLaunchCallHandling = () => {
  if (launchCallHandled) return false;
  launchCallHandled = true;
  return true;
};

export const resetLaunchCallHandling = () => {
  launchCallHandled = false;
};

export const openActiveCallScreen = callData => {
  const callType = callData.callType || 'audio';
  const screen = callType === 'video' ? 'videoCallScreen' : 'callScreen';
  const params = {
    roomId: callData.roomId,
    name: callData.displayName || callData.callerName || 'Call',
    callType,
    callerId: callData.senderId || callData.callerId,
    profileImageUrl: callData.profileImage || callData.profileImageUrl,
    callAccepted: true,
    callId: callData.callId,
  };

  if (navigationRef.isReady()) {
    try {
      const current = navigationRef.getCurrentRoute()?.name;
      // Replace IncomingCall — do NOT push on top (zombie polling + goBack kills CallScreen).
      if (current === 'incomingCall') {
        navigationRef.dispatch(StackActions.replace(screen, params));
        return;
      }
      if (current === screen) {
        navigationRef.dispatch(StackActions.replace(screen, params));
        return;
      }
      navigationRef.dispatch(StackActions.push(screen, params));
      return;
    } catch (e) {
      console.warn('[openActiveCallScreen] push failed, falling back to navigate:', e?.message || e);
    }
  }
  navigate(screen, params);
};

export const openIncomingCallScreen = callData => {
  if (!callData?.roomId) {
    console.warn('[openIncomingCallScreen] Missing roomId, skip');
    return false;
  }

  const params = {
    name: callData?.name || callData?.displayName || callData?.callerName || 'Call',
    profileImageUrl:
      callData?.profileImageurl ||
      callData?.profileImage ||
      callData?.profile_image ||
      callData?.profileImageUrl,
    roomId: callData?.roomId,
    callType: callData?.callType || 'audio',
    callerId: callData?.callerId || callData?.senderId,
    callId: callData?.callId,
  };

  const tryOpen = () => {
    if (!navigationRef.isReady()) return false;
    try {
      const current = navigationRef.getCurrentRoute()?.name;
      if (current === 'incomingCall') {
        navigationRef.dispatch(StackActions.replace('incomingCall', params));
        return true;
      }
      navigationRef.dispatch(StackActions.push('incomingCall', params));
      return true;
    } catch (e) {
      console.warn('[openIncomingCallScreen] push failed:', e?.message || e);
      return false;
    }
  };

  if (tryOpen()) {
    return true;
  }

  // Cold start: nav stack often not ready yet — retry, then fall back to navigate().
  console.log('⏳ [openIncomingCallScreen] Nav not ready, retrying...');
  let attempts = 0;
  const interval = setInterval(() => {
    attempts += 1;
    if (tryOpen()) {
      clearInterval(interval);
      return;
    }
    if (attempts >= 80) {
      clearInterval(interval);
      console.log('⚠️ [openIncomingCallScreen] Retry exhausted, using navigate()');
      navigate('incomingCall', params);
    }
  }, 100);

  return true;
};

export const dismissIncomingCallScreen = () => {
  if (!navigationRef.isReady()) {
    navigate('home');
    return;
  }
  try {
    const current = navigationRef.getCurrentRoute()?.name;
    if (current === 'incomingCall' || current === 'callScreen' || current === 'videoCallScreen') {
      if (navigationRef.canGoBack()) {
        navigationRef.goBack();
        return;
      }
    }
  } catch (_) {}
  navigate('home');
};

/**
 * Accept from notification action: hit API once, then open the active call screen.
 */
export const acceptCallFromNotification = async (callData, { navigateNow = true } = {}) => {
  if (!callData?.roomId) {
    return { success: false, error: 'No roomId' };
  }

  const key = callGuardKey(callData);
  markCallAcceptedSync(callData);

  const pending = getPendingCallSync();
  if (
    pending?.roomId === callData.roomId &&
    (!callData.callId || !pending.callId || pending.callId === callData.callId) &&
    (pending.status === 'ACCEPTED' || pending.callAccepted) &&
    pending.apiDone
  ) {
    console.log('📱 [acceptCallFromNotification] Already accepted, skipping duplicate API');
    if (navigateNow) {
      openActiveCallScreen(callData);
      await clearPendingCall();
    }
    return { success: true, data: { alreadyAccepted: true } };
  }

  if (key && acceptInFlightKeys.has(key)) {
    console.log('📱 [acceptCallFromNotification] Accept already in-flight, skipping duplicate API');
    if (navigateNow) openActiveCallScreen(callData);
    return { success: true, data: { inFlight: true } };
  }

  if (key) acceptInFlightKeys.add(key);
  let result;
  try {
    result = await callAcceptAPI(callData.roomId, callData.callType, 'ACCEPTED');
  } finally {
    if (key) acceptInFlightKeys.delete(key);
  }

  if (result.success) {
    persistPendingCallSync(callData, { accepted: true, apiDone: true });
  } else {
    // Do NOT treat USER_OFFLINE as hard-fail here: backend presence is often wrong
    // while the creator is still on the outgoing ringing screen. Join locally anyway;
    // CallScreen/VideoCallScreen + polling will end the call if the creator is truly gone.
    console.log(
      '⚠️ [acceptCallFromNotification] API failed, still joining call screen:',
      result.error,
      result.data,
    );
    persistPendingCallSync(callData, { accepted: true, apiDone: false });
  }

  if (navigateNow) {
    openActiveCallScreen(callData);
    if (result.success) {
      await clearPendingCall();
    }
  }

  return result.success ? result : { success: true, data: { deferred: true, error: result.error } };
};

/**
 * Decline from notification action: MUST hit reject API so caller side cuts.
 * Do not skip API just because markCallRejectedSync already ran (that only stamps intent).
 */
export const declineCallFromNotification = async (callData, { dismissUi = true } = {}) => {
  if (!callData?.roomId) {
    return { success: false, error: 'No roomId' };
  }

  const key = callGuardKey(callData);

  // Only skip when REJECT API already succeeded for this call session.
  if (key && rejectedApiDoneKeys.has(key)) {
    console.log('📱 [declineCallFromNotification] Reject API already done, skipping');
    await clearPendingCall();
    if (dismissUi) dismissIncomingCallScreen();
    return { success: true, data: { alreadyRejected: true } };
  }

  const pending = getPendingCallSync();
  if (
    pending?.status === 'REJECTED' &&
    pending?.apiDone &&
    pending?.roomId === callData.roomId &&
    (!callData.callId || !pending.callId || pending.callId === callData.callId)
  ) {
    if (key) rejectedApiDoneKeys.add(key);
    await clearPendingCall();
    if (dismissUi) dismissIncomingCallScreen();
    return { success: true, data: { alreadyRejected: true } };
  }

  if (key && rejectInFlightKeys.has(key)) {
    console.log('📱 [declineCallFromNotification] Reject already in-flight');
    if (dismissUi) dismissIncomingCallScreen();
    return { success: true, data: { inFlight: true } };
  }

  // Stamp REJECTED intent for startup UI (does NOT mean API finished).
  markCallRejectedSync(callData);

  if (key) rejectInFlightKeys.add(key);

  let result = { success: false, error: 'not attempted' };
  try {
    // Primary path — same as IncomingCall screen Reject button (notifies caller via socket).
    result = await callAcceptAPI(callData.roomId, callData.callType, 'REJECTED');

    // Fallback — CallScreen hangup path, if accept/manual failed (e.g. token race).
    if (!result.success) {
      console.log('⚠️ [declineCallFromNotification] accept/manual failed, trying reject-call:', result.error);
      result = await callRejectAPI(callData);
    }
  } finally {
    if (key) rejectInFlightKeys.delete(key);
  }

  if (result.success) {
    if (key) rejectedApiDoneKeys.add(key);
    persistPendingCallSync(callData, { rejected: true, apiDone: true });
    await clearPendingCall();
    console.log('✅ [declineCallFromNotification] Call rejected — caller should cut');
  } else {
    // Keep REJECTED pending without apiDone so cold-start/bootstrap can retry.
    persistPendingCallSync(callData, { rejected: true, apiDone: false });
    console.log('❌ [declineCallFromNotification] Reject API failed, pending kept for retry:', result.error);
  }

  try {
    RingtoneManager.stopAll();
  } catch (_) {}

  try {
    if (callData.roomId) {
      await notifee.cancelNotification('incoming_call_' + callData.roomId);
    }
  } catch (_) {}

  if (dismissUi) dismissIncomingCallScreen();

  return result.success
    ? result
    : { success: false, error: result.error, data: { deferred: true } };
};

/**
 * Used on app start when Accept was pressed in background but API may have failed.
 */
export const ensureAcceptedCallReady = async callData => {
  if (!callData?.roomId) return { success: false, error: 'No roomId' };

  const key = callGuardKey(callData);
  if (callData.apiDone) {
    if (key) recentlyAcceptedKeys.add(key);
    return { success: true, data: { alreadyAccepted: true } };
  }

  const result = await callAcceptAPI(callData.roomId, callData.callType, 'ACCEPTED');
  if (result.success) {
    if (key) recentlyAcceptedKeys.add(key);
    persistPendingCallSync(callData, { accepted: true, apiDone: true });
  }
  return result;
};
