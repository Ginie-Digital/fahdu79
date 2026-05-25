import { createNavigationContainerRef } from "@react-navigation/native";
import store from "../Redux/Store";

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  console.log('🚀 Navigating to:', name, params);

  const token = store.getState()?.auth?.user?.token;
  const loginScreens = [
    "LoginHome",
    "LoginEmail",
    "forgetPassword",
    "LoginPassword",
    "SignupEmail",
    "SignupPassword",
    "createPassword",
    "Invites"
  ];

  // Helper function to safely perform navigation
  const safeNavigate = (screenName, screenParams) => {
    try {
      navigationRef.navigate(screenName, screenParams);
    } catch (err) {
      console.error('❌ RootNavigation safeNavigate error:', err);
    }
  };

  // If ready, navigate immediately
  if (navigationRef.isReady()) {
    if (['home', 'profile', 'chatroom', 'discover'].includes(name)) {
      if (token) {
        safeNavigate('chatRoomTab', { screen: name });
      } else {
        console.log('⚠️ Ignored authenticated navigation: user is logged out');
      }
    } else {
      if (!token && !loginScreens.includes(name)) {
        console.log('⚠️ Ignored navigation to authenticated screen while logged out:', name);
      } else {
        safeNavigate(name, params);
      }
    }
    return;
  }

  // If not ready, poll until it is (max 5 seconds)
  console.log('⏳ NavigationRef not ready, waiting...');
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    if (navigationRef.isReady()) {
      console.log('✅ NavigationRef ready after', attempts, 'attempts');
      clearInterval(interval);
      if (['home', 'profile', 'chatroom', 'discover'].includes(name)) {
        if (token) {
          safeNavigate('chatRoomTab', { screen: name });
        } else {
          console.log('⚠️ Ignored authenticated navigation: user is logged out');
        }
      } else {
        if (!token && !loginScreens.includes(name)) {
          console.log('⚠️ Ignored navigation to authenticated screen while logged out:', name);
        } else {
          safeNavigate(name, params);
        }
      }
    } else if (attempts >= 50) { // 5 seconds
      console.log('❌ NavigationRef failed to become ready');
      clearInterval(interval);
    }
  }, 100);
}


// add other navigation functions that you need and export them
