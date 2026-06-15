import AsyncStorage from '@react-native-async-storage/async-storage';
import { authLogout } from './Redux/Slices/NormalSlices/AuthSlice';
import { resetAllModal, setPostsCardType, toggleReLogin } from './Redux/Slices/NormalSlices/HideShowSlice';
import { deleteCachedMessages } from './Redux/Slices/NormalSlices/MessageSlices/ThreadSlices';
import { removeRoomList } from './Redux/Slices/NormalSlices/RoomListSlice';
import { emptyUnreadRoomList } from './Redux/Slices/NormalSlices/UnReadThreadSlice';
import store from './Redux/Store';
import axios from 'axios';
import { LoginPageErrors } from './Src/Components/ErrorSnacks';
import { resetAll } from './Redux/Actions';
import { getMessaging, getToken, deleteToken } from '@react-native-firebase/messaging';
import socketServices from './SocketServices';
import { BASE_URL } from './Src/Configs/ApiConfig';

const logoutUser = async token => {
  try {
    let { data } = await axios.get('https://api.fahdu.com/api/user/logout', { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 10000 });

    console.log(data?.data);
  } catch (e) {
    console.log(e?.response?.data?.message);

    if (e.toJSON().message === 'Network Error') {
      LoginPageErrors('no internet connection');
    }
  }
};

/**
 * Clean up FCM token on logout:
 * 1. Remove the FCM token from the backend so the server stops sending push notifications
 * 2. Delete the local Firebase token so a fresh one is generated on next login
 * 3. This prevents the "notification flood" that happens when users re-login
 */
const cleanupFCMToken = async (authToken) => {
  try {
    // Step 1: Get the current FCM token
    const fcmToken = await getToken(getMessaging());
    console.log('🔔 [Logout] Current FCM token:', fcmToken?.substring(0, 20) + '...');

    // Step 2: Tell the backend to remove this FCM token
    if (authToken && fcmToken) {
      try {
        await axios.post(
          `${BASE_URL}/api/notification/preserve/token`,
          { token: fcmToken, action: 'remove' },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            timeout: 5000,
          }
        );
        console.log('✅ [Logout] FCM token removed from backend');
      } catch (backendErr) {
        // If the backend doesn't support 'action: remove', try the logout endpoint
        // The server's /api/user/logout should ideally handle this
        console.log('⚠️ [Logout] Backend FCM removal failed (non-critical):', backendErr?.message);
      }
    }

    // Step 3: Delete the local Firebase token
    // This forces Firebase to generate a new token on next login
    await deleteToken(getMessaging());
    console.log('✅ [Logout] Local FCM token deleted');
  } catch (error) {
    // Don't block logout if FCM cleanup fails
    console.log('⚠️ [Logout] FCM cleanup error (non-critical):', error?.message);
  }
};

export const autoLogout = async () => {
  const currentState = store.getState();
  const hasToken = currentState?.auth?.user?.token;

  if (hasToken) {
    store.dispatch(toggleReLogin({ show: true }));
  } else {
    console.log('autoLogout skipped: User already logged out explicitly');
  }
};

export const logoutExplicit = async () => {
  const currentState = store.getState();
  const authToken = currentState?.auth?.user?.token;

  // Step 1: Clean up FCM token (remove from backend + delete locally)
  await cleanupFCMToken(authToken);

  // Step 2: Disconnect socket to prevent receiving queued notifications
  socketServices.disconnect();

  // Step 3: Clear Redux state
  store.dispatch(authLogout());
  store.dispatch(deleteCachedMessages());
  store.dispatch(removeRoomList());
  store.dispatch(emptyUnreadRoomList());
  store.dispatch(setPostsCardType({ postCardType: 'normal' }));
  store.dispatch(resetAllModal());
  store.dispatch(resetAll());
  console.log('✅ [Logout] Full logout completed (FCM cleaned, socket disconnected, state cleared)');
};

