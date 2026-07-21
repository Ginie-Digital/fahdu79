import { StyleSheet, AppState, StatusBar, Platform, View, Linking, Alert } from 'react-native';
import React, { useCallback, useRef, useState } from 'react';
import StackNavigation from './Navigation/StackNavigation';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketServcies from './SocketServices';
import { getMessaging, onMessage, getToken, onTokenRefresh, requestPermission, onNotificationOpenedApp, getInitialNotification as getFirebaseInitialNotification } from '@react-native-firebase/messaging';
import {dismissProgressNotification, displayNotificationProgressIndicator, showMentionNotification, showOthersCategoryNotification, showSubscriptionNotification, showCallRelatedNotification, showCallReminderNotification, liveStreamNotification, onDisplayNotification, showPostInteractionNotification, showIncomingCallNotification, cancelIncomingCallNotification, ensureIncomingCallNotificationCategory} from './Notificaton';
import { enableNotificationModal, resetAllModal, setLatestTip, setUnReadChatIcon, toggleCallAccepted, toggleEmailVerificationModal, toggleNewMessageRecieved } from './Redux/Slices/NormalSlices/HideShowSlice';
import { authLogout, currentUserInformation, token as memoizedToken, updateApnToken } from './Redux/Slices/NormalSlices/AuthSlice';
import { markRoomAsProcessed, markRoomAsAccepted, clearProcessedRoomId } from './Redux/Slices/NormalSlices/Call/CallSlice';
import { useSendFcmTokenMutation } from './Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import IncomingCallService from './Src/Services/IncomingCallService';
import { wireIncomingCallStyleEvents } from './Src/Services/IncomingCallStyle';

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
import { BASE_URL } from './Src/Configs/ApiConfig';
import RingtoneManager from './Src/Components/Calling/RingtoneManager';
import {
  acceptCallFromNotification,
  declineCallFromNotification,
  ensureAcceptedCallReady,
  getPendingCall,
  getPendingCallSync,
  clearPendingCall,
  claimLaunchCallHandling,
  markCallAcceptedSync,
  markCallRejectedSync,
  openActiveCallScreen,
  openIncomingCallScreen,
  openIncomingCallScreenIfActive,
  openIncomingCallFromNotificationTap,
  prepareIncomingCall,
  claimNotificationAction,
  wasRecentlyAccepted,
  wasRecentlyRejected,
  wasCallEndedRecently,
  invalidateIncomingCall,
  isIncomingCallStillActive,
  isTerminalCallStatus,
  normalizeIncomingCallPayload,
} from './Src/Utils/callAcceptFlow';
import { navigationRef } from './Navigation/RootNavigation';
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
import { useAppTheme } from './Src/Hook/useAppTheme';

// Module-level guard: survives hot reload (unlike React refs)
let __bootstrapInitialHandled = false;

