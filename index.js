import './ReactotronConfig';
import { startNetworkLogging } from 'react-native-network-logger';
startNetworkLogging();

import 'react-native-gesture-handler';
import { DevLauncher, DevMenu } from 'expo-dev-client';
// import 'react-native-url-polyfill/auto';
import { AppRegistry, Linking, Platform, AppState, Alert, ToastAndroid, NativeModules } from 'react-native';
console.log('DEBUG: NativeModules keys:', Object.keys(NativeModules));
console.log('DEBUG: FFmpegKitReactNativeModule exists:', !!NativeModules.FFmpegKitReactNativeModule);
import App from './App';
import { name as appName } from './app.json';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import { liveStreamNotification, onDisplayNotification, showCallReminderNotification, showCallRequestNotification, showOthersCategoryNotification, showPostInteractionNotification, showSubscriptionNotification, showIncomingCallNotification, cancelIncomingCallNotification, ensureIncomingCallNotificationCategory } from './Notificaton';
import IncomingCallService from './Src/Services/IncomingCallService';

import notifee, { EventType } from '@notifee/react-native';
import store from './Redux/Store';
import { updateCacheRoomList } from './Redux/Slices/NormalSlices/RoomListSlice';
import { pushUnReadRoomIds } from './Redux/Slices/NormalSlices/UnReadThreadSlice';
import { setClickedNotification, setUnReadChatIcon } from './Redux/Slices/NormalSlices/HideShowSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigate, navigationRef } from './Navigation/RootNavigation';

// Removed VoipPushNotification and polyfill to debug prototype error
import { updateApnToken } from './Redux/Slices/NormalSlices/AuthSlice';
import { setCallRejected } from './Redux/Slices/NormalSlices/Call/CallSlice';
import { AppLog } from './Src/Utils/Logger';
import {
  acceptCallFromNotification,
  declineCallFromNotification,
  markCallAcceptedSync,
  markCallRejectedSync,
  getPendingCallSync,
  prepareIncomingCall,
  clearPendingCall,
  openIncomingCallScreenIfActive,
  isIncomingCallStillActive,
  wasRecentlyAccepted,
  wasRecentlyRejected,
  claimNotificationAction,
  wasCallEndedRecently,
  invalidateIncomingCall,
  isTerminalCallStatus,
} from './Src/Utils/callAcceptFlow';
import {
  registerIncomingCallStyleHeadlessTask,
  wireIncomingCallStyleEvents,
} from './Src/Services/IncomingCallStyle';

// iOS: register Accept/Decline category as early as possible (before any call notification).
if (Platform.OS === 'ios') {
  ensureIncomingCallNotificationCategory().catch(() => {});
}

// Android: WhatsApp-style CallStyle Accept/Reject (kill / background headless + live events).
if (Platform.OS === 'android') {
  registerIncomingCallStyleHeadlessTask();
  wireIncomingCallStyleEvents();
}

let tempRemoteNotificationData = undefined;
let tempCallData = Object.assign({});
let callCutFromCaller = false;
let isProcessingAndroidCall = false;

setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
  if (remoteMessage?.data?.payload) {
    let remoteNotificationData = JSON.parse(remoteMessage.data.payload);
    console.log('EXX', remoteMessage, remoteNotificationData?.type, remoteNotificationData);

    // If the message has a notification key, the OS already displayed it natively.
    // Skip creating a duplicate Notifee notification. Navigation on tap is handled
    // by Firebase onNotificationOpenedApp / getInitialNotification in Main.js.
    const osAlreadyDisplayed = !!remoteMessage?.notification;
    if (osAlreadyDisplayed) {
      console.log('📌 [index:FCM] OS already displayed notification via notification key, skipping Notifee display');
    }

    if (remoteNotificationData?.type === 'message') {
      tempRemoteNotificationData = remoteNotificationData;
      if (!osAlreadyDisplayed) {
        await onDisplayNotification(remoteNotificationData?.content);
      }
    } else if (remoteNotificationData?.type === 'livestream') {
      if (!osAlreadyDisplayed) {
        await liveStreamNotification(remoteNotificationData?.content);
      }
    } else if (remoteNotificationData?.type === 'others') {
      if (!osAlreadyDisplayed) {
        await showOthersCategoryNotification(remoteNotificationData);
      }
    } else if (remoteNotificationData?.type === 'subscription') {
      if (!osAlreadyDisplayed) {
        await showSubscriptionNotification(remoteNotificationData);
      }
    } else if (
      remoteNotificationData?.type === 'call' ||
      remoteNotificationData?.type === 'incoming_call'
    ) {
      if (isProcessingAndroidCall && Platform.OS === 'android') {
        console.log('⚠️ [index:FCM:Background] Already processing Android call, skipping duplicate');
        return;
      }

      if (Platform.OS === 'android') {
        isProcessingAndroidCall = true;
      }

      try {
        // content may be object OR JSON string — showIncomingCallNotification normalizes.
        const callDetails = remoteNotificationData?.content || remoteNotificationData;
        console.log(
          '📱 [index:FCM:Background] Incoming call',
          remoteNotificationData?.type,
          callDetails?.roomId || callDetails?.room_id,
          callDetails?.callId,
        );

        // Always show ONE Accept/Reject UI (Android CallStyle / iOS Notifee+CallKit).
        // Do not stack Notifee + CallStyle — that produced duplicate call shades.
        if (Platform.OS === 'ios') {
          await ensureIncomingCallNotificationCategory();
          try {
            await IncomingCallService.showIncomingCall(remoteNotificationData, { showNotifee: true });
          } catch (e) {
            console.warn('📱 [index:FCM:Background] iOS IncomingCallService failed, Notifee only:', e?.message || e);
            await showIncomingCallNotification(callDetails);
          }
        } else {
          const shown = await showIncomingCallNotification(callDetails, {
            force: true,
            playRingtone: true,
          });
          console.log('📱 [index:FCM:Background] single call notif shown=', shown);
        }

        // Persist PENDING after UI so Accept/Reject never waits on storage.
        // Always prepare — clears stale REJECTED/ENDED so tap/open is not blocked.
        prepareIncomingCall({
          roomId: callDetails?.roomId || callDetails?.room_id,
          callerName: callDetails?.displayName || callDetails?.name,
          displayName: callDetails?.displayName || callDetails?.name,
          callType: callDetails?.callType || 'audio',
          senderId: callDetails?.senderId || callDetails?.callerId,
          profileImage:
            callDetails?.profileImage ||
            callDetails?.profileImageUrl ||
            callDetails?.profile_image,
          callId: callDetails?.callId,
        });

        // Minimized process: also open IncomingCall when navigation can run.
        if (Platform.OS === 'android') {
          try {
            const { openIncomingCallScreen } = require('./Src/Utils/callAcceptFlow');
            openIncomingCallScreen({
              roomId: callDetails?.roomId || callDetails?.room_id,
              callId: callDetails?.callId,
              callType: callDetails?.callType || 'audio',
              displayName: callDetails?.displayName || callDetails?.name,
              name: callDetails?.displayName || callDetails?.name,
              senderId: callDetails?.senderId || callDetails?.callerId,
              callerId: callDetails?.senderId || callDetails?.callerId,
              profileImage:
                callDetails?.profileImage ||
                callDetails?.profileImageUrl ||
                callDetails?.profile_image,
              profileImageUrl:
                callDetails?.profileImageUrl ||
                callDetails?.profileImage ||
                callDetails?.profile_image,
            });
          } catch (e) {
            console.warn('📱 [index:FCM:Background] openIncomingCallScreen failed:', e?.message || e);
          }
        }
      } finally {
        if (Platform.OS === 'android') {
          isProcessingAndroidCall = false;
        }
      }
    } else if (
      remoteNotificationData?.type === 'call_rejected' ||
      remoteNotificationData?.type === 'call_unavailable' ||
      remoteNotificationData?.type === 'call_cancelled' ||
      remoteNotificationData?.type === 'call_canceled'
    ) {
      // Creator ended / cancelled / unavailable — both platforms must clear pending + notif
      // so a later notification tap does not open a dead IncomingCall screen.
      if (Platform.OS === 'android') {
        callCutFromCaller = true;
        isProcessingAndroidCall = false;
      }
      AppLog('FCM_CALL_BG', `Received ${remoteNotificationData?.type} background notification`, remoteNotificationData);
      const endedContent = remoteNotificationData?.content || remoteNotificationData;
      const roomId = endedContent?.roomId || remoteNotificationData?.roomId;
      // invalidate also dismisses iOS CallKit + Android CallStyle.
      await invalidateIncomingCall(
        { roomId, callId: endedContent?.callId, callType: endedContent?.callType },
        remoteNotificationData?.type === 'call_unavailable' ? 'UNAVAILABLE' : 'REJECTED',
      );
    } else if (remoteNotificationData?.type === 'call_accepted') {
      console.log('Call Accepted Background Event');
      AppLog('FCM_CALL_BG', 'Received call_accepted background notification', remoteNotificationData);
    } else if (remoteNotificationData?.type === 'initiator_accepted') {
      // Alert removed
      AppLog('FCM_CALL_BG', 'Received initiator_accepted background notification (Silent)', remoteNotificationData);
    } else if (remoteNotificationData?.type === 'call_completed' || remoteNotificationData?.type === 'call_disconnected' || remoteNotificationData?.type === 'fcm_disconnect_close_app') {
      console.log('Call Completed/Disconnected Background Event:', remoteNotificationData);
      const roomId = remoteNotificationData?.content?.roomId || remoteNotificationData?.roomId;
      // BUG_10: creator kill → FORCE_CLOSED so Accept shows creator unavailable.
      const reason =
        remoteNotificationData?.type === 'fcm_disconnect_close_app'
          ? 'FORCE_CLOSED'
          : remoteNotificationData?.type === 'call_disconnected'
            ? 'DISCONNECTED'
            : 'ENDED';
      await invalidateIncomingCall(
        { roomId, callId: remoteNotificationData?.content?.callId },
        reason,
      );
    } else if (remoteNotificationData?.type === 'missed_call') {
      console.log(remoteNotificationData, ':::::');
      const roomId = remoteNotificationData?.content?.roomId || remoteNotificationData?.roomId;
      await invalidateIncomingCall(
        { roomId, callId: remoteNotificationData?.content?.callId },
        'MISSED',
      );
    } else if (remoteNotificationData?.type === '10_reminder' || remoteNotificationData?.type === '5_reminder' || remoteNotificationData?.type === '1_reminder') {
      if (!osAlreadyDisplayed) {
        await showCallReminderNotification(remoteNotificationData);
      }
    } else {
      if (!osAlreadyDisplayed) {
        await showPostInteractionNotification(remoteNotificationData);
      }
    }
  }
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (tempRemoteNotificationData) {
    const myReduxState = store.getState();
    if (myReduxState?._persist?.rehydrated && tempRemoteNotificationData) {
      store.dispatch(
        updateCacheRoomList({
          chatRoomId: tempRemoteNotificationData?.content?.roomId,
          createdAt: tempRemoteNotificationData?.content?.createdAt,
          message: tempRemoteNotificationData?.content?.hasAttachment ? '' : tempRemoteNotificationData?.content?.message,
          hasAttachment: tempRemoteNotificationData?.content?.hasAttachment,
          senderId: tempRemoteNotificationData?.content?.sender_id,
          profileImage: tempRemoteNotificationData?.content?.profile_image,
          userName: tempRemoteNotificationData?.content?.username,
          role: tempRemoteNotificationData?.content?.sender_role,
          unreadCount: tempRemoteNotificationData?.content?.unreadCount,
          updatedAt: tempRemoteNotificationData?.content?.createdAt,
          user_type: tempRemoteNotificationData?.content?.user_type,
        }),
      );
      store.dispatch(pushUnReadRoomIds({ chatRoomId: tempRemoteNotificationData?.content?.roomId }));

      store.dispatch(setUnReadChatIcon({ show: true }));
    }
  }

  if (type === EventType.ACTION_PRESS) {
    const pressActionId = detail?.pressAction?.id;
    const callData = detail?.notification?.data;
    const notificationId = detail?.notification?.id;
    console.log(`📌 [index:onBackgroundEvent] ACTION_PRESS - actionId: ${pressActionId}`, callData);

    if (pressActionId === 'accept_call' && callData?.roomId) {
      if (!claimNotificationAction('accept_call', callData)) return;
      // Sync stamp FIRST — Android may launch Main before this async work finishes.
      markCallAcceptedSync(callData);
      console.log('📱 [index:onBackgroundEvent] ACCEPT — joining call');
      try {
        await acceptCallFromNotification(callData, { navigateNow: true });
      } catch (e) {
        console.log('❌ [index:onBackgroundEvent] Accept failed:', e?.message || e);
      }
      if (notificationId) await notifee.cancelNotification(notificationId);
      try {
        await notifee.cancelNotification('incoming_call_' + callData.roomId);
      } catch (_) {}
      try {
        // Do NOT cancelFromContext/ENDED — Accept already joined CallScreen.
        const { stopAndroidRingtoneAndDismiss } = require('./Src/Services/IncomingCallStyle');
        await stopAndroidRingtoneAndDismiss(callData.roomId);
      } catch (_) {}
    } else if (pressActionId === 'decline_call' && callData?.roomId) {
      if (!claimNotificationAction('decline_call', callData)) return;
      // No launchActivity on Reject — stay in background, decline API only (Android + iOS).
      markCallRejectedSync(callData);
      console.log('📱 [index:onBackgroundEvent] REJECT — declining without opening app');
      try {
        if (Platform.OS === 'ios') {
          try {
            await IncomingCallService.dismissCallKit();
          } catch (_) {}
        }
        await declineCallFromNotification(callData, { dismissUi: false });
      } catch (e) {
        console.log('❌ [index:onBackgroundEvent] Decline failed:', e?.message || e);
      }
      if (notificationId) await notifee.cancelNotification(notificationId);
      try {
        await notifee.cancelNotification('incoming_call_' + callData.roomId);
      } catch (_) {}
      try {
        const { cancelAndroidCallStyleNotification } = require('./Src/Services/IncomingCallStyle');
        await cancelAndroidCallStyleNotification(callData.roomId);
      } catch (_) {}
    }
  }

  if (type === EventType.PRESS) {
    const link = detail?.notification?.data?.link;
    const notifType = detail?.notification?.data?.type;
    const callData = detail?.notification?.data;
    console.log(`📌 [index:onBackgroundEvent] PRESS - type: ${notifType}, link: ${link}`);

    // Notification body tap → open IncomingCall (or CallScreen if already accepted).
    if ((notifType === 'incoming_call' || notifType === 'call') && callData?.roomId) {
      if (!claimNotificationAction('body_tap', callData)) return;
      const pendingStatus = getPendingCallSync()?.status;
      const pendingHardEnded =
        pendingStatus &&
        ['REJECTED', 'ENDED', 'CANCELLED', 'CANCELED', 'MISSED', 'COMPLETED'].includes(
          String(pendingStatus).toUpperCase(),
        );
      if (wasRecentlyRejected(callData) || wasCallEndedRecently(callData) || pendingHardEnded) {
        await invalidateIncomingCall(callData, 'ENDED');
        return;
      }
      if (wasRecentlyAccepted(callData) || pendingStatus === 'ACCEPTED') {
        console.log('📱 [index:onBackgroundEvent] Body tap — already accepted → CallScreen');
        try {
          await acceptCallFromNotification(callData, { navigateNow: true });
        } catch (e) {
          console.log('❌ [index:onBackgroundEvent] Body tap accept failed:', e?.message || e);
        }
        return;
      }
      console.log('📱 [index:onBackgroundEvent] Body tap — open IncomingCall screen');
      const { openIncomingCallFromNotificationTap } = require('./Src/Utils/callAcceptFlow');
      openIncomingCallFromNotificationTap(callData);
      return;
    }

    if (link && link.length > 0) {
      await Linking.openURL(link);
    }
  }
});

