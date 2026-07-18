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
import { liveStreamNotification, onDisplayNotification, showCallReminderNotification, showCallRequestNotification, showOthersCategoryNotification, showPostInteractionNotification, showSubscriptionNotification, showIncomingCallNotification, cancelIncomingCallNotification } from './Notificaton';

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
} from './Src/Utils/callAcceptFlow';


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
    } else if (remoteNotificationData?.type === 'call') {
      if (isProcessingAndroidCall && Platform.OS === 'android') {
        console.log('⚠️ [index:FCM:Background] Already processing Android call, skipping duplicate');
        return;
      }

      console.log('📱 [index:FCM:Background] --- INCOMING CALL SIGNAL RECEIVED ---');
      console.log('📱 [index:FCM:Background] Full Payload:', JSON.stringify(remoteNotificationData, null, 2));

      if (Platform.OS === 'android') {
        isProcessingAndroidCall = true;
      }

      const callDetails = remoteNotificationData?.content;
      console.log(`📱 [index:FCM:Background] Saving to AsyncStorage - callId: ${callDetails?.callId}, roomId: ${callDetails?.roomId}`);
      AppLog('INCOMING_CALL_FCM_BG', 'Received full call notification in background', remoteNotificationData);

      // Never overwrite Accept/Reject intent with PENDING for the SAME call session.
      const existingPending = getPendingCallSync();
      const sameCallSession =
        existingPending?.roomId &&
        existingPending.roomId === callDetails?.roomId &&
        (!callDetails?.callId ||
          !existingPending.callId ||
          existingPending.callId === callDetails?.callId);
      const alreadyResolved =
        sameCallSession &&
        (existingPending.status === 'ACCEPTED' ||
          existingPending.status === 'REJECTED' ||
          existingPending.callAccepted);

      if (!alreadyResolved) {
        prepareIncomingCall({
          roomId: callDetails?.roomId,
          callerName: callDetails?.displayName,
          displayName: callDetails?.displayName,
          callType: callDetails?.callType || 'audio',
          senderId: callDetails?.senderId,
          profileImage: callDetails?.profileImage,
          callId: callDetails?.callId,
        });
      } else {
        console.log('📱 [index:FCM:Background] Skipping PENDING write — call already', existingPending.status);
      }

      await showIncomingCallNotification(callDetails);

      if (Platform.OS === 'android') {
        isProcessingAndroidCall = false;
      }
    } else if (remoteNotificationData?.type === 'call_rejected') {
      if (Platform.OS === 'android') {
        callCutFromCaller = true;
        isProcessingAndroidCall = false;
        AppLog('FCM_CALL_BG', 'Received call_rejected background notification', remoteNotificationData);
        
        const roomId = remoteNotificationData?.content?.roomId || remoteNotificationData?.roomId;
        await cancelIncomingCallNotification(roomId);
        await clearPendingCall();
      }
    } else if (remoteNotificationData?.type === 'call_accepted') {
      console.log('Call Accepted Background Event');
      AppLog('FCM_CALL_BG', 'Received call_accepted background notification', remoteNotificationData);
    } else if (remoteNotificationData?.type === 'initiator_accepted') {
      // Alert removed
      AppLog('FCM_CALL_BG', 'Received initiator_accepted background notification (Silent)', remoteNotificationData);
    } else if (remoteNotificationData?.type === 'call_completed' || remoteNotificationData?.type === 'call_disconnected' || remoteNotificationData?.type === 'fcm_disconnect_close_app') {
      console.log('Call Completed/Disconnected Background Event:', remoteNotificationData);
      if (Platform.OS === 'android') {
        const roomId = remoteNotificationData?.content?.roomId || remoteNotificationData?.roomId;
        await cancelIncomingCallNotification(roomId);
        await clearPendingCall();
      }
    } else if (remoteNotificationData?.type === 'missed_call') {
      console.log(remoteNotificationData, ':::::');
      if (Platform.OS === 'android') {
        const roomId = remoteNotificationData?.content?.roomId || remoteNotificationData?.roomId;
        await cancelIncomingCallNotification(roomId);
        await clearPendingCall();
      }
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
      // Sync stamp FIRST — Android may launch Main before this async work finishes.
      markCallAcceptedSync(callData);
      console.log('📱 [index:onBackgroundEvent] ACCEPT — joining call');
      try {
        await acceptCallFromNotification(callData, { navigateNow: false });
      } catch (e) {
        console.log('❌ [index:onBackgroundEvent] Accept failed:', e?.message || e);
      }
      if (notificationId) await notifee.cancelNotification(notificationId);
      try {
        await notifee.cancelNotification('incoming_call_' + callData.roomId);
      } catch (_) {}
    } else if (pressActionId === 'decline_call' && callData?.roomId) {
      // Sync stamp FIRST — Reject now uses launchActivity for reliability.
      markCallRejectedSync(callData);
      console.log('📱 [index:onBackgroundEvent] REJECT — declining call');
      try {
        await declineCallFromNotification(callData, { dismissUi: true });
      } catch (e) {
        console.log('❌ [index:onBackgroundEvent] Decline failed:', e?.message || e);
      }
      if (notificationId) await notifee.cancelNotification(notificationId);
      try {
        await notifee.cancelNotification('incoming_call_' + callData.roomId);
      } catch (_) {}
    }
  }

  if (type === EventType.PRESS) {
    const link = detail?.notification?.data?.link;
    const notifType = detail?.notification?.data?.type;
    console.log(`📌 [index:onBackgroundEvent] PRESS - type: ${notifType}, link: ${link}`);
    if (link && link.length > 0) {
      await Linking.openURL(link);
    }
  }
});

