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

/**
 * WhatsApp-style CallStyle heads-up (circular Accept / Reject) on Android 12+.
 * Returns true if native notification was shown.
 */
export async function displayAndroidCallStyleNotification(callDetails, options = {}) {
  if (Platform.OS !== 'android' || !Native?.displayIncomingCall) return false;
  try {
    const {
      wasRecentlyAccepted,
      wasRecentlyRejected,
      wasCallEndedRecently,
    } = require('../Utils/callAcceptFlow');
    if (
      wasRecentlyAccepted(callDetails) ||
      wasRecentlyRejected(callDetails) ||
      wasCallEndedRecently(callDetails)
    ) {
      console.log('📱 [IncomingCallStyle] skip display — call already accepted/ended');
      return false;
    }
    await Native.displayIncomingCall({
      roomId: String(callDetails.roomId || ''),
      callId: String(callDetails.callId || ''),
      callType: String(callDetails.callType || 'audio'),
      displayName: String(
        callDetails.displayName || callDetails.name || callDetails.callerName || 'Incoming Call',
      ),
      senderId: String(callDetails.senderId || callDetails.callerId || ''),
      profileImage: String(callDetails.profileImage || callDetails.profileImageUrl || ''),
      force: options.force !== false,
      playRingtone: options.playRingtone !== false,
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

  // Dedup — but body taps use a shared key so Notifee+native don't double-open.
  const claimKey =
    action === 'open_incoming_call' || action === 'default' ? 'body_tap' : action || 'style';
  if (!claimNotificationAction(claimKey, callData)) return;

  if (action === 'decline_call') {
    console.log('📱 [IncomingCallStyle] Decline — reject without requiring UI');
    markCallRejectedSync(callData);
    await declineCallFromNotification(callData, { dismissUi: true });
    return;
  }

  if (action === 'accept_call') {
    console.log('📱 [IncomingCallStyle] Accept — open CallScreen immediately');
    // Do NOT claim-block a second time — open UI even if headless already stamped.
    try {
      const RingtoneManager = require('../Components/Calling/RingtoneManager').default;
      RingtoneManager.stopAndSuppress(callData.roomId);
    } catch (_) {}
    try {
      await stopAndroidRingtoneAndDismiss(callData.roomId);
    } catch (_) {}
    // Always navigate to CallScreen on Accept button.
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
