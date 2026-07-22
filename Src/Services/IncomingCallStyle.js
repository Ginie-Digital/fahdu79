import { NativeModules, NativeEventEmitter, Platform, AppRegistry, AppState } from 'react-native';
import {
  acceptCallFromNotification,
  declineCallFromNotification,
  markCallRejectedSync,
  wasRecentlyRejected,
  wasRecentlyAccepted,
  invalidateIncomingCall,
  claimNotificationAction,
} from '../Utils/callAcceptFlow';

const Native = NativeModules.IncomingCallStyle;
const emitter =
  Platform.OS === 'android' && Native ? new NativeEventEmitter(Native) : null;

let wired = false;
let appStateSub = null;

const toCallData = payload => ({
  roomId: payload?.roomId || payload?.room_id,
  callId: payload?.callId || payload?.call_id,
  callType: payload?.callType || payload?.call_type || 'audio',
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

/** Persist JWT for native CallStyle Decline/Answer when JS is paused/killed. */
export function cacheAndroidCallAuthToken(token) {
  if (Platform.OS !== 'android' || !token || !Native) return;
  try {
    if (Native.cacheAuthTokenSync) {
      Native.cacheAuthTokenSync(String(token));
      return;
    }
    Native.cacheAuthToken?.(String(token));
  } catch (_) {}
}

/**
 * WhatsApp-style CallStyle (circular Decline / Answer).
 * EVERY incoming call must show this — including 2nd/3rd call after Reject.
 */
export async function displayAndroidCallStyleNotification(callDetails, options = {}) {
  if (Platform.OS !== 'android' || !Native?.displayIncomingCall) return false;
  try {
    const {
      clearEndedCallStampForIncoming,
      prepareIncomingCall,
      getAuthToken,
    } = require('../Utils/callAcceptFlow');

    // Unlock previous Accept/Reject locks for this chat so next call always rings.
    clearEndedCallStampForIncoming(callDetails);
    prepareIncomingCall(callDetails);

    try {
      const RingtoneManager = require('../Components/Calling/RingtoneManager').default;
      RingtoneManager.clearIncomingSuppress();
    } catch (_) {}

    // Bake JWT into CallStyle PendingIntent so Decline/Answer work without JS.
    let authToken = '';
    try {
      authToken = (await getAuthToken(5)) || '';
      if (authToken) cacheAndroidCallAuthToken(authToken);
    } catch (_) {}

    await Native.displayIncomingCall({
      roomId: String(callDetails.roomId || ''),
      callId: String(callDetails.callId || ''),
      callType: String(callDetails.callType || 'audio'),
      displayName: String(
        callDetails.displayName || callDetails.name || callDetails.callerName || 'Incoming Call',
      ),
      senderId: String(callDetails.senderId || callDetails.callerId || ''),
      profileImage: String(callDetails.profileImage || callDetails.profileImageUrl || ''),
      authToken: String(authToken || ''),
      force: true,
      playRingtone: options.playRingtone !== false,
    });
    console.log(
      '✅ [IncomingCallStyle] CallStyle posted (every call)',
      callDetails.roomId,
      callDetails.callId,
      callDetails.callType || 'audio',
    );
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

export function setAndroidInAppIncomingUi(active) {
  if (Platform.OS !== 'android' || !Native?.setInAppIncomingUi) return;
  try {
    Native.setInAppIncomingUi(!!active);
  } catch (_) {}
}

export async function stopAndroidRingtoneAndDismiss(roomId) {
  if (Platform.OS !== 'android' || !roomId) return;
  try {
    if (Native?.stopRingtoneAndDismissJs) {
      await Native.stopRingtoneAndDismissJs(String(roomId));
      return;
    }
    await Native?.stopRingtoneJs?.();
    await dismissAndroidCallStyleShade(roomId);
  } catch (_) {}
}

export async function dismissAndroidCallStyleShade(roomId) {
  if (Platform.OS !== 'android' || !roomId) return;
  try {
    if (Native?.dismissShadeOnlyJs) {
      await Native.dismissShadeOnlyJs(String(roomId));
      return;
    }
    await Native?.cancelIncomingCall?.(String(roomId));
  } catch (_) {}
}

async function handleStyleAction(payload) {
  const action = payload?.action || payload?.callAction;
  const callData = toCallData(payload);
  console.log('📱 [IncomingCallStyle] handleStyleAction', action, callData.roomId);

  if (!callData.roomId) {
    console.warn('📱 [IncomingCallStyle] missing roomId — skip', payload);
    return;
  }

  // Dedup — but Accept/Decline must NOT soft-fail if a prior claim raced headless.
  // Body taps still dedupe; Accept/Decline always try to complete the action.
  const claimKey =
    action === 'open_incoming_call' || action === 'default' ? 'body_tap' : action || 'style';
  const isAcceptOrDecline = action === 'accept_call' || action === 'decline_call';
  if (!isAcceptOrDecline && !claimNotificationAction(claimKey, callData)) return;
  if (isAcceptOrDecline) {
    // Soft claim for logging only — never return early on Accept/Decline.
    claimNotificationAction(claimKey, callData);
  }

  if (action === 'decline_call') {
    console.log('📱 [IncomingCallStyle] Decline — reject without requiring UI');
    markCallRejectedSync(callData);
    // dismissUi true closes IncomingCall if open; native already dismissed shade + API.
    await declineCallFromNotification(callData, { dismissUi: true });
    return;
  }

  if (action === 'accept_call') {
    console.log('📱 [IncomingCallStyle] Accept — open CallScreen immediately');
    try {
      const RingtoneManager = require('../Components/Calling/RingtoneManager').default;
      RingtoneManager.stopAndSuppress(callData.roomId);
    } catch (_) {}
    try {
      await stopAndroidRingtoneAndDismiss(callData.roomId);
    } catch (_) {}
    // Always navigate to CallScreen on Answer button (FG + BG + kill).
    await acceptCallFromNotification(callData, { navigateNow: true });
    return;
  }

  // Notification body tap → IncomingCall screen.
  if (action === 'open_incoming_call' || action === 'default' || !action) {
    console.log('📱 [IncomingCallStyle] Body tap — open IncomingCall screen');
    if (callData.callId && wasRecentlyRejected(callData)) {
      return;
    }
    if (wasRecentlyAccepted(callData)) {
      await acceptCallFromNotification(callData, { navigateNow: true });
      return;
    }
    const { openIncomingCallFromNotificationTap } = require('../Utils/callAcceptFlow');
    openIncomingCallFromNotificationTap(callData);
  }
}

/** Drain native pending Accept/body-tap saved when React was not ready. */
export async function consumePendingCallStyleAction() {
  if (Platform.OS !== 'android' || !Native?.consumePendingAction) return false;
  try {
    const pending = await Native.consumePendingAction();
    if (!pending?.action && !pending?.callAction) return false;
    console.log('📱 [IncomingCallStyle] Consumed pending action', pending?.action || pending?.callAction);
    await handleStyleAction(pending);
    return true;
  } catch (e) {
    console.warn('[IncomingCallStyle] consumePending failed:', e?.message || e);
    return false;
  }
}

/** Listen for live Accept/Reject/Open events from native CallStyle. */
export function wireIncomingCallStyleEvents() {
  if (Platform.OS !== 'android' || !emitter) return () => {};

  // Cold start + every resume: consume pending body/accept tap.
  consumePendingCallStyleAction().catch(() => {});

  if (!appStateSub) {
    appStateSub = AppState.addEventListener('change', next => {
      if (next === 'active') {
        // User may have tapped CallStyle while JS/React was paused — pending is saved.
        setTimeout(() => {
          consumePendingCallStyleAction().catch(() => {});
        }, 300);
      }
    });
  }

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
