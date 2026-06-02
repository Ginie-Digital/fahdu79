import { StyleSheet, AppState, StatusBar, Platform, View, Linking, Alert } from 'react-native';
import React, { useCallback, useRef, useState } from 'react';
import StackNavigation from './Navigation/StackNavigation';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import socketServcies from './SocketServices';
import { getMessaging, onMessage, getToken, onTokenRefresh, requestPermission } from '@react-native-firebase/messaging';
import {dismissProgressNotification, displayNotificationProgressIndicator, showMentionNotification, showOthersCategoryNotification, showSubscriptionNotification, showCallRelatedNotification, showCallReminderNotification, liveStreamNotification, onDisplayNotification, showPostInteractionNotification} from './Notificaton';
import { enableNotificationModal, resetAllModal, setLatestTip, setUnReadChatIcon, toggleCallAccepted, toggleEmailVerificationModal, toggleNewMessageRecieved } from './Redux/Slices/NormalSlices/HideShowSlice';
import { authLogout, currentUserInformation, token as memoizedToken } from './Redux/Slices/NormalSlices/AuthSlice';
import { markRoomAsProcessed, markRoomAsAccepted, clearProcessedRoomId } from './Redux/Slices/NormalSlices/Call/CallSlice';
import { useSendFcmTokenMutation } from './Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';

import notifee, { EventType } from '@notifee/react-native';

// import notifee, {EventType} from '@notifee/react-native';

import axios from 'axios';
import { navigate } from './Navigation/RootNavigation';
import { screens } from './DesiginData/Data';
import { removeRoomList, updateCacheRoomList } from './Redux/Slices/NormalSlices/RoomListSlice';
import { emptyUnreadRoomList, pushUnReadRoomIds } from './Redux/Slices/NormalSlices/UnReadThreadSlice';
import { useFocusEffect } from '@react-navigation/native';
import { chatRoomSuccess, LoginPageErrors, OnlineSnack } from './Src/Components/ErrorSnacks';
import { deleteCachedMessages } from './Redux/Slices/NormalSlices/MessageSlices/ThreadSlices';

import { AppLog } from './Src/Utils/Logger';
import RingtoneManager from './Src/Components/Calling/RingtoneManager';
import { BASE_URL } from './Src/Configs/ApiConfig';
import DeviceInfo, { getVersion } from 'react-native-device-info';
import { setUpdateStatus } from './Redux/Slices/NormalSlices/HasAppUpdatedSlice';
import { resetAll } from './Redux/Actions';

// import SplashScreen from "react-native-splash-screen";
import { pushChats, pushGoals, removeGoals, setMuteState, setToAnimate, setViewers, updateGoals } from './Redux/Slices/NormalSlices/LiveStream/LiveChats';
import FlashMessage from 'react-native-flash-message';
import { checkApplicationPermission } from './Permissions';
import { deleteCredentials } from './Redux/Slices/NormalSlices/TempCredentials';
import { extractUserIdFromUrl, extractUserNameAndroid, extractUsernameFromDeepLink, isVersionGreaterOrEqual, joinLivestream } from './DesiginData/Utility';
import { setRefferalLink } from './Redux/Slices/NormalSlices/Deeplink/DeeplinkSlice';

import AlertBox from './Src/AlertBox';
import ReLoginModal from './Src/Screens/LoginSignup/ReLoginModal';
import { setCallRejected } from './Redux/Slices/NormalSlices/Call/CallSlice';
import { updateWallet } from './Redux/Slices/NormalSlices/Wallet/WalletSlice';
import ServerMaintenance from './Src/Screens/ServerMaintenance';
import PostTipModal from './Src/Components/HomeComponents/PostTipModal';
import CombineSelectorModal from './Src/Screens/Chatroom/CombineSelectorModal';
import LabelModal from './Src/Components/LabelModal';
import ChatWindowTipModal from './Src/Components/ChatWindowComponents/ChatWindowTipModal';
import ScreenshotPrevention from './Src/Components/ScreenshotPrevention';
import DateTimePickerSheet from './Src/Components/CreatePostComponents/DateTimePickerSheet';
import NicheSelectorModal from './Src/Components/Verification/NicheSelectorModal';
import CallDisconnectedModal from './Src/Components/Calling/CallDisconnectedModal';
import HomeBottomSheet from './Src/Components/HomeComponents/HomeBottomSheet';
import CreatePostBottomSheet from './Src/Components/HomeComponents/CreatePostBottomSheet';
import CreateCommentBottomSheet from './Src/Components/HomeComponents/CreateCommentBottomSheet';
import PostActionBottomSheet from './Src/Components/HomeComponents/PostActionBottomSheet';
import SwitcherSheet from './Src/Components/HomeComponents/SwitcherSheet';