notifee.onForegroundEvent(async ({ type, detail }) => {
  if (Platform.OS === 'ios' && type === EventType.PRESS) {
    if (detail?.notification?.data?.type === 'message') {
      try {
        navigate('Chats', { chatRoomId: detail?.notification?.data?.roomId, name: detail?.notification?.data?.userName, profileImageUrl: detail?.notification?.data?.profile_image });
      } catch (e) {
        console.log('Error navigation to Chats on iOS PRESS', e?.message);
      }
    } else if (detail?.notification?.data?.type === 'call_reminder') {
        try {
            navigate('Chats', { chatRoomId: detail?.notification?.data?.roomId, name: detail?.notification?.data?.userName, profileImageUrl: detail?.notification?.data?.profile_image });
          } catch (e) {
            console.log('Error navigation to Chats on iOS PRESS', e?.message);
          }
    } else if (detail?.notification?.data?.type === 'call_accepted') {
        try {
            navigate('CallRequests', {activeTab: 'scheduled'});
          } catch (e) {
            console.log('Error navigation to CallRequests on iOS PRESS', e?.message);
          }
    }
  }

  // Mirror Accept/Decline in index so it works even before Main mounts.
  // acceptCallFromNotification / declineCallFromNotification are idempotent.
  if (type === EventType.ACTION_PRESS) {
    const pressActionId = detail?.pressAction?.id;
    const callData = detail?.notification?.data;
    const notificationId = detail?.notification?.id;
    console.log(`📌 [index:onForegroundEvent] ACTION_PRESS - actionId: ${pressActionId}`, callData);

    if (pressActionId === 'accept_call' && callData?.roomId) {
      markCallAcceptedSync(callData);
      try {
        await acceptCallFromNotification(callData, { navigateNow: true });
      } catch (e) {
        console.log('❌ [index:onForegroundEvent] Accept failed:', e?.message || e);
      }
      if (notificationId) await notifee.cancelNotification(notificationId);
    } else if (pressActionId === 'decline_call' && callData?.roomId) {
      markCallRejectedSync(callData);
      try {
        await declineCallFromNotification(callData, { dismissUi: true });
      } catch (e) {
        console.log('❌ [index:onForegroundEvent] Decline failed:', e?.message || e);
      }
      if (notificationId) await notifee.cancelNotification(notificationId);
      try {
        await notifee.cancelNotification('incoming_call_' + callData.roomId);
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
