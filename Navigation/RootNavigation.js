import { createNavigationContainerRef, StackActions } from "@react-navigation/native";
import store from "../Redux/Store";

export const navigationRef = createNavigationContainerRef();

const LOGIN_SCREENS = [
  "LoginHome",
  "LoginEmail",
  "forgetPassword",
  "LoginPassword",
  "SignupEmail",
  "SignupPassword",
  "createPassword",
  "Invites"
];

// Call recovery screens must open even if Redux hasn't rehydrated yet.
const CALL_SCREENS = ['callScreen', 'videoCallScreen', 'incomingCall'];

const getAuthToken = () => store.getState()?.auth?.user?.token;

const safeNavigate = (screenName, screenParams) => {
  try {
    navigationRef.navigate(screenName, screenParams);
  } catch (err) {
    console.error('❌ RootNavigation safeNavigate error:', err);
  }
};

const performNavigate = (name, params) => {
  const token = getAuthToken();

  if (['home', 'profile', 'chatroom', 'discover'].includes(name)) {
    if (!token) {
      console.log('⚠️ Ignored authenticated navigation: user is logged out');
      return false;
    }
    try {
      if (navigationRef.canGoBack()) {
        console.log('🧼 Popping stack to top before switching tab to:', name);
        navigationRef.dispatch(StackActions.popToTop());
      }
    } catch (e) {
      console.log('⚠️ PopToTop failed or not supported:', e.message);
    }
    safeNavigate('chatRoomTab', { screen: name });
    return true;
  }

  if (!token && !LOGIN_SCREENS.includes(name) && !CALL_SCREENS.includes(name)) {
    console.log('⚠️ Ignored navigation to authenticated screen while logged out:', name);
    return false;
  }

  safeNavigate(name, params);
  return true;
};

export function navigate(name, params) {
  console.log('🚀 Navigating to:', name, params);

  // If ready, navigate immediately
  if (navigationRef.isReady()) {
    performNavigate(name, params);
    return;
  }

  // If not ready, poll until it is (max 8 seconds) — re-check token each tick
  console.log('⏳ NavigationRef not ready, waiting...');
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    if (navigationRef.isReady()) {
      console.log('✅ NavigationRef ready after', attempts, 'attempts');
      clearInterval(interval);
      performNavigate(name, params);
    } else if (attempts >= 80) {
      console.log('❌ NavigationRef failed to become ready');
      clearInterval(interval);
    }
  }, 100);
}


// add other navigation functions that you need and export them
