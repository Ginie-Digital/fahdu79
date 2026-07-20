import { NativeModules, NativeEventEmitter, Platform, AppRegistry } from 'react-native';
import {
  acceptCallFromNotification,
  declineCallFromNotification,
  markCallAcceptedSync,
  markCallRejectedSync,
  openIncomingCallScreenIfActive,
  wasRecentlyRejected,
  fetchOtherParticipantStatus,
  invalidateIncomingCall,
} from '../Utils/callAcceptFlow';

const Native = NativeModules.IncomingCallStyle;
const emitter =
  Platform.OS === 'android' && Native ? new NativeEventEmitter(Native) : null;

let wired = false;

const toCallData = payload => ({
  roomId: payload?.roomId,
  callId: payload?.callId,
  callType: payload?.callType || 'audio',
  displayName: payload?.displayName || payload?.name || 'Call',
  name: payload?.displayName || payload?.name || 'Call',
  senderId: payload?.senderId || payload?.callerId,
  callerId: payload?.senderId || payload?.callerId,
  profileImage: payload?.profileImage || payload?.profileImageUrl,
  profileImageUrl: payload?.profileImage || payload?.profileImageUrl,
  type: 'incoming_call',
});

export async function isAndroidCallStyleSupported() {
  if (Platform.OS !== 'android' || !Native?.isCallStyleSupported) return false;
  try {
    return !!(await Native.isCallStyleSupported());
  } catch (_) {
    return false;
  }
}

/**
 * WhatsApp-style CallStyle heads-up (circular Accept / Reject) on Android 12+.
 * Returns true if native notification was shown.
 */
export async function displayAndroidCallStyleNotification(callDetails) {
  if (Platform.OS !== 'android' || !Native?.displayIncomingCall) return false;
  try {
    await Native.displayIncomingCall({
      roomId: String(callDetails.roomId || ''),
      callId: String(callDetails.callId || ''),
      callType: String(callDetails.callType || 'audio'),
      displayName: String(
        callDetails.displayName || callDetails.name || callDetails.callerName || 'Incoming Call',
      ),
      senderId: String(callDetails.senderId || callDetails.callerId || ''),
      profileImage: String(callDetails.profileImage || callDetails.profileImageUrl || ''),
    });
    return true;
  } catch (e) {
    console.warn('[IncomingCallStyle] display failed, will use Notifee fallback:', e?.message || e);
    return false;
  }
}

export async function cancelAndroidCallStyleNotification(roomId) {
  if (Platform.OS !== 'android' || !Native?.cancelIncomingCall || !roomId) return;
  try {
    await Native.cancelIncomingCall(String(roomId));
  } catch (_) {}
}

/** Cancel CallStyle shade without stamping the call as ended. */
export async function dismissAndroidCallStyleShade(roomId) {
  if (Platform.OS !== 'android' || !roomId) return;
  try {
    if (Native?.dismissShadeOnlyJs) {
      await Native.dismissShadeOnlyJs(String(roomId));
      return;
    }
    // Fallback: cancelIncomingCall also marks ended — prefer dismiss when available.
    await Native?.cancelIncomingCall?.(String(roomId));
  } catch (_) {}
}

async function handleStyleAction(payload) {
  const action = payload?.action;
  const callData = toCallData(payload);
  if (!callData.roomId) return;

  if (action === 'decline_call') {
    console.log('📱 [IncomingCallStyle] Decline — reject without requiring UI');
    markCallRejectedSync(callData);
    await declineCallFromNotification(callData, { dismissUi: false });
    await cancelAndroidCallStyleNotification(callData.roomId);
    return;
  }

  if (action === 'accept_call') {
    console.log('📱 [IncomingCallStyle] Accept — join unless hard-ended');
    if (wasRecentlyRejected(callData)) {
      await invalidateIncomingCall(callData, 'ENDED');
      await cancelAndroidCallStyleNotification(callData.roomId);
      return;
    }
    // Soft remote check: never block on UNAVAILABLE / IDLE / DISCONNECTED.
    const HARD_END = new Set([
      'REJECTED',
      'CANCELLED',
      'CANCELED',
      'COMPLETED',
      'ENDED',
      'MISSED',
      'FORCE_CLOSED',
      'LEAVE',
    ]);
    try {
      const remote = await fetchOtherParticipantStatus(callData.roomId);
      const remoteUpper = remote ? String(remote).toUpperCase() : null;
      if (remoteUpper && HARD_END.has(remoteUpper)) {
        await invalidateIncomingCall(callData, remoteUpper);
        await cancelAndroidCallStyleNotification(callData.roomId);
        return;
      }
    } catch (_) {}
    // Do not block on wasCallEndedRecently alone — room TTL false-positives broke Accept.
    markCallAcceptedSync(callData);
    await acceptCallFromNotification(callData, { navigateNow: true });
    await cancelAndroidCallStyleNotification(callData.roomId);
    return;
  }

  if (action === 'default') {
    // Do NOT prepareIncomingCall first — that was resetting ENDED → PENDING and
    // reopening IncomingCall after the creator already cancelled.
    console.log('📱 [IncomingCallStyle] Body / full-screen tap — open only if still active');
    const opened = await openIncomingCallScreenIfActive(callData);
    if (!opened) {
      await cancelAndroidCallStyleNotification(callData.roomId);
    }
  }
}

/** Listen for live Accept/Reject/Open events from native CallStyle. */
export function wireIncomingCallStyleEvents() {
  if (Platform.OS !== 'android' || !emitter) return () => {};

  // Always try to consume a pending kill-mode action (Accept/Decline/body tap).
  Native?.consumePendingAction?.()
    .then(pending => {
      if (pending?.action) {
        return handleStyleAction(pending);
      }
    })
    .catch(() => {});

  if (wired) return () => {};
  wired = true;

  const sub = emitter.addListener('IncomingCallStyleAction', payload => {
    handleStyleAction(payload).catch(e =>
      console.warn('[IncomingCallStyle] action handler failed:', e?.message || e),
    );
  });

  return () => {
    sub.remove();
    wired = false;
  };
}

/**
 * Headless task entry — Decline/Accept when app is killed.
 * Registered from index.js via AppRegistry.registerHeadlessTask.
 */
export async function incomingCallStyleHeadlessTask(data) {
  console.log('📱 [IncomingCallStyle] Headless task', data);
  await handleStyleAction(data);
}

export function registerIncomingCallStyleHeadlessTask() {
  if (Platform.OS !== 'android') return;
  try {
    AppRegistry.registerHeadlessTask('IncomingCallStyleTask', () => incomingCallStyleHeadlessTask);
  } catch (e) {
    console.warn('[IncomingCallStyle] registerHeadlessTask failed:', e?.message || e);
  }
}
