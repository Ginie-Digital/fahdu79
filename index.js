import 'react-native-url-polyfill/auto';
import {AppRegistry, Linking, Platform} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import messaging from '@react-native-firebase/messaging';
import {
  liveStreamNotification,
  onDisplayNotification,
  showOthersCategoryNotification,
  showPostInteractionNotification,
  showSubscriptionNotification,
} from './Notificaton';

import notifee, {EventType} from '@notifee/react-native';
import store from './Redux/Store';
import {updateCacheRoomList} from './Redux/Slices/NormalSlices/RoomListSlice';
import {pushUnReadRoomIds} from './Redux/Slices/NormalSlices/UnReadThreadSlice';
import {setClickedNotification} from './Redux/Slices/NormalSlices/HideShowSlice';
import {navigate} from './Navigation/RootNavigation';
// import {DevLauncher, DevMenu} from 'expo-dev-client';
import BootSplash from 'react-native-bootsplash';
import CallKeepService from './service/CallKeepService';
import VoipPushNotification from 'react-native-voip-push-notification';

let tempRemoteNotificationData = undefined;

messaging().setBackgroundMessageHandler(async remoteMessage => {
  // console.log(remoteMessage, ':::::::');

  if (remoteMessage?.data?.payload) {
    let remoteNotificationData = JSON.parse(remoteMessage.data.payload);
    console.log(
      'EXX',
      remoteMessage,
      remoteNotificationData?.type,
      remoteNotificationData,
    );
    if (remoteNotificationData?.type === 'message') {
      tempRemoteNotificationData = remoteNotificationData;
      await onDisplayNotification(remoteNotificationData?.content);
    } else if (remoteNotificationData?.type === 'livestream') {
      await liveStreamNotification(remoteNotificationData?.content);
    } else if (remoteNotificationData?.type === 'others') {
      await showOthersCategoryNotification(remoteNotificationData);
    } else if (remoteNotificationData?.type === 'subscription') {
      await showSubscriptionNotification(remoteNotificationData);
    } else {
      await showPostInteractionNotification(remoteNotificationData);
    }
  } else {
    console.log('MAMOTHJ', remoteMessage);
    CallKeepService.showIncomingCall('user_12345', 'Rishabh');
  }
});

notifee.onBackgroundEvent(async ({type, detail}) => {
  console.log('Background Event Working ', type, EventType.PRESS, detail);

  if (tempRemoteNotificationData) {
    console.log('Updating chatroom via notification');

    const myReduxState = store.getState();

    if (myReduxState?._persist?.rehydrated && tempRemoteNotificationData) {
      store.dispatch(
        updateCacheRoomList({
          chatRoomId: tempRemoteNotificationData?.content?.roomId,
          createdAt: tempRemoteNotificationData?.content?.createdAt,
          message: tempRemoteNotificationData?.content?.hasAttachment
            ? ''
            : tempRemoteNotificationData?.content?.message,
          hasAttachment: tempRemoteNotificationData?.content?.hasAttachment,
          senderId: tempRemoteNotificationData?.content?.sender_id,
          profileImage: tempRemoteNotificationData?.content?.profile_image,
          userName: tempRemoteNotificationData?.content?.username,
          role: tempRemoteNotificationData?.content?.sender_role,
        }),
      );
      store.dispatch(
        pushUnReadRoomIds({
          chatRoomId: tempRemoteNotificationData?.content?.roomId,
        }),
      );
    }
  }

  if (type === EventType.PRESS && detail?.notification?.data?.link) {
    console.log('ASMALUCK');
    await Linking.openURL(detail.notification.data.link);
  }
});

notifee.onForegroundEvent(async ({type, detail}) => {
  if (Platform.OS === 'ios' && type === EventType.PRESS) {
    if (detail) {
      console.log('Notification caused application to open');

      console.log(detail);

      if (detail?.notification?.data?.type === 'message') {
        try {
          navigate('Chats', {
            chatRoomId: detail?.notification?.data?.roomId,
            name: detail?.notification?.data?.userName,
            profileImageUrl: detail?.notification?.data?.profile_image,
          });
        } catch (e) {
          console.log('Error on MainJS', e?.message);
        }
      }
    } else {
      console.log('___________________________');
      console.log({type, detail});
      console.log('___________________________');
    }
  }

  if (type === EventType.PRESS) {
    store.dispatch(setClickedNotification({click: true}));
  }

  if (tempRemoteNotificationData) {
    console.log('Updating chatroom via notification');
    const myReduxState = store.getState();

    if (myReduxState?._persist?.rehydrated && tempRemoteNotificationData) {
      store.dispatch(
        updateCacheRoomList({
          chatRoomId: tempRemoteNotificationData?.content?.roomId,
          createdAt: tempRemoteNotificationData?.content?.createdAt,
          message: tempRemoteNotificationData?.content?.hasAttachment
            ? ''
            : tempRemoteNotificationData?.content?.message,
          hasAttachment: tempRemoteNotificationData?.content?.hasAttachment,
          senderId: tempRemoteNotificationData?.content?.sender_id,
          profileImage: tempRemoteNotificationData?.content?.profile_image,
          userName: tempRemoteNotificationData?.content?.username,
          role: tempRemoteNotificationData?.content?.sender_role,
        }),
      );
      store.dispatch(
        pushUnReadRoomIds({
          chatRoomId: tempRemoteNotificationData?.content?.roomId,
        }),
      );
    }
  }
});

BootSplash.hide({fade: false});

CallKeepService.setupCallKeep();

CallKeepService.addListeners();

async function disp() {
  // 🔔 Request iOS permissions first (only needed once)
  await notifee.requestPermission();

  // Display local notification
  await notifee.displayNotification({
    title: '📱 iOS Test Notification',
    body: 'This is a dummy local notification from Notifee!',
    ios: {
      sound: 'default',
      categoryId: 'default',
      foregroundPresentationOptions: {
        badge: true,
        sound: true,
        banner: true,
        list: true,
      },
    },
  });
}

if (Platform.OS === 'ios')
  // ✅ THIS IS THE LISTENER THAT *MUST* BE HERE
  // It catches the call when the app is killed or in the background
  VoipPushNotification.addEventListener('notification', notification => {
    console.log('✅ [index.js] PUSH RECEIVED:', notification);
    // Handle your incoming call logic here
    // disp();

    // CallKeepService.showIncomingCall('user_12345', 'Rishabh');

    const callDetails = notification?.payload || notification;

    const {uuid, callerName, sessionId} = callDetails;

    VoipPushNotification.onVoipNotificationCompleted(notification?.uuid);
  });

// You can keep the register listener here too
VoipPushNotification.addEventListener('register', token => {
  console.log('✅ [index.js] VoIP Token:', token);
});

function HeadlessCheck({isHeadless}) {
  if (isHeadless) {
    // App has been launched in the background by iOS, ignore
    console.log('XXXXXXXXXXXXXXX');
    return null;
  }

  return <App />;
}

AppRegistry.registerComponent(appName, () => HeadlessCheck);