const Main = () => {
  const { colors, isDark } = useAppTheme();
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

  // Ref for deep link handler so Firebase [] useEffect can access latest version
  const handleDeepLinkRef = useRef(null);

  // Reset persisted call state on fresh app launch
  useEffect(() => {
    dispatch(toggleCallAccepted({ status: false }));
  }, []);

  // Android CallStyle Accept/Reject events (also wired from index for kill mode).
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    return wireIncomingCallStyleEvents();
  }, []);

  // Initialize iOS VoIP / CallKit + Notifee Accept/Decline category once
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    let cleanup;
    try {
      IncomingCallService.configure();
      // Persist VoIP token + upload so backend can send PushKit wakes (not only FCM).
      cleanup = IncomingCallService.registerVoipPushes(async voipToken => {
        if (!voipToken) return;
        console.log('[IncomingCallService] VoIP token registered', String(voipToken).slice(0, 12) + '...');
        dispatch(updateApnToken({ token: voipToken }));
        try {
          await AsyncStorage.setItem('fahdu_voip_token', String(voipToken));
        } catch (_) {}

        const authToken = tokenRef.current;
        if (!authToken) {
          console.log('[IncomingCallService] VoIP token saved locally — will upload after auth ready');
          return;
        }
        try {
          await axios.post(
            `${BASE_URL}/api/notification/preserve/token`,
            {
              token: voipToken,
              apnToken: voipToken,
              type: 'voip',
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`,
              },
              timeout: 10000,
            },
          );
          console.log('✅ [IncomingCallService] VoIP/APNs token uploaded to backend');
        } catch (err) {
          console.warn(
            '[IncomingCallService] VoIP token upload failed:',
            err?.response?.data || err?.message || err,
          );
        }
      });
      ensureIncomingCallNotificationCategory().catch(() => {});
      console.log('[IncomingCallService] iOS incoming call service initialized');
    } catch (error) {
      console.warn('[IncomingCallService] initialization failed:', error?.message || error);
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [dispatch]);

  // Re-upload VoIP token once user auth token is available (register may fire before login).
  useEffect(() => {
    if (Platform.OS !== 'ios' || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const voipToken =
          (await AsyncStorage.getItem('fahdu_voip_token')) || undefined;
        if (!voipToken || cancelled) return;
        await axios.post(
          `${BASE_URL}/api/notification/preserve/token`,
          {
            token: voipToken,
            apnToken: voipToken,
            type: 'voip',
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            timeout: 10000,
          },
        );
        console.log('✅ [IncomingCallService] VoIP token re-uploaded after auth');
      } catch (err) {
        console.warn('[IncomingCallService] VoIP re-upload skipped:', err?.message || err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Settle any stuck calls on cold start (handles force-quit scenarios)
  const hasSettledRef = useRef(false);
  const pendingCallDataRef = useRef(null);

  const handlePendingCallStartup = useCallback(async (callData) => {
    if (!callData?.roomId) return;

    // Prefer Notifee killed-state action — Accept must never open IncomingCall.
    let initialActionId = null;
    let initialCallInfo = null;
    try {
      const initialNotification = await notifee.getInitialNotification();
      initialActionId =
        initialNotification?.pressAction?.id ||
        initialNotification?.notification?.pressAction?.id;
      initialCallInfo = initialNotification?.notification?.data;
    } catch (e) {
      console.warn('[Main:Startup] getInitialNotification failed:', e?.message || e);
    }

    if (
      initialActionId === 'accept_call' &&
      (initialCallInfo?.roomId || callData.roomId)
    ) {
      const info = initialCallInfo?.roomId ? initialCallInfo : callData;
      console.log('📱 [Main:Startup] Accept action on launch — joining call directly');
      markCallAcceptedSync(info);
      dispatch(toggleCallAccepted({ status: true }));
      // ALWAYS open CallScreen — claimLaunch used to set navigateNow:false and Accept looked broken.
      claimLaunchCallHandling();
      await acceptCallFromNotification(info, { navigateNow: true });
      return;
    }

    if (initialActionId === 'decline_call' && (initialCallInfo?.roomId || callData.roomId)) {
      const info = initialCallInfo?.roomId ? initialCallInfo : callData;
      console.log('📱 [Main:Startup] Decline action on launch — rejecting call');
      markCallRejectedSync(info);
      await declineCallFromNotification(info, { dismissUi: false });
      return;
    }

    const syncPending = getPendingCallSync() || callData;
    const status =
      syncPending.status ||
      (syncPending.callAccepted ? 'ACCEPTED' : 'PENDING');

    if (isTerminalCallStatus(status) || wasRecentlyRejected(syncPending)) {
      // If Reject was stamped but API never completed, retry so caller side cuts.
      if (status === 'REJECTED' && !syncPending.apiDone) {
        console.log('📱 [Main:Startup] Rejected pending without apiDone — retrying reject API');
        await declineCallFromNotification(syncPending, { dismissUi: false });
      } else {
        // Keep ENDED stamp for stale notification taps — do not wipe to PENDING-capable empty.
        console.log('📱 [Main:Startup] Ignoring resolved pending call with status:', status);
        await invalidateIncomingCall(syncPending, status || 'ENDED');
      }
      return;
    }

    if (
      status === 'ACCEPTED' ||
      syncPending.callAccepted ||
      wasRecentlyAccepted(syncPending)
    ) {
      console.log('📱 [Main:Startup] Call was accepted via notification action, routing directly to call screen');
      await ensureAcceptedCallReady(syncPending);
      dispatch(toggleCallAccepted({ status: true }));
      claimLaunchCallHandling();
      openActiveCallScreen(syncPending);
      await clearPendingCall();
      return;
    }

    // Explicit notification-driven startup only — never revive stale PENDING UI.
    console.log('📱 [Main:Startup] No accept/reject intent — clear if ended, skip auto IncomingCall');
    const stillActive = await isIncomingCallStillActive(syncPending);
    if (!stillActive) {
      await invalidateIncomingCall(syncPending, 'ENDED');
    }
  }, [dispatch]);

  // Tracks which pending/notification call we already routed (avoid double open on token re-render).
  const handledLaunchCallKeyRef = useRef(null);

  useEffect(() => {
    const settleCallOnStartup = async () => {
      if (hasSettledRef.current) return;
      hasSettledRef.current = true;

      // Never settle over an active/accepted/rejected ringing call.
      // ENDED stamps are kept for stale-notification guard and must not block settle.
      const pending = getPendingCallSync() || (await getPendingCall());
      if (pending?.status === 'ACCEPTED' || pending?.callAccepted) {
        console.log('🔄 [Settle] Skipping settle — pending accepted call exists');
        return;
      }
      if (pending?.status === 'REJECTED') {
        console.log('🔄 [Settle] Skipping settle — pending rejected call exists');
        return;
      }
      if (pending?.status === 'PENDING') {
        console.log('🔄 [Settle] Skipping settle — incoming/pending call exists');
        return;
      }
      if (pending && (wasRecentlyAccepted(pending) || wasRecentlyRejected(pending))) {
        return;
      }
      if (!token) return;

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
  }, [token]);

  useEffect(() => {
    /**
     * Cold start / killed-state recovery:
     * 1) pendingCall from FCM background (PENDING) → IncomingCall
     * 2) notification Accept/Reject/body tap via Notifee initial notification
     * Must NOT wait for token to show IncomingCall (CALL_SCREENS allow it).
     */
    const checkPendingCallOnStartup = async () => {
      try {
        // CRITICAL: read notification action BEFORE opening from pending PENDING.
        // Reject/Accept can race with a leftover PENDING stamp and wrongly open IncomingCall.
        let initialNotification = null;
        try {
          initialNotification = await notifee.getInitialNotification();
        } catch (_) {}

        const actionId =
          initialNotification?.pressAction?.id ||
          initialNotification?.notification?.pressAction?.id ||
          null;
        const callInfo = initialNotification?.notification?.data;
        const notifType = callInfo?.type;
        const isCallNotif =
          !!callInfo?.roomId &&
          (!notifType || notifType === 'incoming_call' || notifType === 'call');

        if (isCallNotif && actionId === 'decline_call') {
          const launchKey = `notif:${callInfo.callId || callInfo.roomId}:decline_call`;
          if (handledLaunchCallKeyRef.current === launchKey) return;
          handledLaunchCallKeyRef.current = launchKey;
          console.log('📱 [Main:Startup] Initial notif Reject — declining (no IncomingCall)');
          markCallRejectedSync(callInfo);
          if (Platform.OS === 'ios') {
            try {
              await IncomingCallService.dismissCallKit();
            } catch (_) {}
          }
          await declineCallFromNotification(callInfo, { dismissUi: false });
          return;
        }

        if (isCallNotif && actionId === 'accept_call') {
          const launchKey = `notif:${callInfo.callId || callInfo.roomId}:accept_call`;
          if (handledLaunchCallKeyRef.current === launchKey) return;
          handledLaunchCallKeyRef.current = launchKey;
          console.log('📱 [Main:Startup] Initial notif Accept — joining call');
          await handlePendingCallStartup({ ...callInfo, status: 'ACCEPTED', callAccepted: true });
          return;
        }

        if (isCallNotif && (!actionId || actionId === 'default')) {
          const launchKey = `notif:${callInfo.callId || callInfo.roomId}:default`;
          if (handledLaunchCallKeyRef.current === launchKey) return;
          handledLaunchCallKeyRef.current = launchKey;
          // Explicit user tap — open IncomingCall (do NOT wait on participant-status API).
          console.log('📱 [Main:Startup] Initial notif body tap — open IncomingCall');
          openIncomingCallFromNotificationTap(callInfo);
          return;
        }

        const callData = getPendingCallSync() || (await getPendingCall());
        if (callData?.roomId) {
          const launchKey = `pending:${callData.callId || callData.roomId}:${callData.status || 'PENDING'}`;
          if (handledLaunchCallKeyRef.current === launchKey) {
            return;
          }

          console.log('📱 [Main:Startup] Found pending call on launch:', callData);
          pendingCallDataRef.current = callData;

          const status = callData.status || (callData.callAccepted ? 'ACCEPTED' : 'PENDING');

          const hardEndedStartup = [
            'REJECTED',
            'ENDED',
            'CANCELLED',
            'CANCELED',
            'MISSED',
            'COMPLETED',
          ].includes(String(status).toUpperCase());
          // Do not treat UNAVAILABLE/IDLE as ended — that cancelled Accept/Reject notifs.
          if (hardEndedStartup) {
            handledLaunchCallKeyRef.current = launchKey;
            pendingCallDataRef.current = null;
            console.log('📱 [Main:Startup] Pending call already ended:', status);
            await invalidateIncomingCall(callData, status);
            return;
          }

          // Leftover PENDING after kill-mode: do NOT auto-open IncomingCall.
          // Also do NOT invalidate here — that raced CallStyle body-tap consume
          // and stamped ENDED before IncomingCall could open.
          if (status === 'PENDING' || (!callData.callAccepted && status !== 'ACCEPTED' && status !== 'REJECTED')) {
            handledLaunchCallKeyRef.current = launchKey;
            pendingCallDataRef.current = null;
            console.log('📱 [Main:Startup] PENDING leftover — leave stamp, wait for notif tap');
            return;
          }

          // ACCEPTED / REJECTED need token for API retry; if missing, keep for login effect.
          if (!token) {
            return;
          }

          handledLaunchCallKeyRef.current = launchKey;
          pendingCallDataRef.current = null;
          await handlePendingCallStartup(callData);
        }
      } catch (error) {
        console.error('❌ [Main:Startup] Error processing pending call startup check:', error);
      }
    };

    checkPendingCallOnStartup();
  }, [token, handlePendingCallStartup]);

  useEffect(() => {
    const tryPendingCallAfterLogin = async () => {
      if (!token || !pendingCallDataRef.current) return;
      const callData = pendingCallDataRef.current;
      pendingCallDataRef.current = null;
      // Do NOT clear pending before handling — ACCEPTED intent must survive.
      await handlePendingCallStartup(callData);
    };

    tryPendingCallAfterLogin();
  }, [token, handlePendingCallStartup]);

  // Resume: consume CallStyle body/accept tap that happened while React was paused.
  // Do NOT stop ringtone on background — BG must keep ringing via native MediaPlayer.
  useEffect(() => {
    const onAppStateChange = nextState => {
      if (nextState !== 'active') return;

      // Drain native pending open_incoming_call / accept_call from notification tap.
      if (Platform.OS === 'android') {
        try {
          const { consumePendingCallStyleAction } = require('./Src/Services/IncomingCallStyle');
          consumePendingCallStyleAction().catch(() => {});
        } catch (_) {}
      }

      if (!token) return;

      const pending = getPendingCallSync();
      if (!pending?.roomId) return;

      const pendingHardEnded =
        pending.status &&
        ['REJECTED', 'ENDED', 'CANCELLED', 'CANCELED', 'MISSED', 'COMPLETED'].includes(
          String(pending.status).toUpperCase(),
        );
      if (
        pendingHardEnded ||
        (pending.callId && wasRecentlyRejected(pending) && wasCallEndedRecently(pending))
      ) {
        invalidateIncomingCall(pending, pending.status || 'ENDED');
        return;
      }

      if (
        pending.status === 'ACCEPTED' ||
        pending.callAccepted ||
        wasRecentlyAccepted(pending)
      ) {
        dispatch(toggleCallAccepted({ status: true }));
        acceptCallFromNotification(pending, { navigateNow: true });
        return;
      }

      if (pending.status === 'PENDING') {
        console.log('📱 [Main:AppState] PENDING on resume — leave notif, wait for tap consume');
      }
    };

    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, [token, dispatch]);

  // Unified incoming call handler to prevent duplicates (Socket vs FCM)
  // Uses callId from backend (same across Socket & FCM) for reliable deduplication
  const handleIncomingCall = useCallback((rawCallData, source) => {
    const callData =
      normalizeIncomingCallPayload(rawCallData) ||
      normalizeIncomingCallPayload(rawCallData?.content);
    const roomId = callData?.roomId;
    if (!roomId) {
      console.warn(`🚨 [Main:IncomingCall] missing roomId from ${source}`, rawCallData);
      return;
    }

    const callId = callData?.callId;

    console.log(`\n==========================================`);
    console.log(`📞 [Main:IncomingCall] Incoming from ${source}`);
    console.log(`📞 [Main:IncomingCall] RoomID: ${roomId}, CallID: ${callId}`);
    console.log(`📞 [Main:IncomingCall] AppState: ${AppState.currentState}`);
    console.log(`📞 [Main:IncomingCall] Current Processed IDs: ${JSON.stringify(processedRoomIdsRef.current)}`);

    // Only block the SAME call session (callId). Never block the next call in the same room.
    if (callId && (wasRecentlyAccepted(callData) || wasRecentlyRejected(callData))) {
      console.log(`🚨 [Main:IncomingCall] BLOCKED: already accepted/rejected callId ${callId}`);
      console.log(`==========================================\n`);
      return;
    }

    const pendingNow = getPendingCallSync();
    const sameCallSession =
      !!pendingNow?.roomId &&
      String(pendingNow.roomId) === String(roomId) &&
      !!callId &&
      !!pendingNow.callId &&
      String(pendingNow.callId) === String(callId);
    if (
      sameCallSession &&
      (pendingNow.status === 'ACCEPTED' ||
        pendingNow.callAccepted ||
        pendingNow.status === 'REJECTED')
    ) {
      console.log(`🚨 [Main:IncomingCall] BLOCKED: pending already ${pendingNow.status} for same callId`);
      console.log(`==========================================\n`);
      return;
    }

    // active + inactive = user can see the app (shade pull is inactive — still open screen).
    const isFg = AppState.currentState !== 'background';
    const alreadyProcessed = !!(callId && processedRoomIdsRef.current.includes(callId));

    // Dedup: if we already handled this callId for BG notif, still upgrade to IncomingCall when FG.
    if (alreadyProcessed && !isFg) {
      console.log(`🚨 [Main:IncomingCall] BLOCKED: Duplicate BG event from ${source} for callId ${callId}`);
      console.log(`==========================================\n`);
      return;
    }
    if (alreadyProcessed && isFg) {
      try {
        if (navigationRef.isReady()) {
          const route = navigationRef.getCurrentRoute();
          if (
            route?.name === 'incomingCall' &&
            String(route?.params?.roomId || '') === String(roomId)
          ) {
            console.log(`🚨 [Main:IncomingCall] Already on IncomingCall — skip`);
            console.log(`==========================================\n`);
            return;
          }
        }
      } catch (_) {}
      console.log(`✅ [Main:IncomingCall] Upgrade prior BG handle → open IncomingCall (${source})`);
    }

    if (callId && !alreadyProcessed) {
      dispatch(markRoomAsProcessed(callId));
    } else if (!callId) {
      console.log(`⚠️ [Main:IncomingCall] No callId from backend — skipping dedup`);
    }

    console.log(`✅ [Main:IncomingCall] ALLOWED: Processing incoming call from ${source}`);

    // Reset stale Accept/Reject guards for this chat so IncomingCall always shows.
    prepareIncomingCall(callData);

    const notifPayload = {
      roomId,
      callType: callData?.callType || 'audio',
      senderId: callData?.callerId || callData?.senderId,
      callerId: callData?.callerId || callData?.senderId,
      displayName: callData?.name || callData?.displayName,
      name: callData?.name || callData?.displayName,
      profileImage: callData?.profileImageurl || callData?.profileImage || callData?.profile_image,
      profileImageUrl: callData?.profileImageurl || callData?.profileImage || callData?.profile_image,
      callId,
    };

    if (Platform.OS === 'ios') {
      console.log(
        '📱 [Main:IncomingCall] iOS',
        isFg ? 'FG → IncomingCall only' : 'BG → CallKit/Notifee',
      );
      // BUG_11: foreground = in-app screen only (no duplicate notification).
      IncomingCallService.showIncomingCall(callData, { showNotifee: !isFg }).catch(err => {
        console.warn('[Main:IncomingCall] IncomingCallService failed:', err?.message || err);
        openIncomingCallScreen(callData);
        if (!isFg) {
          showIncomingCallNotification(notifPayload).catch(() => {});
        }
      });
      return;
    }

    // Android FG: in-app IncomingCall (Accept/Reject) + ringtone — audio & video.
    // No CallStyle shade while using the app (avoids double UI).
    const appVisible = AppState.currentState === 'active' || AppState.currentState === 'inactive';
    const openInAppUi = source === 'SOCKET' || source === 'FCM' || appVisible;

    if (openInAppUi && AppState.currentState !== 'background') {
      console.log(
        '📱 [Main:IncomingCall] Android FG → IncomingCall + ringtone',
        source,
        notifPayload.callType,
      );
      try {
        RingtoneManager.clearIncomingSuppress();
      } catch (_) {}
      try {
        const { setAndroidInAppIncomingUi, stopAndroidRingtoneAndDismiss } = require('./Src/Services/IncomingCallStyle');
        setAndroidInAppIncomingUi(true);
        stopAndroidRingtoneAndDismiss(roomId).catch(() => {});
      } catch (_) {}
      try {
        cancelIncomingCallNotification(roomId, { stopRingtone: false }).catch(() => {});
      } catch (_) {}

      prepareIncomingCall(callData);
      openIncomingCallScreen(callData);
      setTimeout(() => {
        RingtoneManager.playIncoming().catch(() => {});
      }, 350);
      setTimeout(() => {
        try {
          if (navigationRef.isReady()) {
            const route = navigationRef.getCurrentRoute()?.name;
            if (route !== 'incomingCall' && route !== 'callScreen' && route !== 'videoCallScreen') {
              console.log('📱 [Main:IncomingCall] FG retry open IncomingCall');
              openIncomingCallScreen(callData);
              RingtoneManager.playIncoming().catch(() => {});
            }
          }
        } catch (_) {}
      }, 1000);
      return;
    }

    // Android BG/kill: ONE CallStyle (Decline + Answer only) + ring — audio & video.
    console.log(
      '📱 [Main:IncomingCall] Android BG → CallStyle notification',
      notifPayload.callType,
    );
    try {
      RingtoneManager.clearIncomingSuppress();
    } catch (_) {}
    showIncomingCallNotification(notifPayload, { force: true, playRingtone: true })
      .then(shown => {
        console.log(`🚀 [Main:IncomingCall] CallStyle shown=${shown} type=${notifPayload.callType} from ${source}`);
      })
      .catch(err => {
        console.warn('[Main:IncomingCall] showIncomingCallNotification failed:', err?.message || err);
      });
  }, [dispatch]);

  const handleIncomingCallRef = useRef(handleIncomingCall);
  useEffect(() => {
    handleIncomingCallRef.current = handleIncomingCall;
  }, [handleIncomingCall]);

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
        RingtoneManager.stopAndSuppress();
        dispatch(toggleCallAccepted({ status: false }));
        if (data?.callId) dispatch(clearProcessedRoomId(data.callId));
        invalidateIncomingCall(data, 'UNAVAILABLE');
        navigate('home');
        LoginPageErrors('User not receiving the call');
      };

      const onCreatorLiveStarted = data => {
        AppLog('STREAM', 'Follower seen Creator started live signal', data);
      };

      const onCallRejected = data => {
        console.log(':::::::::::::::::::call_rejected:::::::::', data?.by, currentUserId, Platform.OS);
        AppLog('SOCKET_CALL', 'Received call_rejected event (Detailed)', data);
        RingtoneManager.stopAndSuppress();
        if (currentUserId !== data?.by) {
          dispatch(toggleCallAccepted({ status: false }));
          if (data?.callId) dispatch(clearProcessedRoomId(data.callId));
          invalidateIncomingCall(data, 'REJECTED');
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
        RingtoneManager.stopAndSuppress();
        dispatch(toggleCallAccepted({ status: false }));
        if (data?.callId) dispatch(clearProcessedRoomId(data.callId));
        invalidateIncomingCall(data, 'DISCONNECTED');
        navigate('home');
      };

      const onSocketDisconnectCloseApp = data => {
        console.log(':::::::::::socket_disconnect_close_app:::::::::', data);
        AppLog('SOCKET_CALL', 'Other side swiped-closed app (socket signal)', data);
        RingtoneManager.stopAndSuppress();
        dispatch(toggleCallAccepted({ status: false }));
        if (data?.callId) dispatch(clearProcessedRoomId(data.callId));
        // BUG_10: stamp ended so Accept shows "Creator is no longer available".
        invalidateIncomingCall(data, 'FORCE_CLOSED');
        setDisconnectModalVisible(true);
      };

      const onIncomingCaller = data => {
        AppLog('INCOMING_SOCKET_CALL', 'Received incoming_caller via socket (Detailed)', data);
        // Pass full payload — normalizeIncomingCallPayload parses string/nested content.
        handleIncomingCallRef.current(data, 'SOCKET');
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

  // Keep the ref updated whenever handleDeepLink changes
  useEffect(() => { handleDeepLinkRef.current = handleDeepLink; }, [handleDeepLink]);

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
      // Guard: only handle the initial (killed-state) notification once
      if (__bootstrapInitialHandled) {
        console.log('📌 [Bootstrap] Already handled initial notification, skipping');
        return;
      }
      __bootstrapInitialHandled = true;

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
        console.log('📌 [Bootstrap] Subscription notification tapped from killed state');
        const link = initialNotification?.notification?.data?.link;
        if (link) {
          console.log('📌 [Bootstrap] Navigating via deep link:', link);
          handleDeepLink(link);
        } else {
          console.log('📌 [Bootstrap] No link found in subscription notification data');
        }
      } else if (initialNotification?.notification?.data?.type === 'call_request') {
        console.log('📌 [Bootstrap] Call request notification tapped from killed state');
        try {
          navigate('CallRequests', { activeTab: 'pending' });
        } catch (e) {
          console.log('Error navigating to CallRequests on bootstrap (call_request)', e?.message);
        }
      } else if (initialNotification?.notification?.data?.type === 'incoming_call' || initialNotification?.notification?.data?.type === 'call') {
        console.log('📌 [Bootstrap] Incoming call notification tapped from killed state');
        const callInfo = initialNotification?.notification?.data;
        const actionId = initialNotification?.pressAction?.id || initialNotification?.notification?.pressAction?.id;

        if (actionId === 'accept_call') {
          // Accept once from the notification action — do not open IncomingCall again.
          console.log('📌 [Bootstrap] Incoming call accept action detected; joining call directly');
          try {
            markCallAcceptedSync(callInfo);
            dispatch(toggleCallAccepted({ status: true }));
            claimLaunchCallHandling();
            await acceptCallFromNotification(callInfo, { navigateNow: true });
          } catch (e) {
            console.log('Error accepting call on bootstrap', e?.message);
          }
        } else if (actionId === 'decline_call') {
          // App may still cold-start if full-screen intent was already up — reject API only.
          console.log('📌 [Bootstrap] Incoming call decline action detected; rejecting call');
          markCallRejectedSync(callInfo);
          await declineCallFromNotification(callInfo, { dismissUi: false });
        } else {
          // Body tap / full-screen — still join if Accept already stamped, else IncomingCall.
          const pending = getPendingCallSync();
          const callRef = callInfo || pending;
          if (
            pending?.roomId === callInfo?.roomId &&
            (pending.status === 'ACCEPTED' || pending.callAccepted || wasRecentlyAccepted(callRef))
          ) {
            try {
              claimLaunchCallHandling();
              dispatch(toggleCallAccepted({ status: true }));
              await acceptCallFromNotification(callInfo || pending, { navigateNow: true });
            } catch (e) {
              console.log('Error joining accepted call on bootstrap body tap', e?.message);
            }
          } else if (
            wasRecentlyRejected(callRef) ||
            isTerminalCallStatus(pending?.status)
          ) {
            await invalidateIncomingCall(callRef || callInfo, pending?.status || 'ENDED');
          } else {
            try {
              console.log('📌 [Bootstrap] Opening IncomingCall from notification body tap');
              openIncomingCallFromNotificationTap(callInfo);
            } catch (e) {
              console.log('Error navigating to incomingCall on bootstrap', e?.message);
            }
          }
        }
      } else if (initialNotification?.notification?.data?.type === 'others') {
        console.log('📌 [Bootstrap] Others notification tapped from killed state');
        const link = initialNotification?.notification?.data?.link;
        if (link) {
          console.log('📌 [Bootstrap] Navigating via deep link:', link);
          handleDeepLink(link);
        } else {
          console.log('📌 [Bootstrap] No link found in others notification data');
        }
      } else if (initialNotification?.notification?.data?.type === 'mention') {
        const link = initialNotification?.notification?.data?.link;
        const postId = link?.split('post/')?.[1]?.split('?')?.[0];
        if (postId) {
          navigate('sharedPost', {postId});
        }
      }
    }
  }

  // Bootstrap on notification click (Notifee)
  useEffect(() => {
    bootstrap();
  }, [doUserClickedOnForeGroundNotification]);

  // Handle native Firebase notification taps (when OS displayed notification via notification key)
  // This covers the case where the app was killed and background handler never fired,
  // so no Notifee notification was created — only the native OS notification exists.
  // IMPORTANT: Must run on mount ([]) — not [token] — so getFirebaseInitialNotification
  // fires before the system consumes the initial notification.
  useEffect(() => {
    // Helper to parse Firebase notification data and navigate
    const handleFirebaseNotificationTap = (remoteMessage) => {
      console.log('📌 [Main:Firebase] Native notification tapped:', remoteMessage);
      if (!remoteMessage?.data?.payload) return;

      try {
        const parsed = JSON.parse(remoteMessage.data.payload);
        const type = parsed?.type;
        const content = parsed?.content;

        if (type === 'message' && content?.roomId) {
          navigate('Chats', {
            chatRoomId: content.roomId,
            name: content.username,
            profileImageUrl: content.profile_image,
          });
        } else if (type === 'livestream') {
          joinLiveStreamWithNotificationHandler({ notification: { data: { roomId: content?.roomId } } }, tokenRef.current);
        } else if (type === 'call_reminder' && content?.roomId) {
          navigate('Chats', {
            chatRoomId: content.roomId,
            name: content.username,
            profileImageUrl: content.profile_image,
          });
        } else if (type === 'call' || type === 'incoming_call') {
          console.log('📌 [Main:Firebase] Incoming call notification tapped from native notification');
          const pending = getPendingCallSync();
          const callRef = content || pending;
          const alreadyAccepted =
            content?.callAccepted ||
            wasRecentlyAccepted(callRef) ||
            (pending?.roomId === content?.roomId &&
              (pending.status === 'ACCEPTED' || pending.callAccepted));
          if (alreadyAccepted) {
            dispatch(toggleCallAccepted({ status: true }));
            acceptCallFromNotification(content || pending, { navigateNow: true });
          } else if (
            wasRecentlyRejected(callRef) ||
            wasCallEndedRecently(callRef) ||
            isTerminalCallStatus(pending?.status)
          ) {
            invalidateIncomingCall(callRef || content, pending?.status || 'ENDED');
          } else {
            // Explicit OS notification body tap — open IncomingCall immediately.
            openIncomingCallFromNotificationTap(content);
          }
        } else if (type === 'call_accepted' || type === 'call_request_accepted') {
          navigate('CallRequests', { activeTab: 'scheduled' });
        } else if (type === 'call_request') {
          console.log('📌 [Main:Firebase] Call request notification tapped');
          navigate('CallRequests', { activeTab: 'pending' });
        } else if (type === 'mention') {
          const link = content?.link || content?.misc?.link;
          const postId = link?.split('post/')?.[1]?.split('?')?.[0];
          if (postId) navigate('sharedPost', { postId });
        } else if (type === 'subscription' || type === 'others') {
          // Navigate directly instead of Linking.openURL (which fails during cold start)
          const link = content?.misc?.link || content?.link;
          if (link && handleDeepLinkRef.current) {
            console.log('📌 [Main:Firebase] Navigating subscription/others via deep link:', link);
            handleDeepLinkRef.current(link);
          }
        } else {
          // Fallback: if any notification has a link, navigate via deep link handler
          const link = content?.misc?.link || content?.link;
          if (link && handleDeepLinkRef.current) {
            console.log('📌 [Main:Firebase] Navigating fallback via deep link:', link);
            handleDeepLinkRef.current(link);
          }
        }
      } catch (e) {
        console.log('⚠️ [Main:Firebase] Error handling notification tap:', e?.message);
      }
    };

    // App was in background and user tapped native notification
    const unsubscribe = onNotificationOpenedApp(getMessaging(), handleFirebaseNotificationTap);

    // App was killed and user tapped native notification to open it
    getFirebaseInitialNotification(getMessaging()).then(remoteMessage => {
      if (remoteMessage) {
        console.log('📌 [Main:Firebase] App opened from killed state via native notification');
        handleFirebaseNotificationTap(remoteMessage);
      }
    });

    return unsubscribe;
  }, []);

  // Foreground notification handler
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      console.log('EVENb', type, detail);

      // Handle notification press
      if (type === EventType.PRESS) {
        console.log('Notification pressed:', detail);

        const notificationType = detail?.notification?.data?.type;
        const notificationData = detail?.notification?.data;

        // Handle message notification (normal messages + tips)
        if (notificationType === 'message') {
          console.log('Message notification pressed');
          try {
            navigate('Chats', {
              chatRoomId: notificationData?.roomId,
              name: notificationData?.userName,
              profileImageUrl: notificationData?.profile_image,
            });
          } catch (e) {
            console.log('Error navigating to Chats on foreground press', e?.message);
          }
        }

        // Handle livestream notification
        else if (notificationType === 'livestream') {
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
          try {
            navigate('CallRequests', { activeTab: 'pending' });
          } catch (e) {
            console.log('Error navigating to CallRequests on foreground press', e?.message);
          }
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

        else if (notificationType === 'incoming_call' || notificationType === 'call') {
          console.log('📌 [Main:onForegroundEvent] Incoming call notification body pressed');
          if (!claimNotificationAction('body_tap', notificationData)) return;
          if (
            wasRecentlyRejected(notificationData) ||
            wasCallEndedRecently(notificationData) ||
            isTerminalCallStatus(getPendingCallSync()?.status)
          ) {
            await invalidateIncomingCall(notificationData, 'ENDED');
          } else if (
            wasRecentlyAccepted(notificationData) ||
            getPendingCallSync()?.status === 'ACCEPTED'
          ) {
            dispatch(toggleCallAccepted({ status: true }));
            await acceptCallFromNotification(notificationData, { navigateNow: true });
          } else {
            openIncomingCallFromNotificationTap(notificationData);
          }
        }

      }

      // Handle notification action press
      else if (type === EventType.ACTION_PRESS) {
        const pressActionId = detail?.pressAction?.id;
        const callData = detail?.notification?.data;
        console.log(`📌 [Main:onForegroundEvent] ACTION_PRESS - actionId: ${pressActionId}`, callData);

        if (pressActionId === 'accept_call' && callData?.roomId) {
          if (!claimNotificationAction('accept_call', callData)) return;
          markCallAcceptedSync(callData);
          dispatch(toggleCallAccepted({ status: true }));
          const result = await acceptCallFromNotification(callData, { navigateNow: true });
          if (detail?.notification?.id) {
            await notifee.cancelNotification(detail.notification.id);
          }
          try {
            await notifee.cancelNotification('incoming_call_' + callData.roomId);
          } catch (_) {}
          try {
            const { stopAndroidRingtoneAndDismiss } = require('./Src/Services/IncomingCallStyle');
            await stopAndroidRingtoneAndDismiss(callData.roomId);
          } catch (_) {}
          if (!result?.success) {
            console.log('❌ [Main:onForegroundEvent] Accept API failed (still attempted join):', result?.error);
          }
        } else if (pressActionId === 'decline_call' && callData?.roomId) {
          if (!claimNotificationAction('decline_call', callData)) return;
          markCallRejectedSync(callData);
          // dismissUi false: Reject must not force navigation/home; intent closes IncomingCall if open.
          const result = await declineCallFromNotification(callData, { dismissUi: false });
          if (!result.success) {
            console.log('❌ [Main:onForegroundEvent] Reject API failed:', result.error);
          }
          if (detail?.notification?.id) {
            await notifee.cancelNotification(detail.notification.id);
          }
          try {
            await notifee.cancelNotification('incoming_call_' + callData.roomId);
          } catch (_) {}
          try {
            const { cancelAndroidCallStyleNotification } = require('./Src/Services/IncomingCallStyle');
            await cancelAndroidCallStyleNotification(callData.roomId);
          } catch (_) {}
        }

      // Handle notification dismissal
      } else if (type === EventType.DISMISSED) {
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

      let remoteNotificationData;
      try {
        if (msg?.data?.payload) {
          remoteNotificationData = JSON.parse(msg.data.payload);
        } else if (msg?.data?.type === 'call' || msg?.data?.type === 'incoming_call') {
          // Flat FCM (no payload wrapper) — still handle FG IncomingCall.
          const contentRaw = msg.data.content;
          let content = msg.data;
          if (typeof contentRaw === 'string' && contentRaw.startsWith('{')) {
            try {
              content = JSON.parse(contentRaw);
            } catch (_) {}
          }
          remoteNotificationData = { type: msg.data.type, content };
        } else {
          console.log('No payload found, skipping message');
          return;
        }
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
      } else if (remoteNotificationData?.type === 'call') {
        const callContent = remoteNotificationData?.content || remoteNotificationData;
        console.log('📱 [Main:FCM] Incoming call', callContent?.roomId || callContent?.room_id, callContent?.callId);
        // Pass full FCM payload so string/nested content normalizes correctly.
        handleIncomingCallRef.current(remoteNotificationData, 'FCM');
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
      } else if (
        remoteNotificationData?.type === 'call_rejected' ||
        remoteNotificationData?.type === 'call_unavailable' ||
        remoteNotificationData?.type === 'call_cancelled' ||
        remoteNotificationData?.type === 'call_canceled'
      ) {
        const ended = remoteNotificationData?.content || remoteNotificationData;
        // Clears Notifee + Android CallStyle + iOS CallKit.
        await invalidateIncomingCall(
          ended,
          remoteNotificationData?.type === 'call_unavailable' ? 'UNAVAILABLE' : 'REJECTED',
        );
      } else if (remoteNotificationData?.type === 'call_completed') {
        console.log(remoteNotificationData, ':::::');
        AppLog('FCM_CALL', 'Received call_completed via FCM (silent trigger)');
        const ended = remoteNotificationData?.content || remoteNotificationData;
        await invalidateIncomingCall(ended, 'ENDED');
        await showCallRelatedNotification(remoteNotificationData);
      } else if (remoteNotificationData?.type === 'fcm_disconnect_close_app') {
        // Handle swipe-close/disconnect from other side via FCM
        AppLog('FCM_CALL', 'Other side swiped-closed app (FCM signal)', remoteNotificationData);
        RingtoneManager.stopAndSuppress();
        dispatch(toggleCallAccepted({ status: false }));
        const callContent = remoteNotificationData?.content;
        if (callContent?.callId) dispatch(clearProcessedRoomId(callContent.callId));
        await invalidateIncomingCall(callContent || remoteNotificationData, 'FORCE_CLOSED');
        navigate('home');
      } else if (remoteNotificationData?.type === 'call_disconnected') {
        // General disconnect via FCM
        AppLog('FCM_CALL', 'Received call_disconnected via FCM', remoteNotificationData);
        RingtoneManager.stopAndSuppress();
        dispatch(toggleCallAccepted({ status: false }));
        const callContent = remoteNotificationData?.content;
        if (callContent?.callId) dispatch(clearProcessedRoomId(callContent.callId));
        await invalidateIncomingCall(callContent || remoteNotificationData, 'DISCONNECTED');
        navigate('home');
      } else if (remoteNotificationData?.type === 'missed_call') {
        console.log(remoteNotificationData, ':::::');
        const ended = remoteNotificationData?.content || remoteNotificationData;
        await invalidateIncomingCall(ended, 'MISSED');
        await showCallRelatedNotification(remoteNotificationData);
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
      <StatusBar backgroundColor={isDark ? '#0D0D0D' : '#FFFFFF'} barStyle={isDark ? 'light-content' : 'dark-content'} />
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