notifee.onForegroundEvent(async ({ type, detail }) => {
  const notifData = detail?.notification?.data;
  const notifType = notifData?.type;

  // Body tap on call notification (iOS + Android, killed/background → open).
  if (type === EventType.PRESS && (notifType === 'incoming_call' || notifType === 'call')) {
    console.log('📌 [index:onForegroundEvent] call notification body tap', notifData);
    if (!claimNotificationAction('body_tap', notifData)) return;
    const pendingStatus = getPendingCallSync()?.status;
    const pendingHardEnded =
      pendingStatus &&
      ['REJECTED', 'ENDED', 'CANCELLED', 'CANCELED', 'MISSED', 'COMPLETED'].includes(
        String(pendingStatus).toUpperCase(),
      );
    if (wasRecentlyRejected(notifData) || wasCallEndedRecently(notifData) || pendingHardEnded) {
      await invalidateIncomingCall(notifData, 'ENDED');
    } else if (wasRecentlyAccepted(notifData) || pendingStatus === 'ACCEPTED') {
      try {
        await acceptCallFromNotification(notifData, { navigateNow: true });
      } catch (e) {
        console.log('❌ [index:onForegroundEvent] Accept from body tap failed:', e?.message || e);
      }
    } else {
      // Explicit body tap — always open IncomingCall UI (no participant-status gate).
      const { openIncomingCallFromNotificationTap } = require('./Src/Utils/callAcceptFlow');
      openIncomingCallFromNotificationTap(notifData);
    }
  } else if (Platform.OS === 'ios' && type === EventType.PRESS) {
    if (notifType === 'message') {
      try {
        navigate('Chats', {
          chatRoomId: notifData?.roomId,
          name: notifData?.userName,
          profileImageUrl: notifData?.profile_image,
        });
      } catch (e) {
        console.log('Error navigation to Chats on iOS PRESS', e?.message);
      }
    } else if (notifType === 'call_reminder') {
      try {
        navigate('Chats', {
          chatRoomId: notifData?.roomId,
          name: notifData?.userName,
          profileImageUrl: notifData?.profile_image,
        });
      } catch (e) {
        console.log('Error navigation to Chats on iOS PRESS', e?.message);
      }
    } else if (notifType === 'call_accepted') {
      try {
        navigate('CallRequests', { activeTab: 'scheduled' });
      } catch (e) {
        console.log('Error navigation to CallRequests on iOS PRESS', e?.message);
      }
    }
  }

  // Mirror Accept/Decline in index so it works even before Main mounts.
  if (type === EventType.ACTION_PRESS) {
    const pressActionId = detail?.pressAction?.id;
    const callData = detail?.notification?.data;
    const notificationId = detail?.notification?.id;
    console.log(`📌 [index:onForegroundEvent] ACTION_PRESS - actionId: ${pressActionId}`, callData);

    if (pressActionId === 'accept_call' && callData?.roomId) {
      if (!claimNotificationAction('accept_call', callData)) return;
      markCallAcceptedSync(callData);
      try {
        // Dismiss CallKit chrome only — keep pending until accept flow finishes.
        if (Platform.OS === 'ios') {
          try {
            await IncomingCallService.dismissCallKit();
          } catch (_) {}
        }
        await acceptCallFromNotification(callData, { navigateNow: true });
      } catch (e) {
        console.log('❌ [index:onForegroundEvent] Accept failed:', e?.message || e);
      }
      if (notificationId) await notifee.cancelNotification(notificationId);
      try {
        await notifee.cancelNotification('incoming_call_' + callData.roomId);
      } catch (_) {}
    } else if (pressActionId === 'decline_call' && callData?.roomId) {
      markCallRejectedSync(callData);
      try {
        if (Platform.OS === 'ios') {
          try {
            await IncomingCallService.dismissCallKit();
          } catch (_) {}
        }
        // Prefer not navigating away aggressively — reject API is enough.
        await declineCallFromNotification(callData, { dismissUi: false });
      } catch (e) {
        console.log('❌ [index:onForegroundEvent] Decline failed:', e?.message || e);
      }
      if (notificationId) await notifee.cancelNotification(notificationId);
      try {
        await notifee.cancelNotification('incoming_call_' + callData.roomId);
      } catch (_) {}
      try {
        const { cancelAndroidCallStyleNotification } = require('./Src/Services/IncomingCallStyle');
        await cancelAndroidCallStyleNotification(callData.roomId);
      } catch (_) {}
    }
  }

  if (type === EventType.PRESS) {
    store.dispatch(setClickedNotification({ click: true }));
  }

  if (tempRemoteNotificationData) {
    const myReduxState = store.getState();
    if (myReduxState?._persist?.rehydrated && tempRemoteNotificationData) {
      store.dispatch(
        updateCacheRoomList({
          chatRoomId: tempRemoteNotificationData?.content?.roomId,
          createdAt: tempRemoteNotificationData?.content?.createdAt,
          message: tempRemoteNotificationData?.content?.hasAttachment ? '' : tempRemoteNotificationData?.content?.message,
          hasAttachment: tempRemoteNotificationData?.content?.hasAttachment,
          senderId: tempRemoteNotificationData?.content?.sender_id,
          profileImage: tempRemoteNotificationData?.content?.profile_image,
          userName: tempRemoteNotificationData?.content?.username,
          role: tempRemoteNotificationData?.content?.sender_role,
          unreadCount: tempRemoteNotificationData?.content?.unreadCount,
          updatedAt: tempRemoteNotificationData?.content?.createdAt,
          user_type: tempRemoteNotificationData?.content?.user_type,
        }),
      );
      store.dispatch(setUnReadChatIcon({ show: true }));
      store.dispatch(pushUnReadRoomIds({ chatRoomId: tempRemoteNotificationData?.content?.roomId }));
    }
  }
});





function HeadlessCheck({ isHeadless }) {
  if (isHeadless) {
    return null;
  }
  return <App />;
}

AppRegistry.registerComponent('main', () => HeadlessCheck);
