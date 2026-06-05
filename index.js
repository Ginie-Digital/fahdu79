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
import { liveStreamNotification, onDisplayNotification, showCallReminderNotification, showCallRequestNotification, showOthersCategoryNotification, showPostInteractionNotification, showSubscriptionNotification } from './Notificaton';

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
import { BASE_URL } from './Src/Configs/ApiConfig';


let tempRemoteNotificationData = undefined;
let tempCallData = Object.assign({});
let callCutFromCaller = false;
let isProcessingAndroidCall = false;

// 🔥 Helper function to wait for Redux store rehydration and get token
const getAuthToken = async (maxAttempts = 20) => {
  console.log('🔑 [getAuthToken] Attempting to get auth token...');

  for (let i = 0; i < maxAttempts; i++) {
    // Check if store is rehydrated
    const state = store.getState();
    const isRehydrated = state?._persist?.rehydrated;
    const token = state?.auth?.user?.token;

    console.log(`🔑 [getAuthToken] Attempt ${i + 1}/${maxAttempts}`);
    console.log(`   - Store rehydrated: ${isRehydrated}`);
    console.log(`   - Token exists: ${!!token}`);

    if (isRehydrated && token) {
      console.log('✅ [getAuthToken] Token found!');
      return token;
    }

    // Wait 200ms before next attempt
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('❌ [getAuthToken] Failed to get token after all attempts');
  return null;
};

// 🔥 Helper function to call the accept API with retry logic
const callAcceptAPI = async (roomId, callType, status) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📡 [callAcceptAPI] Starting API call');
  console.log(`   - roomId: ${roomId}`);
  console.log(`   - callType: ${callType}`);
  console.log(`   - status: ${status}`);

  if (!roomId) {
    console.log('❌ [callAcceptAPI] No roomId provided');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return { success: false, error: 'No roomId' };
  }

  // Get token with retry
  const token = await getAuthToken();

  if (!token) {
    console.log('❌ [callAcceptAPI] Could not get auth token');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return { success: false, error: 'No token' };
  }

  console.log('✅ [callAcceptAPI] Token obtained, making API request...');

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

    const result = await response.json();
    console.log('✅ [callAcceptAPI] API Response:', result);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return { success: true, data: result };
  } catch (error) {
    console.error('❌ [callAcceptAPI] API Error:', error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return { success: false, error: error.message };
  }
};

setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
  if (remoteMessage?.data?.payload) {
    let remoteNotificationData = JSON.parse(remoteMessage.data.payload);
    console.log('EXX', remoteMessage, remoteNotificationData?.type, remoteNotificationData);
    if (remoteNotificationData?.type === 'message') {
      tempRemoteNotificationData = remoteNotificationData;
      await onDisplayNotification(remoteNotificationData?.content);
    } else if (remoteNotificationData?.type === 'livestream') {
      await liveStreamNotification(remoteNotificationData?.content);
    } else if (remoteNotificationData?.type === 'others') {
      await showOthersCategoryNotification(remoteNotificationData);
    } else if (remoteNotificationData?.type === 'subscription') {
      await showSubscriptionNotification(remoteNotificationData);
    } else if (remoteNotificationData?.type === 'call') {
      if (Platform.OS === 'android') {
        if (isProcessingAndroidCall) {
          console.log('⚠️ [index:FCM:Background] Already processing Android call, skipping duplicate');
          return;
        }

        console.log('📱 [index:FCM:Background] --- INCOMING CALL SIGNAL RECEIVED ---');
        console.log('📱 [index:FCM:Background] Full Payload:', JSON.stringify(remoteNotificationData, null, 2));

        isProcessingAndroidCall = true;
        const callDetails = remoteNotificationData?.content;
        
        console.log(`📱 [index:FCM:Background] Saving to AsyncStorage - callId: ${callDetails?.callId}, roomId: ${callDetails?.roomId}`);
        AppLog('INCOMING_CALL_FCM_BG', 'Received full call notification in background', remoteNotificationData);

        await AsyncStorage.setItem(
          'pendingCall',
          JSON.stringify({
            roomId: callDetails?.roomId,
            callerName: callDetails?.displayName,
            callType: callDetails?.callType || 'audio',
            senderId: callDetails?.senderId,
            profileImage: callDetails?.profileImage,
          }),
        );

        isProcessingAndroidCall = false;
      }
    } else if (remoteNotificationData?.type === 'call_rejected') {
      if (Platform.OS === 'android') {
        callCutFromCaller = true;
        isProcessingAndroidCall = false;
        AppLog('FCM_CALL_BG', 'Received call_rejected background notification', remoteNotificationData);
      }
    } else if (remoteNotificationData?.type === 'call_accepted') {
      console.log('Call Accepted Background Event');
      AppLog('FCM_CALL_BG', 'Received call_accepted background notification', remoteNotificationData);
    } else if (remoteNotificationData?.type === 'initiator_accepted') {
      // Alert removed
      AppLog('FCM_CALL_BG', 'Received initiator_accepted background notification (Silent)', remoteNotificationData);
    } else if (remoteNotificationData?.type === 'call_completed') {
      console.log(remoteNotificationData, ':::::');
    } else if (remoteNotificationData?.type === 'missed_call') {
      console.log(remoteNotificationData, ':::::');
    } else if (remoteNotificationData?.type === '10_reminder' || remoteNotificationData?.type === '5_reminder' || remoteNotificationData?.type === '1_reminder') {
      await showCallReminderNotification(remoteNotificationData);
    } else {
      await showPostInteractionNotification(remoteNotificationData);
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

  if (type === EventType.PRESS && detail?.notification?.data?.link) {
    await Linking.openURL(detail.notification.data.link);
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