const Main = () => {
  const currentUserId = useSelector(state => state.auth.user.currentUserId);
  const token = useSelector(state => state.auth.user.token);
  const currentChatRoomId = useSelector(state => state.chatWindowCurrentChattingRoom.data.roomId);
  const doUpdate = useSelector(state => state.hasAppUpdated.app.updated);
  const doUserClickedOnForeGroundNotification = useSelector(state => state.hideShow.visibility.notificationClick);
  const doUserLoggedIn = useSelector(state => state.auth.user.token);
  const isNotificationFromQuitState = useSelector(state => state.call.data.fromNotification);
  const processedRoomIds = useSelector(state => state.call.processedRoomIds);
  const acceptedRoomIds = useSelector(state => state.call.acceptedRoomIds);
  const data = useSelector(state => state.credentials.user);

  const [sendFcmToken] = useSendFcmTokenMutation();
  const dispatch = useDispatch();
  const [showLottie, setShowLottie] = useState(false);
  const [disconnectModalVisible, setDisconnectModalVisible] = useState(false);
  const hasHandledInitialLink = useRef(false);

  // Stable refs to prevent onMessage re-subscription gaps
  const currentChatRoomIdRef = useRef(currentChatRoomId);
  const processedRoomIdsRef = useRef(processedRoomIds);
  const acceptedRoomIdsRef = useRef(acceptedRoomIds);

  useEffect(() => { currentChatRoomIdRef.current = currentChatRoomId; }, [currentChatRoomId]);
  useEffect(() => { processedRoomIdsRef.current = processedRoomIds; }, [processedRoomIds]);
  useEffect(() => { acceptedRoomIdsRef.current = acceptedRoomIds; }, [acceptedRoomIds]);

  // Ref for auth token so FCM effect doesn't re-run on every token change
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  // Reset persisted call state on fresh app launch
  useEffect(() => {
    dispatch(toggleCallAccepted({ status: false }));
  }, []);

  // Settle any stuck calls on cold start (handles force-quit scenarios)
  const hasSettledRef = useRef(false);
  useEffect(() => {
    if (token && !hasSettledRef.current) {
      hasSettledRef.current = true;
      const settleCallOnStartup = async () => {
        try {
          console.log('🔄 [Settle] Calling settle call API on startup...');
          const response = await axios.post(`${BASE_URL}/api/stream/call/settle`, {}, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: 10000,
          });
          console.log('✅ [Settle] API response:', response.data);
        } catch (error) {
          console.log('❌ [Settle] Failed:', error?.response?.data || error?.message);
        }
      };
      settleCallOnStartup();
    }
  }, [token]);

  // Unified incoming call handler to prevent duplicates (Socket vs FCM)
  // Uses callId from backend (same across Socket & FCM) for reliable deduplication
  const handleIncomingCall = useCallback((callData, source) => {
    const roomId = callData?.roomId;
    if (!roomId) return;

    const callId = callData?.callId;

    console.log(`\n==========================================`);
    console.log(`📞 [Main:IncomingCall] Incoming from ${source}`);
    console.log(`📞 [Main:IncomingCall] RoomID: ${roomId}, CallID: ${callId}`);
    console.log(`📞 [Main:IncomingCall] Current Processed IDs: ${JSON.stringify(processedRoomIdsRef.current)}`);

    // Dedup using backend callId — identical across Socket & FCM for same call session
    if (callId) {
      if (processedRoomIdsRef.current.includes(callId)) {
        console.log(`🚨 [Main:IncomingCall] BLOCKED: Duplicate call event from ${source} for callId ${callId}`);
        console.log(`==========================================\n`);
        return;
      }
      dispatch(markRoomAsProcessed(callId));
    } else {
      console.log(`⚠️ [Main:IncomingCall] No callId from backend — skipping dedup`);
    }

    console.log(`✅ [Main:IncomingCall] ALLOWED: Processing incoming call from ${source}`);

    try {
      navigate('incomingCall', {
        name: callData?.name || callData?.displayName,
        profileImageUrl: callData?.profileImageurl || callData?.profileImage || callData?.profile_image,
        roomId: roomId,
        callType: callData?.callType,
        callerId: callData?.callerId || callData?.senderId,
        callId: callId,
      });
      console.log(`🚀 [Main:IncomingCall] Navigation to 'incomingCall' triggered successfully from ${source}`);
      console.log(`==========================================\n`);
    } catch (e) {
      console.error(`❌ [Main:IncomingCall] Navigation error from ${source}:`, e);
      console.log(`==========================================\n`);
    }
  }, [dispatch]);

  const handleCallAccepted = useCallback((callData, source) => {
    const roomId = callData?.roomId || callData?.content?.roomId;
    
    AppLog('SOCKET_CALL', `Call accepted signal received via ${source}`, { roomId, callData });
    
    if (!roomId) {
      console.log(`[Main] No roomId in call accepted event from ${source}`);
      return;
    }

    if (acceptedRoomIdsRef.current.includes(roomId)) {
      console.log(`[Main] Ignoring duplicate call accepted event from ${source} for room ${roomId}`);
      return;
    }

    console.log(`[Main] Processing call accepted from ${source} for room ${roomId}`);
    dispatch(markRoomAsAccepted(roomId));

    // Common logic for call acceptance
    chatRoomSuccess('Call accepted...');
    dispatch(toggleCallAccepted({ status: true }));
  }, [dispatch]);

  // Socket initialization and listeners
  useEffect(() => {
    if (currentUserId !== undefined && token) {
      socketServcies.initializeSocket(currentUserId, token);

      const onNotification = data => {
        if (data?.dm > 0) {
          dispatch(toggleNewMessageRecieved());
        }
      };

      const onLiveStreamChat = data => {
        console.log('::::::::::::::LIVESTREAM CHAT:::::::::::::', data);
        dispatch(pushChats({ chat: data }));
      };

      const onLiveStreamTip = data => {
        console.log('::::::::::::::::::LIVE_STREAM_TIP::::::::::::::', data);
        dispatch(pushChats({ chat: data }));
      };

      const onNewGoal = data => {
        console.log('::::::::::::NEW_GOAL_UPDATE::::::::::::', data);
        dispatch(pushGoals({ goals: data }));
      };

      const onTippedGoal = data => {
        console.log('::::::::::::::::::::TIPPED_GOAL:::::::::', data);
        dispatch(updateGoals({ data }));
      };

      const onViewers = data => {
        console.log(':::::::::::::::::::viewers:::::::::', data);
        dispatch(setViewers({ viewers: data }));
      };

      const onCompletedGoal = data => {
        console.log('::::::::::::::::::::::::::COMPLETED_GOAL::::::::::::', data);
        dispatch(removeGoals({ data }));
        dispatch(pushChats({ chat: { ...data, type: 'completed' } }));
        dispatch(setToAnimate({ toAnimate: true }));
      };

      const onLiveStreamJoin = data => {
        console.log('::::::::::::::::::::::::::NEW_USER_JOIN::::::::::::', data);
        dispatch(pushChats({ chat: { ...data, type: 'new_user' } }));
      };

      const onLiveStreamMute = data => {
        console.log(':::::::::::::::::::livestream_mute:::::::::', data);
        dispatch(setMuteState({ data }));
      };

      const onCallAccepted = data => {
        AppLog('SOCKET_CALL', 'Received call_accepted event (Detailed)', data);
        handleCallAccepted(data, 'SOCKET_CALL_ACCEPTED');
      };

      const onCallUnavailable = data => {
        AppLog('SOCKET_CALL', 'Received call_unavailable event (Detailed)', data);
        RingtoneManager.stopAll();
        dispatch(toggleCallAccepted({ status: false }));
        if (data?.callId) dispatch(clearProcessedRoomId(data.callId));
        navigate('home');
        LoginPageErrors('User not receiving the call');
      };

      const onCreatorLiveStarted = data => {
        AppLog('STREAM', 'Follower seen Creator started live signal', data);
      };

      const onCallRejected = data => {
        console.log(':::::::::::::::::::call_rejected:::::::::', data?.by, currentUserId, Platform.OS);
        AppLog('SOCKET_CALL', 'Received call_rejected event (Detailed)', data);
        RingtoneManager.stopAll();
        if (currentUserId !== data?.by) {
          dispatch(toggleCallAccepted({ status: false }));
          if (data?.callId) dispatch(clearProcessedRoomId(data.callId));
          LoginPageErrors('Call Rejected...');
          navigate('home');
        } else {
          if (data?.callId) dispatch(clearProcessedRoomId(data.callId));
          console.log('Ignoring own rejection event (dedup guard cleared)');
        }
      };

      const onCallDisconnected = data => {
        console.log(':::::::::::::::::::call_disconnected:::::::::', data);
        AppLog('SOCKET_CALL', 'Received call_disconnected event (Detailed)', data);
        RingtoneManager.stopAll();
        dispatch(toggleCallAccepted({ status: false }));
        if (data?.callId) dispatch(clearProcessedRoomId(data.callId));
        navigate('home');
      };

      const onSocketDisconnectCloseApp = data => {
        console.log(':::::::::::socket_disconnect_close_app:::::::::', data);
        AppLog('SOCKET_CALL', 'Other side swiped-closed app (socket signal)', data);
        RingtoneManager.stopAll();
        dispatch(toggleCallAccepted({ status: false }));
        if (data?.callId) dispatch(clearProcessedRoomId(data.callId));
        setDisconnectModalVisible(true);
      };

      const onIncomingCaller = data => {
        AppLog('INCOMING_SOCKET_CALL', 'Received incoming_caller via socket (Detailed)', data);
        handleIncomingCall(data, 'SOCKET');
      };

      const onConnect = data => {
        console.log('Socket Connected Main.js');
        AppLog('SOCKET', 'Socket connected to server');
      };

      const onDisconnect = data => {
        console.log('Socket Disconnected Main.js');
        AppLog('SOCKET', 'Socket disconnected from server');
      };

      const onCallTip = data => {
        console.log('💰 [Main] Received call tip socket:', data);
        AppLog('CALL', 'Received call tip over socket', data);
        dispatch(setLatestTip(data));
      };

      socketServcies.on('notification', onNotification);
      socketServcies.on('livestream_chat', onLiveStreamChat);
      socketServcies.on('livestream_tip', onLiveStreamTip);
      socketServcies.on('new_goal', onNewGoal);
      socketServcies.on('tipped_goal', onTippedGoal);
      socketServcies.on('viewers', onViewers);
      socketServcies.on('completed_goal', onCompletedGoal);
      socketServcies.on('livestream_join', onLiveStreamJoin);
      socketServcies.on('livestream_mute', onLiveStreamMute);
      socketServcies.on('call_accepted', onCallAccepted);
      socketServcies.on('call_unavailable', onCallUnavailable);
      socketServcies.on('CREATOR_LIVE_STARTED', onCreatorLiveStarted);
      socketServcies.on('call_rejected', onCallRejected);
      socketServcies.on('call_disconnected', onCallDisconnected);
      socketServcies.on('socket_disconnect_close_app', onSocketDisconnectCloseApp);
      socketServcies.on('incoming_caller', onIncomingCaller);
      socketServcies.on('connect', onConnect);
      socketServcies.on('disconnect', onDisconnect);
      socketServcies.on('call_tip', onCallTip);

      return () => {
        socketServcies.off('notification', onNotification);
        socketServcies.off('livestream_chat', onLiveStreamChat);
        socketServcies.off('livestream_tip', onLiveStreamTip);
        socketServcies.off('new_goal', onNewGoal);
        socketServcies.off('tipped_goal', onTippedGoal);
        socketServcies.off('viewers', onViewers);
        socketServcies.off('completed_goal', onCompletedGoal);
        socketServcies.off('livestream_join', onLiveStreamJoin);
        socketServcies.off('livestream_mute', onLiveStreamMute);
        socketServcies.off('call_accepted', onCallAccepted);
        socketServcies.off('call_unavailable', onCallUnavailable);
        socketServcies.off('CREATOR_LIVE_STARTED', onCreatorLiveStarted);
        socketServcies.off('call_rejected', onCallRejected);
        socketServcies.off('call_disconnected', onCallDisconnected);
        socketServcies.off('socket_disconnect_close_app', onSocketDisconnectCloseApp);
        socketServcies.off('incoming_caller', onIncomingCaller);
        socketServcies.off('connect', onConnect);
        socketServcies.off('disconnect', onDisconnect);
        socketServcies.off('call_tip', onCallTip);
      };
    }
  }, [currentUserId, token]);

  // After login process
  const afterLoginProcess = useCallback(async data => {
    dispatch(
      currentUserInformation({
        token: data?.data?.token,
        currentUserId: data?.data?.user?._id,
        currentUserFullName: data?.data?.user?.fullName,
        currentUserDisplayName: data?.data?.user?.displayName,
        currentUserProfilePicture: data?.data?.user?.profile_image?.url,
        role: data?.data?.user?.role,
        email: data?.data?.user?.email,
        currentUserCoverPicture: data?.data?.user?.cover_photo?.url,
        passwordCreated: data?.data?.user?.passwordCreated,
        licenseAgreed: data?.data?.user?.licenseAgreed,
        onlyBrandsAccess: data?.data?.user?.onlyBrandsAccess ?? false,
        ylyticInstagramUserId: data?.data?.user?.ylyticInstagramUserId ?? null,
        is_phone_verified: data?.data?.user?.is_phone_verified,
        suspended: data?.data?.user?.suspended,
      }),
    );

    checkApplicationPermission().then(e => {
      console.log('NOTIFICATION PERMISSION', e);

      if (e === 'granted') {
      } else if (e === 'denied') {
        checkApplicationPermission().then(e => {
          if (e === 'denied') {
            console.log('enabling');
            dispatch(enableNotificationModal());
          }
        });
      } else if (e === 'never_ask_again') {
        dispatch(enableNotificationModal());
      }
    });
  }, []);



  // Login user
  const loginUser = async (email, password) => {
    try {
      const { data } = await axios.post(
        `${BASE_URL}/api/user/signin`,
        { email, password },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'System-Agent': `${DeviceInfo.getBrand()} ${DeviceInfo.getModel()}`,
          },
          timeout: 5000,
        },
      );

      console.log(data?.statusCode, '::::::EMAIL LOGIN');

      if (data?.statusCode === 200) {
        dispatch(toggleEmailVerificationModal({ show: false }));
        dispatch(deleteCredentials());
        afterLoginProcess(data);
      } else {
        LoginPageErrors('Something Went Wrong');
      }
    } catch (e) {
      console.log(e);

      if (e.message === 'Network Error') {
        LoginPageErrors('Please check your network');
      } else {
        LoginPageErrors('Something went wrong, please try again later');
        console.log('Error at 160');
      }
    }
  };

  // Helper function to get query params
  const getQueryParams = (url) => {
    const qIndex = url.indexOf('?');
    if (qIndex === -1) return {};
    const qs = url.substring(qIndex + 1).split('#')[0];
    return qs
      .split('&')
      .filter(Boolean)
      .reduce((acc, pair) => {
        const [k, v = ''] = pair.split('=');
        acc[decodeURIComponent(k)] = decodeURIComponent(v);
        return acc;
      }, {});
  };

  // Unified deep link handler
  const handleDeepLink = useCallback(async (url) => {
    console.log('HANDLING DEEP LINK:', url);

    if (!url) {
      console.log('No URL provided');
      return;
    }

    try {
      let route = url;

      // Normalize URL - handle both web and app scheme
      if (route.startsWith('https://link.fahdu.com/go/')) {
        route = route.replace('https://link.fahdu.com/go/', '');
      } else if (route.startsWith('exp+fahdu://')) {
        route = route.replace('exp+fahdu://', '');
      } else if (route.startsWith('fahdu://')) {
        route = route.replace('fahdu://', '');
      }

      console.log('Processed route:', route);

      // Strip optional 'home/' prefix that some schemes might include
      if (route.startsWith('home/')) {
        route = route.replace('home/', '');
      }

      console.log('Final normalized route:', route);

      // Handle email verification deep link (for auto-login)
      const parts = url.split('/');
      const lastSegment = parts[parts.length - 1];

      if (data.email && data.password && data.email === lastSegment) {
        console.log('Auto-login triggered');
        await loginUser(data.email, data.password);
        return;
      }

      // Handle profile deep link
      if (route.startsWith('profile')) {
        const params = getQueryParams(url);
        const id = params.id;
        const username = route.split('/')[1]?.split('?')[0];

        if (!doUserLoggedIn) {
          console.log('User not logged in, storing referral link');
          dispatch(setRefferalLink({ link: username }));
          return;
        }

        if (currentUserId === id) {
          navigate('profile');
        } else {
          dispatch(setRefferalLink({ link: username }));
          navigate('othersProfile', {
            userName: username,
            userId: id,
            role: 'creator',
          });
        }
        return;
      }

      // Handle post deep link
      if (route.startsWith('post')) {
        const postId = route.split('/')[1]?.split('?')[0];

        if (!doUserLoggedIn) {
          console.log('User not logged in, cannot view post');
          return;
        }

        if (postId) {
          navigate('sharedPost', { postId });
        }
        return;
      }

      console.log('Unrecognized deep link route:', route);
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  }, [data.email, data.password, doUserLoggedIn, currentUserId]);

  // Consolidated deep link handling
  useEffect(() => {
    // Handle cold start (app was closed)
    const handleInitialUrl = async () => {
      if (hasHandledInitialLink.current) {
        return;
      }

      try {
        if (Platform.OS === 'ios') {
          const url = await Linking.getInitialURL();
          if (url) {
            console.log('iOS initial URL:', url);
            await handleDeepLink(url);
            hasHandledInitialLink.current = true;
          }
        } else {
          // Deep link handling (Standard URLs only)
          const url = await Linking.getInitialURL();
          if (url) {
            console.log('Android Linking initial URL:', url);
            await handleDeepLink(url);
            hasHandledInitialLink.current = true;
          }
        }
      } catch (error) {
        console.error('Error handling initial URL:', error);
      }
    };

    // Call initial handler
    handleInitialUrl();

    // Listen for deep links while app is running
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      console.log('Linking event received:', url);
      handleDeepLink(url);
    });


    // Cleanup
    return () => {
      linkingSubscription.remove();
    };
  }, [handleDeepLink]);

  // FCM Token registration with retry logic
  useEffect(() => {
    let timeoutId;
    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const registerFCM = async () => {
      if (!isMounted || currentUserId === undefined || !tokenRef.current) return;

      try {
        // 1. Request OS-level notification permissions (iOS & Android 13+)
        const authStatus = await requestPermission(getMessaging());
        const enabled =
          authStatus === 1 || // messaging.AuthorizationStatus.AUTHORIZED
          authStatus === 2;   // messaging.AuthorizationStatus.PROVISIONAL

        if (!enabled) {
          console.log('❌ User denied notification permissions');
          AppLog('FCM_INIT', 'User denied push notification permissions', { authStatus, currentUserId });
          return;
        }

        // Small delay to ensure Firebase is fully initialized
        await new Promise(resolve => setTimeout(resolve, 500));

        // 2. Fetch Token
        const fcmToken = await getToken(getMessaging());
        console.log('✅ FCM token obtained:', fcmToken?.substring(0, 20) + '...');
        AppLog('FCM_INIT', 'FCM token generated successfully', { partialToken: fcmToken?.substring(0, 10), currentUserId });

        const response = await sendFcmToken({ token: tokenRef.current, fcmToken });
        
        if (response?.error) {
          console.log('⚠️ FCM token API registration failed:', response?.error);
          AppLog('FCM_API', 'Failed to register token with backend', { error: response?.error });
          if (retryCount < MAX_RETRIES && isMounted) {
            retryCount++;
            timeoutId = setTimeout(registerFCM, 5000);
          }
        } else {
          console.log('✅ FCM token registered successfully with backend');
          AppLog('FCM_API', 'Token successfully registered with backend', { currentUserId });
        }
      } catch (error) {
        console.log('❌ FCM registration exception:', error?.code, error?.message);
        AppLog('FCM_ERROR', 'Exception during FCM registration', { error: error?.message, code: error?.code });
        if (retryCount < MAX_RETRIES && isMounted) {
          retryCount++;
          console.log(`🔄 Retrying FCM registration (${retryCount}/${MAX_RETRIES}) in 5s...`);
          timeoutId = setTimeout(registerFCM, 5000);
        }
      }
    };

    registerFCM();

    // Listen for FCM token refreshes
    const unsubscribeTokenRefresh = onTokenRefresh(getMessaging(), async (newFcmToken) => {
      console.log('🔄 FCM token natively refreshed by Firebase:', newFcmToken?.substring(0, 20) + '...');
      if (currentUserId && tokenRef.current) {
        try {
          await sendFcmToken({ token: tokenRef.current, fcmToken: newFcmToken });
          console.log('✅ Refreshed FCM token updated in backend!');
          AppLog('FCM_REFRESH', 'Token successfully refreshed with backend', { currentUserId });
        } catch (err) {
          console.error('❌ Failed to update refreshed token in backend', err);
          AppLog('FCM_ERROR', 'Failed to update refreshed token', { error: err?.message });
        }
      }
    });

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribeTokenRefresh();
    };
  }, [currentUserId]);

  // Join livestream with notification handler
  const joinLiveStreamWithNotificationHandler = async (detail, token) => {
    const joinStreamApi = await joinLivestream(token, detail?.notification?.data?.roomId);

    console.log(joinStreamApi, 'joinStreamAPi');

    if (joinStreamApi?.statusCode === 200) {
      console.log('liveJOINDATA', joinStreamApi?.data);

      navigate('confirmlivestreamjoin', { data: joinStreamApi?.data, roomId: detail?.notification?.data?.roomId });
    } else {
      if (joinStreamApi?.statusCode === 400) {
        LoginPageErrors('Hey!, Livestream has ended 🥺');
        return;
      } else {
        LoginPageErrors(`${joinStreamApi?.message || 'Something went wrong'}`);
      }
    }
  };

  // Bootstrap sequence function Quit State
  async function bootstrap() {
    const initialNotification = await notifee.getInitialNotification();

    console.log(initialNotification, 'XOOOO');

    if (initialNotification) {
      console.log('Notification caused application to open');

      if (initialNotification?.notification?.data?.type === 'message') {
        try {
          navigate('Chats', {
            chatRoomId: initialNotification?.notification?.data?.roomId,
            name: initialNotification?.notification?.data?.userName,
            profileImageUrl: initialNotification?.notification?.android?.largeIcon,
          });
        } catch (e) {
          console.log('Error on MainJS', e?.message);
        }
      } else if (initialNotification?.notification?.data?.type === 'livestream') {
        await joinLiveStreamWithNotificationHandler(initialNotification, token);
      } else if (initialNotification?.notification?.data?.type === 'call_reminder') {
        try {
          navigate('Chats', {
            chatRoomId: initialNotification?.notification?.data?.roomId,
            name: initialNotification?.notification?.data?.userName,
            profileImageUrl: initialNotification?.notification?.data?.profile_image,
          });
        } catch (e) {
          console.log('Error on MainJS', e?.message);
        }
      } else if (initialNotification?.notification?.data?.type === 'call_accepted') {
        try {
          navigate('CallRequests', {activeTab: 'scheduled'});
        } catch (e) {
          console.log('Error navigation to CallRequests on bootstrap', e?.message);
        }
      } else if (initialNotification?.notification?.data?.type === 'subscription') {
        console.log('NOTHING_MATCHED');
      } else if (initialNotification?.notification?.data?.type === 'mention') {
        const link = initialNotification?.notification?.data?.link;
        const postId = link?.split('post/')?.[1]?.split('?')?.[0];
        if (postId) {
          navigate('sharedPost', {postId});
        }
      }
    }
  }

  // Bootstrap on notification click
  useEffect(() => {
    bootstrap();
  }, [doUserClickedOnForeGroundNotification]);

  // Foreground notification handler
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      console.log('EVENb', type, detail);

      // Handle notification press
      if (type === EventType.PRESS) {
        console.log('Notification pressed:', detail);

        const notificationType = detail?.notification?.data?.type;
        const notificationData = detail?.notification?.data;

        // Handle livestream notification
        if (notificationType === 'livestream') {
          await joinLiveStreamWithNotificationHandler(detail, token);
        }

        // Handle subscription notification
        else if (notificationType === 'subscription') {
          console.log('Subscription notification pressed');

          if (notificationData?.link) {
            Linking.openURL(notificationData.link);
          }
        }

        // Handle call request notification
        else if (notificationType === 'call_request') {
          console.log('Call request notification pressed');

          const { roomId, sender_id, sender_role, callType } = notificationData;
        }

        // Handle call accepted notification
        else if (notificationType === 'call_request_accepted') {
          console.log('Call accepted notification pressed');
          navigate('CallRequests', {activeTab: 'scheduled'});
        }

        else if (notificationType === 'call_reminder') {
          try {
            navigate('Chats', {
              chatRoomId: notificationData?.roomId,
              name: notificationData?.userName,
              profileImageUrl: notificationData?.profile_image
            });
          } catch (e) {
            console.log('Error on MainJS', e?.message);
          }
        } 
        
        else if (notificationType === 'mention') {
          const link = notificationData?.link;
          const postId = link?.split('post/')?.[1]?.split('?')?.[0];
          if (postId) {
            navigate('sharedPost', {postId});
          }
        }

      }

      // Handle notification action press

      // Handle notification dismissal
      else if (type === EventType.DISMISSED) {
        console.log('Notification dismissed');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [token]);

  // Firebase messaging handler
  useEffect(() => {
    const onMessageReceived = async msg => {
      console.log('FCM Message Received:', msg);

      // Proceed only if payload exists
      if (!msg?.data?.payload) {
        console.log('No payload found, skipping message');
        return;
      }

      let remoteNotificationData;
      try {
        remoteNotificationData = JSON.parse(msg.data.payload);
      } catch (error) {
        console.error('Invalid payload JSON:', error);
        return;
      }

      if (remoteNotificationData?.type === 'message') {
        console.log(remoteNotificationData?.content?.unreadCount, 'POPOP');

        dispatch(
          updateCacheRoomList({
            chatRoomId: remoteNotificationData?.content?.roomId,
            createdAt: remoteNotificationData?.content?.createdAt,
            message: remoteNotificationData?.content?.hasAttachment ? '' : remoteNotificationData?.content?.message,
            hasAttachment: remoteNotificationData?.content?.hasAttachment,
            senderId: remoteNotificationData?.content?.sender_id,
            profileImage: remoteNotificationData?.content?.profile_image,
            userName: remoteNotificationData?.content?.username,
            role: remoteNotificationData?.content?.sender_role,
            unreadCount: remoteNotificationData?.content?.unreadCount,
            updatedAt: remoteNotificationData?.content?.createdAt,
            user_type: remoteNotificationData?.content?.user_type,
          }),
        );

        dispatch(setUnReadChatIcon({ show: true }));

        dispatch(pushUnReadRoomIds({ chatRoomId: remoteNotificationData?.content?.roomId }));

        if (currentChatRoomIdRef.current !== remoteNotificationData?.content?.roomId) {
          onDisplayNotification(remoteNotificationData?.content);
        }
      } else if (remoteNotificationData?.type === 'livestream') {
        await liveStreamNotification(remoteNotificationData?.content);
      } else if (remoteNotificationData?.type === 'others') {
        await showOthersCategoryNotification(remoteNotificationData);
      } else if (remoteNotificationData?.type === 'mention') {
        await showMentionNotification(remoteNotificationData);
      } else if (remoteNotificationData?.type === 'subscription') {
        await showSubscriptionNotification(remoteNotificationData);
      } else if (remoteNotificationData?.type === 'call_rejected') {
        if (Platform.OS === 'android') {
          // CallKeep stuff removed
        }
      } else if (remoteNotificationData?.type === 'call') {
        console.log('📱 [Main:FCM] --- INCOMING CALL SIGNAL RECEIVED ---');
        console.log('📱 [Main:FCM] Full Payload:', JSON.stringify(remoteNotificationData, null, 2));
        
        const callContent = remoteNotificationData?.content;
        console.log(`📱 [Main:FCM] Extracted callId: ${callContent?.callId}`);
        console.log(`📱 [Main:FCM] Extracted roomId: ${callContent?.roomId}`);
        console.log(`📱 [Main:FCM] Extracted timestamp: ${callContent?.createdAt || callContent?.timestamp}`);
        
        AppLog('INCOMING_CALL_FCM', 'Received call via FCM (Detailed)', { 
          fullPayload: remoteNotificationData,
          extractedCallId: callContent?.callId,
          extractedRoomId: callContent?.roomId
        });
        
        handleIncomingCall(callContent, 'FCM');
      } else if (remoteNotificationData?.type === 'call_request') {
        await showCallRelatedNotification(remoteNotificationData);
        console.log(remoteNotificationData, ':::::');
      } else if (remoteNotificationData?.type === 'call_request_accepted') {
        // Informational only via FCM; logic handled via Socket as requested
        await showCallRelatedNotification(remoteNotificationData);
      } else if (remoteNotificationData?.type === 'initiator_accepted') {
        // Handled via Notification (FCM) as requested; triggers call start (Silent)
        AppLog('FCM_CALL', 'Received initiator_accepted notification (silent trigger)');
        handleCallAccepted(remoteNotificationData, 'FCM_INITIATOR_ACCEPTED');
      } else if (remoteNotificationData?.type === 'call_completed') {
        console.log(remoteNotificationData, ':::::');
        AppLog('FCM_CALL', 'Received call_completed via FCM (silent trigger)');
        await showCallRelatedNotification(remoteNotificationData);
      } else if (remoteNotificationData?.type === 'fcm_disconnect_close_app') {
        // Handle swipe-close/disconnect from other side via FCM
        AppLog('FCM_CALL', 'Other side swiped-closed app (FCM signal)', remoteNotificationData);
        RingtoneManager.stopAll();
        dispatch(toggleCallAccepted({ status: false }));
        const callContent = remoteNotificationData?.content;
        if (callContent?.callId) dispatch(clearProcessedRoomId(callContent.callId));
        navigate('home');
      } else if (remoteNotificationData?.type === 'call_disconnected') {
        // General disconnect via FCM
        AppLog('FCM_CALL', 'Received call_disconnected via FCM', remoteNotificationData);
        RingtoneManager.stopAll();
        dispatch(toggleCallAccepted({ status: false }));
        const callContent = remoteNotificationData?.content;
        if (callContent?.callId) dispatch(clearProcessedRoomId(callContent.callId));
        navigate('home');
      } else if (remoteNotificationData?.type === 'missed_call') {
        console.log(remoteNotificationData, ':::::');
        await showCallRelatedNotification(remoteNotificationData);
      } else if (remoteNotificationData?.type === 'call_unavailable') {
        // CallKeep stuff removed
      } else if (remoteNotificationData?.type === '10_reminder' || remoteNotificationData?.type === '5_reminder' || remoteNotificationData?.type === '1_reminder') {
        await showCallReminderNotification(remoteNotificationData);
      } else {
        showPostInteractionNotification(remoteNotificationData);
      }
    };

    const unsubscribe = onMessage(getMessaging(), onMessageReceived);

    return () => {
      unsubscribe();
    };
  }, []);

  const isServerMaintenance = useSelector(state => state.hideShow.visibility.serverMaintenance);

  if (isServerMaintenance) {
    return <ServerMaintenance />;
  }

  return (
    <View style={styles.SafeAreaViewStyle}>
      <StatusBar backgroundColor={'#fff'} barStyle={'dark-content'} />
      <AlertBox description={'hello there'} type={true} />
      <StackNavigation />
      <FlashMessage position="top" />
      <ReLoginModal />
      <PostTipModal />
      <CombineSelectorModal />
      <LabelModal />
      <ChatWindowTipModal />
      <ScreenshotPrevention />
      <DateTimePickerSheet />
      <NicheSelectorModal />
      <CallDisconnectedModal 
        visible={disconnectModalVisible} 
        onPress={() => {
          setDisconnectModalVisible(false);
          navigate('home');
        }} 
      />
      <HomeBottomSheet />
      <CreatePostBottomSheet />
      <CreateCommentBottomSheet />
      <PostActionBottomSheet />
      <SwitcherSheet />
    </View>
  );
};

export default Main;



const styles = StyleSheet.create({
  SafeAreaViewStyle: {
    flex: 1,
  },
});
