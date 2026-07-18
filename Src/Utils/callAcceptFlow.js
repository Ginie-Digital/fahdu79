import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMMKV } from 'react-native-mmkv';
import store from '../../Redux/Store';
import { BASE_URL } from '../Configs/ApiConfig';
import { navigate } from '../../Navigation/RootNavigation';

const PENDING_CALL_KEY = 'pendingCall';
/** In-memory guard across background handler + cold-start bootstrap. */
const recentlyAcceptedRooms = new Set();
const recentlyRejectedRooms = new Set();
const acceptInFlightRooms = new Set();
/** Prevent double navigation from bootstrap + pendingCall startup. */
let launchCallHandled = false;

const mmkv = createMMKV({ id: 'default' });

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

    // Headless background often has no PersistGate — read storage directly.
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
        roomId,
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
  // Only true after accept/reject API succeeds (used for cold-start retry).
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
 * Instant accept intent — call this BEFORE any await when Accept is pressed.
 * Fixes Android launchActivity racing ahead of the background JS handler.
 */
export const markCallAcceptedSync = callData => {
  if (!callData?.roomId) return;
  recentlyAcceptedRooms.add(callData.roomId);
  persistPendingCallSync(callData, { accepted: true, apiDone: false });
};

export const markCallRejectedSync = callData => {
  if (!callData?.roomId) return;
  recentlyRejectedRooms.add(callData.roomId);
  persistPendingCallSync(callData, { rejected: true, apiDone: false });
};

export const wasRecentlyAccepted = roomId => !!roomId && recentlyAcceptedRooms.has(roomId);
export const wasRecentlyRejected = roomId => !!roomId && recentlyRejectedRooms.has(roomId);

export const claimLaunchCallHandling = () => {
  if (launchCallHandled) return false;
  launchCallHandled = true;
  return true;
};

export const openActiveCallScreen = callData => {
  const callType = callData.callType || 'audio';
  navigate(callType === 'video' ? 'videoCallScreen' : 'callScreen', {
    roomId: callData.roomId,
    name: callData.displayName || callData.callerName || 'Call',
    callType,
    callerId: callData.senderId || callData.callerId,
    profileImageUrl: callData.profileImage || callData.profileImageUrl,
    callAccepted: true,
  });
};

/**
 * Accept from notification action: hit API once, then open the active call screen.
 * Avoids routing through IncomingCall (which forced a second Accept).
 */
export const acceptCallFromNotification = async (callData, { navigateNow = true } = {}) => {
  if (!callData?.roomId) {
    return { success: false, error: 'No roomId' };
  }

  // Stamp ACCEPTED sync first so startup never opens IncomingCall over Accept.
  markCallAcceptedSync(callData);

  const pending = getPendingCallSync();
  if (
    pending?.roomId === callData.roomId &&
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

  if (acceptInFlightRooms.has(callData.roomId)) {
    console.log('📱 [acceptCallFromNotification] Accept already in-flight, skipping duplicate API');
    if (navigateNow) openActiveCallScreen(callData);
    return { success: true, data: { inFlight: true } };
  }

  acceptInFlightRooms.add(callData.roomId);
  let result;
  try {
    result = await callAcceptAPI(callData.roomId, callData.callType, 'ACCEPTED');
  } finally {
    acceptInFlightRooms.delete(callData.roomId);
  }

  if (result.success) {
    persistPendingCallSync(callData, { accepted: true, apiDone: true });
  } else {
    // Keep ACCEPTED intent; Main will retry API once token/nav is ready.
    console.log('⚠️ [acceptCallFromNotification] API failed, intent persisted for retry:', result.error);
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
 * Decline from notification action: hit API once and clear pending state.
 * Prefer calling with no launchActivity so the app stays closed.
 */
export const declineCallFromNotification = async callData => {
  if (!callData?.roomId) {
    return { success: false, error: 'No roomId' };
  }

  if (recentlyRejectedRooms.has(callData.roomId)) {
    await clearPendingCall();
    return { success: true, data: { alreadyRejected: true } };
  }

  // Stamp REJECTED sync first so startup never opens IncomingCall.
  markCallRejectedSync(callData);

  const result = await callAcceptAPI(callData.roomId, callData.callType, 'REJECTED');
  if (!result.success) {
    console.log('⚠️ [declineCallFromNotification] API failed:', result.error);
  }

  await clearPendingCall();
  return result.success ? result : { success: true, data: { deferred: true, error: result.error } };
};

/**
 * Used on app start when Accept was pressed in background but API may have failed.
 */
export const ensureAcceptedCallReady = async callData => {
  if (!callData?.roomId) return { success: false, error: 'No roomId' };

  if (callData.apiDone) {
    recentlyAcceptedRooms.add(callData.roomId);
    return { success: true, data: { alreadyAccepted: true } };
  }

  const result = await callAcceptAPI(callData.roomId, callData.callType, 'ACCEPTED');
  if (result.success) {
    recentlyAcceptedRooms.add(callData.roomId);
    persistPendingCallSync(callData, { accepted: true, apiDone: true });
  }
  return result;
};
