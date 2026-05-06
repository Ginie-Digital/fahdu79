import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  console.log('🚀 Navigating to:', name, params);

  // If ready, navigate immediately
  if (navigationRef.isReady()) {
    if (name === 'home') {
      navigationRef.navigate('chatRoomTab', { screen: 'home' });
    } else {
      navigationRef.navigate(name, params);
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
      if (name === 'home') {
        navigationRef.navigate('chatRoomTab', { screen: 'home' });
      } else {
        navigationRef.navigate(name, params);
      }
    } else if (attempts >= 50) { // 5 seconds
      console.log('❌ NavigationRef failed to become ready');
      clearInterval(interval);
    }
  }, 100);
}

// add other navigation functions that you need and export them
