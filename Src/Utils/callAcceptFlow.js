import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMMKV } from 'react-native-mmkv';
import { StackActions } from '@react-navigation/native';
import notifee from '@notifee/react-native';
import store from '../../Redux/Store';
import { BASE_URL } from '../Configs/ApiConfig';
import { navigate, navigationRef } from '../../Navigation/RootNavigation';
import RingtoneManager from '../Components/Calling/RingtoneManager';

const PENDING_CALL_KEY = 'pendingCall';
/** Survives process death — blocks stale notification taps after creator/user ended the call. */
const ENDED_CALLS_KEY = 'endedIncomingCalls';
const mmkv = createMMKV({ id: 'default' });

/** In-memory guards keyed by callId (fallback roomId). Never block the next call. */
const recentlyAcceptedKeys = new Set();
const recentlyRejectedKeys = new Set();
const acceptInFlightKeys = new Set();
const rejectInFlightKeys = new Set();
/** Keys where REJECTED API already succeeded (allows safe skip). */
const rejectedApiDoneKeys = new Set();
/** Prevent double navigation from bootstrap + pendingCall startup. */
let launchCallHandled = false;

/** Prefer callId — roomId is reused across calls in the same chat. */
export const callGuardKey = callData => {
  if (!callData) return null;
  if (callData.callId) return `call:${callData.callId}`;
  if (callData.roomId) return `room:${callData.roomId}`;
  return null;
};

/**
 * Normalize socket/FCM call payloads (room_id vs roomId, nested/string content, etc.).
 */
export const normalizeIncomingCallPayload = raw => {
  if (!raw || typeof raw !== 'object') return null;

  let nested = null;
  if (typeof raw.content === 'string' && raw.content.trim().startsWith('{')) {
    try {
      nested = JSON.parse(raw.content);
    } catch (_) {
      nested = null;
    }
  } else if (raw.content && typeof raw.content === 'object' && !Array.isArray(raw.content)) {
    nested = raw.content;
  }

  const src = nested ? { ...raw, ...nested } : raw;
  const roomId = src.roomId || src.room_id || src.chatRoomId || null;
  const callId = src.callId || src.call_id || null;
  if (!roomId) return null;
  return {
    ...src,
    roomId: String(roomId),
    callId: callId != null && callId !== '' ? String(callId) : undefined,
    callType: src.callType || src.call_type || 'audio',
    callerId: src.callerId || src.senderId || src.sender_id || src.caller_id,
    senderId: src.senderId || src.callerId || src.sender_id || src.caller_id,
    name: src.name || src.displayName || src.callerName || 'Call',
    displayName: src.displayName || src.name || src.callerName || 'Call',
    profileImage:
      src.profileImage ||
      src.profileImageurl ||
      src.profileImageUrl ||
      src.profile_image,
    profileImageurl:
      src.profileImageurl ||
      src.profileImage ||
      src.profileImageUrl ||
      src.profile_image,
  };
};

/** callId stamp TTL — blocks only that exact ended session. */
const ENDED_CALL_ID_TTL_MS = 60 * 60 * 1000;
/** room stamp TTL — must stay short or next call in same chat loses Accept/Reject notif. */
const ENDED_ROOM_TTL_MS = 8 * 1000;

