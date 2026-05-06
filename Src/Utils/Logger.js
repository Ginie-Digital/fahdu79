import { getFirestore, serverTimestamp, collection, addDoc } from '@react-native-firebase/firestore';
import { getCrashlytics, log } from '@react-native-firebase/crashlytics';
import DeviceInfo from 'react-native-device-info';
import store from '../../Redux/Store';

/**
 * Only these categories will go to the real-time Firebase Firestore stream.
 * This keeps us well within the 'Free Tier' limits for 5k+ users.
 */
const LOG_TO_FIREBASE = [
  'SOCKET',         // Added for testing/verification
  'CALL',           // General calling lifecycle
  'STREAM',         // General livestreaming lifecycle
  'SOCKET_CALL',    // Socket events related to calls
  'FCM_CALL',       // Push notifications related to calls
  'ZEGO_ERROR',     // Critical Zego engine errors
  'VIDEO_REDUCER',  // Video compression metrics
  'FCM_ERROR',      // FCM registration/refresh exceptions
  'FCM_INIT',       // FCM registration success tracking
];

/**
 * AppLog - Centralized logging utility
 * @param {string} type - Category of the log (e.g., 'CALL', 'SOCKET')
 * @param {string} message - Human readable message
 * @param {object} data - Optional extra data/payload
 */
export const AppLog = async (type, message, data = {}) => {
  const state = store.getState();
  const userData = state?.auth?.user;
  const userName = userData?.currentUserDisplayName || userData?.currentUserFullName || 'Guest';
  const role = userData?.role || 'unknown';
  
  // 1. Console Log (Always for development)
  if (__DEV__) {
    console.log(`[${type}] ${message}`, data);
  }

  // 2. Crashlytics Breadcrumb (Safe check for native module)
  try {
    log(getCrashlytics(), `[${type}] ${message} | user: ${userName} | data: ${JSON.stringify(data)}`);
  } catch (error) {
    if (__DEV__) console.log('⚠️ Crashlytics Log Skipped (Native module missing)');
  }

  // 3. Selective Firebase Firestore (Safe check for native module)
  if (LOG_TO_FIREBASE.includes(type)) {
    try {
      const deviceId = DeviceInfo.getUniqueIdSync();
      const deviceModel = DeviceInfo.getModel();
      
      await addDoc(collection(getFirestore(), 'app_logs'), {
        timestamp: serverTimestamp(),
        type,
        message,
        userName,
        role,
        deviceId,
        deviceModel,
        platform: DeviceInfo.getSystemName(),
        version: DeviceInfo.getVersion(),
        ...data
      });
      if (__DEV__) console.log(`✅ Log saved to Firebase: ${type}`);
    } catch (error) {
      if (__DEV__) {
        console.log(`❌ Firebase Log Failed: ${type}. Rebuild probably needed.`, error.message);
      }
    }
  }
};

export default AppLog;