const rememberEndedCall = callData => {
  const key = callGuardKey(callData);
  if (!key && !callData?.roomId) return;
  try {
    const raw = mmkv.getString(ENDED_CALLS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    if (callData?.callId) map[`call:${callData.callId}`] = now;
    if (callData?.roomId) map[`room:${callData.roomId}`] = now;
    const cutoff = now - ENDED_CALL_ID_TTL_MS;
    Object.keys(map).forEach(k => {
      if (!map[k] || map[k] < cutoff) delete map[k];
    });
    mmkv.set(ENDED_CALLS_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('[rememberEndedCall] failed:', e?.message || e);
  }
};

/**
 * True only if THIS call session already ended.
 * Prefer callId. Room stamp is short-lived so a new ring in the same chat
 * can still show Accept/Reject (was blocking for 60 minutes before).
 */
export const wasCallEndedRecently = callData => {
  if (!callData?.roomId && !callData?.callId) return false;
  try {
    const raw = mmkv.getString(ENDED_CALLS_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw);
    const now = Date.now();

    if (callData?.callId) {
      const callTs = map[`call:${callData.callId}`];
      if (callTs && now - callTs < ENDED_CALL_ID_TTL_MS) return true;
      // New callId in same room → not ended.
      return false;
    }

    // No callId: fall back to short room TTL only.
    const roomTs = callData?.roomId ? map[`room:${callData.roomId}`] : null;
    if (roomTs && now - roomTs < ENDED_ROOM_TTL_MS) return true;
    return false;
  } catch (_) {
    return false;
  }
};

/** Clear ended stamps so a fresh invite can show Accept/Reject. */
export const clearEndedCallStampForIncoming = callData => {
  if (!callData?.roomId && !callData?.callId) return;
  try {
    const raw = mmkv.getString(ENDED_CALLS_KEY);
    if (!raw) return;
    const map = JSON.parse(raw);
    if (callData.roomId) delete map[`room:${callData.roomId}`];
    // Never clear other callIds; only clear this callId if re-ringing same id.
    if (callData.callId) delete map[`call:${callData.callId}`];
    mmkv.set(ENDED_CALLS_KEY, JSON.stringify(map));
  } catch (_) {}
};

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

const ENDED_CALL_STATUSES = new Set([
  'REJECTED',
  'UNAVAILABLE',
  'DISCONNECTED',
  'FORCE_CLOSED',
  'CANCELLED',
  'CANCELED',
  'COMPLETED',
  'ENDED',
  'LEAVE',
  'MISSED',
  'IDLE',
  'NONE',
  'TIMEOUT',
  'EXPIRED',
  'FAILED',
  'NO_ANSWER',
  'BUSY',
  'DECLINED',
]);

/** Statuses that mean the creator is still ringing — only then open IncomingCall from a notif tap. */
const ACTIVE_RINGING_STATUSES = new Set([
  'RINGING',
  'CALLING',
  'PENDING',
  'INCOMING',
  'WAITING',
  'IS_STARTING',
  'CONNECTING',
  'INITIATED',
  'OUTGOING',
]);

export const buildPendingCallPayload = (
  callData,
  { accepted, rejected, ended, apiDone, statusOverride } = {},
) => ({
  roomId: callData.roomId,
  callerName: callData.displayName || callData.callerName || 'Call',
  displayName: callData.displayName || callData.callerName || 'Call',
  callType: callData.callType || 'audio',
  senderId: callData.senderId || callData.callerId,
  profileImage: callData.profileImage || callData.profileImageUrl,
  callId: callData.callId,
  callAccepted: !!accepted,
  status:
    statusOverride ||
    (ended ? 'ENDED' : rejected ? 'REJECTED' : accepted ? 'ACCEPTED' : 'PENDING'),
  apiDone: !!apiDone,
});

export const isTerminalCallStatus = status =>
  !!status && ENDED_CALL_STATUSES.has(String(status).toUpperCase());

/** Creator cancelled / timed out / missed — clear ringing UI if user taps later. */
export const markIncomingCallEndedSync = (callData, reason = 'ENDED') => {
  if (!callData?.roomId) return;
  const key = callGuardKey(callData);
  if (key) recentlyRejectedKeys.add(key);
  rememberEndedCall(callData);
  persistPendingCallSync(callData, {
    ended: true,
    statusOverride: reason,
    apiDone: true,
  });
  emitCallIntent('REJECTED', callData);
};

export const fetchOtherParticipantStatus = async roomId => {
  if (!roomId) return null;
  // Cold start after kill needs more time for MMKV/AsyncStorage token rehydrate.
  const token = await getAuthToken(30);
  if (!token) {
    console.warn('[fetchOtherParticipantStatus] no auth token yet — skip');
    return null;
  }

  try {
    const response = await fetch(
      `${BASE_URL}/api/stream/other/participant/status?roomId=${encodeURIComponent(String(roomId))}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn(
        '[fetchOtherParticipantStatus] HTTP',
        response.status,
        result?.message || result?.error || '',
      );
      return null;
    }
    // Match polling shape: body.data.status (and a few fallbacks).
    const status =
      result?.data?.status ||
      result?.data?.data?.status ||
      result?.status ||
      null;
    console.log('📡 [fetchOtherParticipantStatus]', roomId, status);
    return status ? String(status).toUpperCase() : null;
  } catch (e) {
    console.warn('[fetchOtherParticipantStatus] failed:', e?.message || e);
    return null;
  }
};

/** Hard end states from creator cancel / hangup (safe to trust for stale notif taps). */
const HARD_ENDED_REMOTE_STATUSES = new Set([
  'REJECTED',
  'DISCONNECTED',
  'FORCE_CLOSED',
  'CANCELLED',
  'CANCELED',
  'COMPLETED',
  'ENDED',
  'LEAVE',
  'MISSED',
]);

/**
 * Soft flaky statuses — server often returns these while creator is still
 * on the outgoing call screen. Must NOT block IncomingCall / Accept.
 */
const FLAKY_REMOTE_STATUSES = new Set([
  'UNAVAILABLE',
  'IDLE',
  'NONE',
  'DISCONNECTED', // often false while still ringing
]);

/**
 * Returns false only when the call is confidently ended.
 * Used before opening IncomingCall from a notification / cold-start tap.
 *
 * Soft rules (kill + FG tap):
 * - Hard-ended remote / local stamps → false
 * - Explicit ringing OR local PENDING → true
 * - Flaky UNAVAILABLE/IDLE/NONE → treat as still ringing if not hard-ended
 * - Unknown/null remote → true when local PENDING (notif tap implies live invite)
 */
export const isIncomingCallStillActive = async callData => {
  if (!callData?.roomId) return false;

  if (wasCallEndedRecently(callData) || wasRecentlyRejected(callData)) {
    console.log('📱 [isIncomingCallStillActive] call remembered as ended');
    return false;
  }

  const pending = getPendingCallSync();
  const samePending =
    !!pending?.roomId && String(pending.roomId) === String(callData.roomId);

  if (samePending && isTerminalCallStatus(pending.status)) {
    const pendingUpper = String(pending.status).toUpperCase();
    // Local PENDING stamp may have been wrongly marked UNAVAILABLE — ignore flaky.
    if (!FLAKY_REMOTE_STATUSES.has(pendingUpper) && HARD_ENDED_REMOTE_STATUSES.has(pendingUpper)) {
      console.log('📱 [isIncomingCallStillActive] pending already terminal:', pending.status);
      return false;
    }
    if (pendingUpper === 'REJECTED' || pendingUpper === 'ENDED' || pendingUpper === 'CANCELLED' || pendingUpper === 'CANCELED' || pendingUpper === 'MISSED' || pendingUpper === 'COMPLETED') {
      console.log('📱 [isIncomingCallStillActive] pending hard-ended:', pending.status);
      return false;
    }
  }

  let remoteStatus = await fetchOtherParticipantStatus(callData.roomId);
  // One retry — token/network often lag right after kill-mode cold start.
  if (!remoteStatus) {
    await new Promise(resolve => setTimeout(resolve, 600));
    remoteStatus = await fetchOtherParticipantStatus(callData.roomId);
  }
  const remoteUpper = remoteStatus ? String(remoteStatus).toUpperCase() : null;

  // Only trust hard creator-end statuses (never UNAVAILABLE/IDLE as dead).
  if (remoteUpper && HARD_ENDED_REMOTE_STATUSES.has(remoteUpper) && !FLAKY_REMOTE_STATUSES.has(remoteUpper)) {
    console.log('📱 [isIncomingCallStillActive] remote hard-ended:', remoteStatus);
    markIncomingCallEndedSync(callData, remoteStatus);
    return false;
  }

  if (remoteUpper && ACTIVE_RINGING_STATUSES.has(remoteUpper)) {
    return true;
  }

  // ACCEPTED → join active call, not IncomingCall ringing UI.
  if (remoteUpper === 'ACCEPTED') {
    console.log('📱 [isIncomingCallStillActive] remote ACCEPTED — not opening IncomingCall');
    return false;
  }

  const localPendingAlive =
    samePending &&
    (!pending.status ||
      pending.status === 'PENDING' ||
      pending.status === 'ACCEPTED' ||
      FLAKY_REMOTE_STATUSES.has(String(pending.status || '').toUpperCase()));

  // Flaky remote: creator often still ringing — open UI (notif tap / kill recovery).
  if (remoteUpper && FLAKY_REMOTE_STATUSES.has(remoteUpper)) {
    console.log('📱 [isIncomingCallStillActive] soft-open flaky remote:', remoteUpper);
    return true;
  }

  // Null remote (token not ready / API error) — NEVER treat as ended.
  // Blocking here made push-notification taps silently fail.
  if (!remoteUpper) {
    console.log('📱 [isIncomingCallStillActive] soft-open null remote (token/API lag)');
    return true;
  }

  // Unknown non-terminal status — open IncomingCall; screen polling will dismiss if dead.
  console.log('📱 [isIncomingCallStillActive] soft-open unknown remote:', remoteUpper);
  return true;
};

/**
 * Mark call ended + cancel notification chrome on BOTH platforms.
 * Keeps ENDED pending in MMKV so a later notification tap cannot reopen IncomingCall.
 */
export const invalidateIncomingCall = async (callData, reason = 'ENDED') => {
  const roomId = callData?.roomId || callData;
  const payload =
    typeof callData === 'object' && callData
      ? callData
      : { roomId };
  markIncomingCallEndedSync(payload, reason);

  // Notifee (iOS + Android fallback)
  try {
    const notifee = require('@notifee/react-native').default;
    if (roomId) {
      await notifee.cancelNotification('incoming_call_' + roomId);
      await notifee.cancelNotification(String(roomId));
    }
  } catch (_) {}

  // Android WhatsApp-style CallStyle notification
  try {
    if (roomId) {
      const { cancelAndroidCallStyleNotification } = require('../Services/IncomingCallStyle');
      await cancelAndroidCallStyleNotification(roomId);
    }
  } catch (_) {}

  // iOS CallKit banner
  try {
    const { Platform } = require('react-native');
    if (Platform.OS === 'ios') {
      const IncomingCallService = require('../Services/IncomingCallService').default;
      await IncomingCallService.endSystemCall();
    }
  } catch (_) {}

  try {
    RingtoneManager.stopAndSuppress(roomId);
  } catch (_) {}

  // Only dismiss if IncomingCall is currently showing (do not force-navigate home).
  try {
    if (navigationRef.isReady()) {
      const current = navigationRef.getCurrentRoute()?.name;
      if (current === 'incomingCall') {
        if (navigationRef.canGoBack()) {
          navigationRef.goBack();
        } else {
          navigate('home');
        }
      }
    }
  } catch (_) {}
};

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
 * so the next call always shows IncomingCall + Accept/Reject notification.
 */
export const prepareIncomingCall = callData => {
  if (!callData?.roomId) return;

  const existing = getPendingCallSync();
  const sameEndedSession =
    existing?.roomId &&
    String(existing.roomId) === String(callData.roomId) &&
    callData.callId &&
    existing.callId &&
    String(existing.callId) === String(callData.callId) &&
    (isTerminalCallStatus(existing.status) || wasCallEndedRecently(callData));

  // Only skip the exact same ended callId — never block a new ring in the room.
  if (sameEndedSession || (wasCallEndedRecently(callData) && callData.callId && wasRecentlyRejected(callData))) {
    console.log('📱 [prepareIncomingCall] skip — same call session already ended');
    return;
  }

  launchCallHandled = false;

  // New invite may ring — clear JS Accept/Reject audio suppress.
  try {
    RingtoneManager.clearIncomingSuppress();
  } catch (_) {}

  // Always clear room-level guards so Accept/Reject notif is not cancelled by AppState.
  recentlyAcceptedKeys.delete(`room:${callData.roomId}`);
  recentlyRejectedKeys.delete(`room:${callData.roomId}`);
  clearEndedCallStampForIncoming(callData);

  // Clear ended history for a *new* callId (not the same ended session).
  const isNewCallSession =
    !!callData.callId &&
    (!existing?.callId || String(existing.callId) !== String(callData.callId));
  if (isNewCallSession || !callData.callId) {
    try {
      const raw = mmkv.getString(ENDED_CALLS_KEY);
      if (raw) {
        const map = JSON.parse(raw);
        // Keep stamp for this exact callId; clear room key only when new session.
        if (isNewCallSession) {
          delete map[`room:${callData.roomId}`];
        }
        mmkv.set(ENDED_CALLS_KEY, JSON.stringify(map));
      }
    } catch (_) {}
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

/** Dedupe the same notif action within a short window (index.js + Main.js both fire). */
const recentNotifActions = new Map();
export const claimNotificationAction = (action, callData, ttlMs = 4000) => {
  const room = callData?.roomId || '';
  const call = callData?.callId || '';
  if (!room && !call) return true;
  const key = `${action}:${call || room}`;
  const now = Date.now();
  const prev = recentNotifActions.get(key);
  if (prev && now - prev < ttlMs) {
    console.log('📱 [claimNotificationAction] skip duplicate', key);
    return false;
  }
  recentNotifActions.set(key, now);
  return true;
};

const scheduleNavRetry = (tryOpen, fallback, label, maxAttempts = 100) => {
  if (tryOpen()) return true;
  console.log(`⏳ [${label}] Nav not ready, retrying...`);
  let attempts = 0;
  const interval = setInterval(() => {
    attempts += 1;
    if (tryOpen()) {
      clearInterval(interval);
      return;
    }
    if (attempts >= maxAttempts) {
      clearInterval(interval);
      console.log(`⚠️ [${label}] Retry exhausted, using navigate() fallback`);
      try {
        fallback();
      } catch (e) {
        console.warn(`[${label}] fallback failed:`, e?.message || e);
      }
    }
  }, 100);
  return true;
};

export const openActiveCallScreen = callData => {
  const normalized =
    normalizeIncomingCallPayload(callData) ||
    normalizeIncomingCallPayload(callData?.content) ||
    callData;
  if (!normalized?.roomId) {
    console.warn('[openActiveCallScreen] Missing roomId, skip');
    return false;
  }

  const callType = normalized.callType || 'audio';
  const screen = callType === 'video' ? 'videoCallScreen' : 'callScreen';
  const params = {
    roomId: String(normalized.roomId),
    name: normalized.displayName || normalized.callerName || normalized.name || 'Call',
    callType,
    callerId: normalized.senderId || normalized.callerId,
    profileImageUrl: normalized.profileImage || normalized.profileImageUrl,
    callAccepted: true,
    callId: normalized.callId,
  };

  console.log('📱 [openActiveCallScreen] →', screen, params.roomId);

  const tryOpen = () => {
    if (!navigationRef.isReady()) return false;
    try {
      const current = navigationRef.getCurrentRoute()?.name;
      if (
        (current === 'callScreen' || current === 'videoCallScreen') &&
        String(navigationRef.getCurrentRoute()?.params?.roomId || '') === String(params.roomId)
      ) {
        return true;
      }
      if (current === 'incomingCall' || current === screen) {
        navigationRef.dispatch(StackActions.replace(screen, params));
        return true;
      }
      // Use RootNavigation.navigate — waits for ready + allows call screens without token race.
      navigate(screen, params);
      return true;
    } catch (e) {
      console.warn('[openActiveCallScreen] navigate failed:', e?.message || e);
      return false;
    }
  };

  const ok = scheduleNavRetry(tryOpen, () => navigate(screen, params), 'openActiveCallScreen', 150);
  // Extra nudges for BG Accept cold start (stack may mount after token rehydrate).
  setTimeout(() => tryOpen(), 500);
  setTimeout(() => tryOpen(), 1500);
  setTimeout(() => navigate(screen, params), 2500);
  return ok;
};

/**
 * Open IncomingCall only if the call is still ringing.
 * Does NOT invalidate on API/token failure — that blocked notification taps.
 */
export const openIncomingCallScreenIfActive = async callData => {
  const data =
    normalizeIncomingCallPayload(callData) ||
    normalizeIncomingCallPayload(callData?.content) ||
    callData;
  if (!data?.roomId) return false;

  // Already accepted → active call UI, not ringing UI.
  if (wasRecentlyAccepted(data) || getPendingCallSync()?.status === 'ACCEPTED') {
    prepareIncomingCall(data);
    return openActiveCallScreen(data);
  }

  const stillActive = await isIncomingCallStillActive(data);
  if (!stillActive) {
    // Only clear chrome when we are confident the invite is dead (not flaky UNAVAILABLE/IDLE).
    const pendingStatus = String(getPendingCallSync()?.status || '').toUpperCase();
    const confidentEnded =
      wasRecentlyRejected(data) ||
      wasCallEndedRecently(data) ||
      ['REJECTED', 'ENDED', 'CANCELLED', 'CANCELED', 'MISSED', 'COMPLETED'].includes(pendingStatus);
    if (confidentEnded) {
      console.log(
        '📱 [openIncomingCallScreenIfActive] Call ended — clearing notif, not opening UI',
      );
      await invalidateIncomingCall(data, 'ENDED');
      return false;
    }
    // Token/API flaky — still open IncomingCall (polling will dismiss if dead).
    console.log(
      '📱 [openIncomingCallScreenIfActive] status unknown — opening IncomingCall optimistically',
    );
  }

  prepareIncomingCall(data);
  return openIncomingCallScreen(data);
};

/**
 * User tapped the push / CallStyle body — always open UI.
 * Never block on participant-status API (cold start token races).
 */
export const openIncomingCallFromNotificationTap = callData => {
  const data =
    normalizeIncomingCallPayload(callData) ||
    normalizeIncomingCallPayload(callData?.content) ||
    callData;
  if (!data?.roomId) {
    console.warn('[openIncomingCallFromNotificationTap] Missing roomId', callData);
    return false;
  }

  // Reset launch guard so cold-start tap can always navigate.
  try {
    resetLaunchCallHandling();
  } catch (_) {}

  const pending = getPendingCallSync();
  const sameRoom =
    pending?.roomId != null && String(pending.roomId) === String(data.roomId);

  if (
    wasRecentlyAccepted(data) ||
    (sameRoom && (pending.status === 'ACCEPTED' || pending.callAccepted))
  ) {
    console.log('📱 [notif tap] already accepted → CallScreen');
    acceptCallFromNotification(data, { navigateNow: true }).catch(() => {
      openActiveCallScreen(data);
    });
    return true;
  }

  const hardEnded =
    (data.callId && wasRecentlyRejected(data)) ||
    (data.callId && wasCallEndedRecently(data)) ||
    (sameRoom &&
      ['REJECTED', 'ENDED', 'CANCELLED', 'CANCELED', 'MISSED', 'COMPLETED'].includes(
        String(pending?.status || '').toUpperCase(),
      ));

  if (hardEnded) {
    console.log('📱 [notif tap] call already ended — skip UI');
    invalidateIncomingCall(data, pending?.status || 'ENDED').catch(() => {});
    return false;
  }

  console.log('📱 [notif tap] → IncomingCall NOW', data.roomId, data.callId);
  prepareIncomingCall(data);
  const opened = openIncomingCallScreen(data);
  // Extra delayed nudge — covers nav not ready + claim races.
  setTimeout(() => {
    try {
      if (navigationRef.isReady()) {
        const route = navigationRef.getCurrentRoute()?.name;
        if (route !== 'incomingCall' && route !== 'callScreen' && route !== 'videoCallScreen') {
          console.log('📱 [notif tap] retry open IncomingCall (screen still not visible)');
          openIncomingCallScreen(data);
        }
      }
    } catch (_) {}
  }, 800);
  setTimeout(() => {
    try {
      if (navigationRef.isReady()) {
        const route = navigationRef.getCurrentRoute()?.name;
        if (route !== 'incomingCall' && route !== 'callScreen' && route !== 'videoCallScreen') {
          console.log('📱 [notif tap] final retry open IncomingCall');
          navigate('incomingCall', {
            name: data.name || data.displayName || 'Call',
            profileImageUrl: data.profileImage || data.profileImageUrl,
            roomId: String(data.roomId),
            callType: data.callType || 'audio',
            callerId: data.callerId || data.senderId,
            callId: data.callId,
          });
        }
      }
    } catch (_) {}
  }, 2000);
  return opened;
};

export const openIncomingCallScreen = rawCallData => {
  const callData =
    normalizeIncomingCallPayload(rawCallData) ||
    normalizeIncomingCallPayload(rawCallData?.content) ||
    rawCallData;
  if (!callData?.roomId) {
    console.warn('[openIncomingCallScreen] Missing roomId, skip', rawCallData);
    return false;
  }

  // Don't open ringing UI if user already accepted this call.
  if (wasRecentlyAccepted(callData)) {
    console.log('📱 [openIncomingCallScreen] already accepted → CallScreen');
    return openActiveCallScreen(callData);
  }
  // Only skip reject for the same callId — never block next call in room.
  if (callData.callId && wasRecentlyRejected(callData)) {
    console.log('📱 [openIncomingCallScreen] already rejected — skip');
    return false;
  }

  const params = {
    name: callData?.name || callData?.displayName || callData?.callerName || 'Call',
    profileImageUrl:
      callData?.profileImageurl ||
      callData?.profileImage ||
      callData?.profile_image ||
      callData?.profileImageUrl,
    roomId: String(callData.roomId),
    callType: callData?.callType || 'audio',
    callerId: callData?.callerId || callData?.senderId,
    callId: callData?.callId,
  };

  console.log('📱 [openIncomingCallScreen] → incomingCall', params.roomId);

  const tryOpen = () => {
    if (!navigationRef.isReady()) return false;
    try {
      const current = navigationRef.getCurrentRoute()?.name;
      const currentParams = navigationRef.getCurrentRoute()?.params;
      // Already showing this call — success (avoid remount glitch).
      if (
        current === 'incomingCall' &&
        String(currentParams?.roomId || '') === String(params.roomId)
      ) {
        return true;
      }
      // If already on CallScreen for this room, don't go back to IncomingCall.
      if (
        (current === 'callScreen' || current === 'videoCallScreen') &&
        String(currentParams?.roomId || '') === String(params.roomId)
      ) {
        return true;
      }
      // navigate via RootNavigation — handles ready wait + call-screen auth bypass.
      if (current === 'incomingCall') {
        navigationRef.dispatch(StackActions.replace('incomingCall', params));
      } else {
        navigate('incomingCall', params);
      }
      console.log('📱 [openIncomingCallScreen] navigated, route=', navigationRef.getCurrentRoute()?.name);
      return true;
    } catch (e) {
      console.warn('[openIncomingCallScreen] navigate failed:', e?.message || e);
      return false;
    }
  };

  // Longer retry — cold start after notification tap often needs >10s for nav+auth.
  return scheduleNavRetry(
    tryOpen,
    () => navigate('incomingCall', params),
    'openIncomingCallScreen',
    150,
  );
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
 * BUG_10: creator killed app after dialing — Accept must NOT connect.
 * BUG_04: flaky USER_OFFLINE while creator still rings — still allow join if
 * remote looks actively ringing, or a single accept retry succeeds.
 */
const CREATOR_GONE_ACCEPT_ERRORS = /user_offline|offline|unavailable|not\s*available|creator.*gone|force_closed|disconnected|left|ended|not\s*found/i;

const isCreatorHardGoneStatus = remoteUpper => {
  if (!remoteUpper) return false;
  // DISCONNECTED is flaky while ringing — only trust clear hangup/cancel ends here.
  return (
    remoteUpper === 'FORCE_CLOSED' ||
    remoteUpper === 'REJECTED' ||
    remoteUpper === 'CANCELLED' ||
    remoteUpper === 'CANCELED' ||
    remoteUpper === 'COMPLETED' ||
    remoteUpper === 'ENDED' ||
    remoteUpper === 'MISSED' ||
    remoteUpper === 'LEAVE'
  );
};

const isCreatorActivelyRingingStatus = remoteUpper =>
  !!remoteUpper && ACTIVE_RINGING_STATUSES.has(remoteUpper);

/**
 * Accept from notification / IncomingCall Accept button.
 * - Stop ringtone/shade first (never stamp ENDED — that blocked CallScreen)
 * - Open CallScreen immediately (optimistic) so Accept feels instant
 * - Then hit accept API; only leave if creator is hard-gone
 */
export const acceptCallFromNotification = async (callData, { navigateNow = true } = {}) => {
  const data =
    normalizeIncomingCallPayload(callData) ||
    normalizeIncomingCallPayload(callData?.content) ||
    callData;
  if (!data?.roomId) {
    return { success: false, error: 'No roomId' };
  }

  const { LoginPageErrors } = require('../Components/ErrorSnacks');

  // User explicitly tapped Accept — clear stale reject/ended guards for this invite.
  clearEndedCallStampForIncoming(data);
  try {
    recentlyRejectedKeys.delete(callGuardKey(data));
    recentlyRejectedKeys.delete(`room:${data.roomId}`);
    if (data.callId) recentlyRejectedKeys.delete(`call:${data.callId}`);
  } catch (_) {}

  // Wait for auth so callScreen exists on the logged-in stack.
  try {
    await getAuthToken(40);
  } catch (_) {}

  // Stamp + open CallScreen FIRST (before stop/API) so Accept always lands on UI.
  markCallAcceptedSync(data);
  if (navigateNow) {
    openActiveCallScreen(data);
  }

  try {
    RingtoneManager.stopAndSuppress(data.roomId);
  } catch (_) {}
  try {
    const { cancelIncomingCallNotification } = require('../../Notificaton');
    await cancelIncomingCallNotification(data.roomId);
  } catch (_) {}
  try {
    const Native = require('react-native').NativeModules.IncomingCallStyle;
    if (Native?.stopAndSuppressRingtoneSync) {
      Native.stopAndSuppressRingtoneSync(String(data.roomId || ''));
    } else {
      const { stopAndroidRingtoneAndDismiss } = require('../Services/IncomingCallStyle');
      await stopAndroidRingtoneAndDismiss(data.roomId);
    }
  } catch (_) {}

  const failCreatorGone = async reason => {
    console.log('📱 [acceptCallFromNotification] Creator unavailable:', reason);
    LoginPageErrors('Creator is no longer available');
    await invalidateIncomingCall(data, reason || 'UNAVAILABLE');
    try {
      dismissIncomingCallScreen();
    } catch (_) {}
    return { success: false, error: reason || 'CREATOR_GONE' };
  };

  const key = callGuardKey(data);

  const pending = getPendingCallSync();
  if (
    pending?.roomId === data.roomId &&
    (!data.callId || !pending.callId || pending.callId === data.callId) &&
    (pending.status === 'ACCEPTED' || pending.callAccepted) &&
    pending.apiDone
  ) {
    console.log('📱 [acceptCallFromNotification] Already accepted, skipping duplicate API');
    if (navigateNow) openActiveCallScreen(data);
    return { success: true, data: { alreadyAccepted: true } };
  }

  if (key && acceptInFlightKeys.has(key)) {
    console.log('📱 [acceptCallFromNotification] Accept already in-flight');
    if (navigateNow) openActiveCallScreen(data);
    return { success: true, data: { inFlight: true } };
  }

  // Soft remote check — do not block UI; only abort after navigate if hard-gone.
  try {
    const remote = await fetchOtherParticipantStatus(data.roomId);
    const remoteUpper = remote ? String(remote).toUpperCase() : null;
    if (isCreatorHardGoneStatus(remoteUpper)) {
      return failCreatorGone(remoteUpper);
    }
  } catch (_) {}

  if (key) acceptInFlightKeys.add(key);
  let result;
  try {
    result = await callAcceptAPI(data.roomId, data.callType, 'ACCEPTED');
  } finally {
    if (key) acceptInFlightKeys.delete(key);
  }

  if (result.success) {
    persistPendingCallSync(data, { accepted: true, apiDone: true });
    if (navigateNow) openActiveCallScreen(data);
    setTimeout(() => {
      clearPendingCall().catch(() => {});
    }, 2500);
    return result;
  }

  // Accept failed — distinguish BUG_10 (creator killed) vs BUG_04 (flaky presence).
  const errText = String(result.error || result.data?.message || '');
  let remote2 = null;
  try {
    await new Promise(r => setTimeout(r, 700));
    remote2 = await fetchOtherParticipantStatus(data.roomId);
  } catch (_) {}
  const remote2Upper = remote2 ? String(remote2).toUpperCase() : null;

  if (isCreatorHardGoneStatus(remote2Upper)) {
    return failCreatorGone(remote2Upper);
  }

  if (isCreatorActivelyRingingStatus(remote2Upper)) {
    console.log(
      '⚠️ [acceptCallFromNotification] API failed but creator still ringing — soft-join',
      result.error,
      remote2Upper,
    );
    persistPendingCallSync(data, { accepted: true, apiDone: false });
    if (navigateNow) openActiveCallScreen(data);
    return { success: true, data: { deferred: true, error: result.error } };
  }

  let retry = { success: false };
  if (CREATOR_GONE_ACCEPT_ERRORS.test(errText) || !result.success) {
    try {
      await new Promise(r => setTimeout(r, 900));
      retry = await callAcceptAPI(data.roomId, data.callType, 'ACCEPTED');
    } catch (_) {}
  }

  if (retry.success) {
    console.log('✅ [acceptCallFromNotification] Retry accept succeeded');
    persistPendingCallSync(data, { accepted: true, apiDone: true });
    if (navigateNow) openActiveCallScreen(data);
    setTimeout(() => {
      clearPendingCall().catch(() => {});
    }, 2500);
    return retry;
  }

  let remote3 = null;
  try {
    remote3 = await fetchOtherParticipantStatus(data.roomId);
  } catch (_) {}
  const remote3Upper = remote3 ? String(remote3).toUpperCase() : null;
  if (isCreatorActivelyRingingStatus(remote3Upper)) {
    console.log(
      '⚠️ [acceptCallFromNotification] Retry failed but remote ringing — soft-join',
      remote3Upper,
    );
    persistPendingCallSync(data, { accepted: true, apiDone: false });
    if (navigateNow) openActiveCallScreen(data);
    return { success: true, data: { deferred: true, error: result.error } };
  }

  return failCreatorGone(remote3Upper || remote2Upper || 'UNAVAILABLE');
};

/**
 * Decline from notification action: MUST hit reject API so caller side cuts.
 * Do not skip API just because markCallRejectedSync already ran (that only stamps intent).
 */
export const declineCallFromNotification = async (callData, { dismissUi = true } = {}) => {
  if (!callData?.roomId) {
    return { success: false, error: 'No roomId' };
  }

  // Silence JS + native immediately (before API).
  try {
    RingtoneManager.stopAndSuppress(callData.roomId);
  } catch (_) {}
  try {
    const { cancelIncomingCallNotification } = require('../../Notificaton');
    await cancelIncomingCallNotification(callData.roomId);
  } catch (_) {}

  const key = callGuardKey(callData);

  // Only skip when REJECT API already succeeded for this call session.
  if (key && rejectedApiDoneKeys.has(key)) {
    console.log('📱 [declineCallFromNotification] Reject API already done, skipping');
    markIncomingCallEndedSync(callData, 'REJECTED');
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
    markIncomingCallEndedSync(callData, 'REJECTED');
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
    // Keep ENDED stamp (do not clear) so a later body-tap cannot reopen IncomingCall.
    markIncomingCallEndedSync(callData, 'REJECTED');
    console.log('✅ [declineCallFromNotification] Call rejected — caller should cut');
  } else {
    // Keep REJECTED pending without apiDone so cold-start/bootstrap can retry.
    persistPendingCallSync(callData, { rejected: true, apiDone: false });
    console.log('❌ [declineCallFromNotification] Reject API failed, pending kept for retry:', result.error);
  }

  try {
    if (callData.roomId) {
      await notifee.cancelNotification('incoming_call_' + callData.roomId);
    }
  } catch (_) {}

  try {
    if (callData.roomId) {
      const { cancelAndroidCallStyleNotification } = require('../Services/IncomingCallStyle');
      await cancelAndroidCallStyleNotification(callData.roomId);
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
