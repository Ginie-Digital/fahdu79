import {
  StyleSheet,
  AppState,
  StatusBar,
  Platform,
  View,
  Linking,
  Alert,
} from 'react-native';
import React, {useCallback, useRef, useState} from 'react';
import StackNavigation from './Navigation/StackNavigation';
import {useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import socketServcies from './SocketServices';
import messaging, {firebase} from '@react-native-firebase/messaging';
import {
  onDisplayNotification,
  displayChatNotification,
  showPostInteractionNotification,
  liveStreamNotification,
  showOthersCategoryNotification,
  showSubscriptionNotification,
} from './Notificaton';
import {
  enableNotificationModal,
  resetAllModal,
  toggleEmailVerificationModal,
  toggleNewMessageRecieved,
} from './Redux/Slices/NormalSlices/HideShowSlice';
import {
  authLogout,
  currentUserInformation,
  token as memoizedToken,
} from './Redux/Slices/NormalSlices/AuthSlice';
import {useSendFcmTokenMutation} from './Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';

import notifee from '@notifee/react-native';

// import notifee, {EventType} from '@notifee/react-native';

import axios from 'axios';
import {navigate} from './Navigation/RootNavigation';
import {screens} from './DesiginData/Data';
import {
  removeRoomList,
  updateCacheRoomList,
} from './Redux/Slices/NormalSlices/RoomListSlice';
import {
  emptyUnreadRoomList,
  pushUnReadRoomIds,
} from './Redux/Slices/NormalSlices/UnReadThreadSlice';
import {useFocusEffect} from '@react-navigation/native';
import {LoginPageErrors, OnlineSnack} from './Src/Components/ErrorSnacks';
import {deleteCachedMessages} from './Redux/Slices/NormalSlices/MessageSlices/ThreadSlices';

import DeviceInfo, {getVersion} from 'react-native-device-info';
import {setUpdateStatus} from './Redux/Slices/NormalSlices/HasAppUpdatedSlice';
import {resetAll} from './Redux/Actions';

// import SplashScreen from "react-native-splash-screen";
import {
  pushChats,
  pushGoals,
  removeGoals,
  setMuteState,
  setToAnimate,
  setViewers,
  updateGoals,
} from './Redux/Slices/NormalSlices/LiveStream/LiveChats';
import FlashMessage from 'react-native-flash-message';
import {checkApplicationPermission} from './Permissions';
import {deleteCredentials} from './Redux/Slices/NormalSlices/TempCredentials';
import {
  extractUserIdFromUrl,
  extractUserNameAndroid,
  extractUsernameFromDeepLink,
  isVersionGreaterOrEqual,
  joinLivestream,
} from './DesiginData/Utility';
import {setRefferalLink} from './Redux/Slices/NormalSlices/Deeplink/DeeplinkSlice';
import {
  setCallbackId,
  setCallCallback,
  setCallData,
} from './Redux/Slices/NormalSlices/Call/CallSlice';
import {addCallback} from './Redux/socketCallbacks';
import AlertBox from './Src/AlertBox';
import ReLoginModal from './Src/Screens/LoginSignup/ReLoginModal';
// import CallKeepService from '../../service/CallKeepService';

import CallKeepService from './service/CallKeepService';

// import StarterLottie from "./Src/Screens/StarterLottie";

const Main = () => {
  const currentUserId = useSelector(state => state.auth.user.currentUserId);

  const token = useSelector(state => state.auth.user.token);
  const [sendFcmToken] = useSendFcmTokenMutation();
  const dispatch = useDispatch();
  const [showLottie, setShowLottie] = useState(false);
  const currentChatRoomId = useSelector(
    state => state.chatWindowCurrentChattingRoom.data.roomId,
  );
  const doUpdate = useSelector(state => state.hasAppUpdated.app.updated);
  const doUserClickedOnForeGroundNotification = useSelector(
    state => state.hideShow.visibility.notificationClick,
  );
  const hasHandledInitialLink = useRef(false);

  const doUserLoggedIn = useSelector(state => state.auth.user.token);

  const isNotificationFromQuitState = useSelector(
    state => state.call.data.fromNotification,
  );

  useEffect(() => {
    // Listen for app state changes to handle navigation from a killed state
    const appStateSubscription = AppState.addEventListener(
      'change',
      CallKeepService.handleAppStateChange,
    );

    // Alert.alert('fuk');
    return () => {
      // Clean up listeners
      appStateSubscription.remove();
      // callManager.removeAllListeners();
    };
  }, []);

  // useEffect(() => {
  //   console.log('666666666666666666::::::::::::::::::6666666666::::::(((((99999');

  //   const subscription = AppState.addEventListener('change', nextState => {
  //     if (nextState === 'active') {
  //       console.log('666666666666666666::::::::::::::::::6666666666');
  //       Alert.alert('fuklc');
  //       CallKeepService.setupCallKeep(); // Only initialize in foreground
  //     }
  //   });
  //   return () => subscription.remove();
  // }, []);

  useEffect(() => {
    console.log('Rendered Socket');
    if (currentUserId !== undefined) {
      socketServcies.initializeSocket(currentUserId, token);

      socketServcies.on('notification', data => {
        if (data?.dm > 0) {
          dispatch(toggleNewMessageRecieved());
        }
      });

      socketServcies.on('livestream_chat', data => {
        console.log('::::::::::::::LIVESTREAM CHAT:::::::::::::', data);

        dispatch(pushChats({chat: data}));
      });

      socketServcies.on('livestream_tip', data => {
        console.log('::::::::::::::::::LIVE_STREAM_TIP::::::::::::::', data);

        dispatch(pushChats({chat: data}));
      });

      socketServcies.on('new_goal', data => {
        console.log('::::::::::::NEW_GOAL_UPDATE::::::::::::', data);

        dispatch(pushGoals({goals: data}));
      });

      socketServcies.on('tipped_goal', data => {
        console.log('::::::::::::::::::::TIPPED_GOAL:::::::::', data);

        dispatch(updateGoals({data}));
      });

      socketServcies.on('viewers', data => {
        console.log(':::::::::::::::::::viewers:::::::::', data);
        dispatch(setViewers({viewers: data}));
      });

      socketServcies.on('completed_goal', data => {
        console.log(
          '::::::::::::::::::::::::::COMPLETED_GOAL::::::::::::',
          data,
        );
        dispatch(removeGoals({data}));
        dispatch(pushChats({chat: {...data, type: 'completed'}}));
        dispatch(setToAnimate({toAnimate: true}));
      });

      socketServcies.on('livestream_join', data => {
        console.log(
          '::::::::::::::::::::::::::NEW_USER_JOIN::::::::::::',
          data,
        );
        dispatch(pushChats({chat: {...data, type: 'new_user'}}));
      });

      socketServcies.on('livestream_mute', data => {
        console.log(':::::::::::::::::::livestream_mute:::::::::', data);
        dispatch(setMuteState({data}));
      });

      socketServcies.on('call', (data, callback) => {
        console.log(':::::::::::::::::::calling:::::::::', data);
        // LOG  :::::::::::::::::::calling::::::::: {"callType": "audio", "engagement": {"createdBy": {"_id": "67ac4216ce51846c5df2d155", "displayName": "kanchu_0210", "profile_image": [Object], "role": "creator"}}, "roomId": "67fdffb402f40aeb676108ad"}

        const transformCallData = data => {
          const createdBy = data.engagement.createdBy;

          return {
            callType: data.callType,
            channel: 'call',
            createdAt: new Date().toISOString(), // Current timestamp
            hasAttachment: false,
            profile_image:
              createdBy?.profile_image?.url ??
              'https://fahdu-bucket.s3.us-east-1.amazonaws.com/assets/default-avatar-profile-icon-1.jpg',
            roomId: data.roomId,
            sender_id: createdBy._id,
            sender_role: createdBy.role,
            subtitle:
              data.callType === 'audio' ? '📞 Audio Call' : '📹 Video Call',
            title: `${createdBy.displayName} is calling you`,
            username: createdBy.displayName,
          };
        };

        dispatch(
          setCallData({
            data: transformCallData(data),
            receivedAt: Date.now().toString(),
            fromNotification: false,
          }),
        );

        // dispatch(setCallCallback(() => callback));

        if (!isNotificationFromQuitState) {
          const callbackId = `cb_${Date.now()}`;
          addCallback(callbackId, callback);
          dispatch(setCallbackId(callbackId));
          navigate('incomingCall', {data, callbackId});
        }
      });

      socketServcies.on('call_join', data => {
        console.log(':::::::::::::::::::call_join:::::::::', data);
        Alert.alert('join');
      });

      socketServcies.on('call_ended', data => {
        console.log(':::::::::::::::::::call_left:::::::::', data);
        Alert.alert('leave');
      });
    }
  }, [currentUserId, token]);

  const data = useSelector(state => state.credentials.user);

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

  const handleCall = () => {
    console.log('xxx');
    CallKeepService.showIncomingCall('user_12345', 'Rishabh');
  };

  const loginUser = async (email, password) => {
    try {
      const {data} = await axios.post(
        'https://api.fahdu.com/api/user/signin',

        {email, password},
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
        dispatch(toggleEmailVerificationModal({show: false}));

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

  useEffect(() => {
    const handleDeepLink = async url => {
      console.log('GETTING LINK:', url);

      try {
        if (!url) {
          console.log('No URL found');
          return;
        }

        // Directly use the URL without resolving it
        const parts = url.split('/');
        const lastEmail = parts.pop();

        // Compare the email and log in if it matches
        if (data.email === lastEmail) {
          await loginUser(data.email, data.password);
        } else {
          console.log('Not a new user to auto-login');

          const match = url.match(/\/post\/([^/]+)/);

          console.log({match});

          if (doUserLoggedIn) {
            if (match) {
              const postId = match[1]; // '12345'
              console.log('Post ID:', postId);

              navigate('sharedPost', {postId});
            } else {
              //android and ios both get different links

              let userName =
                Platform.OS === 'android'
                  ? extractUserNameAndroid(url)
                  : extractUserNameAndroid(url);

              let userId = extractUserIdFromUrl(url);

              console.log('USERNAME', userId);

              dispatch(setRefferalLink({link: userName}));

              // navigate('othersProfile', {
              //   userName: userName,
              //   userId: userId,
              //   role: 'creator',
              // });
            }
          }
        }
      } catch (error) {
        console.error('Error handling deep link:', error);
      }
    };

    try {
      if (Platform.OS === 'ios') {
        // 🔹 Handle cold start for iOS
        Linking.getInitialURL()
          .then(url => {
            console.log(url, '}}}}');
            if (url) {
              if (String(url).split('/').length === 4) {
                Linking.openURL(url);
              } else {
                handleDeepLink(url);
              }
            } else {
              console.log('No initial URL found');
            }
          })
          .catch(error => {
            console.error('Error getting initial URL:', error);
          });
      } else {
        // 🔹 Handle cold start for Android using Firebase Dynamic Links
        dynamicLinks()
          .getInitialLink()
          .then(link => {
            if (link?.url) {
              console.log('Deep link on cold start:', link.url);
              handleDeepLink(link.url);
            } else {
              console.log('No initial URL found');
            }
          })
          .catch(error => {
            console.error('Error getting initial link:', error);
          });
      }
    } catch (e) {
      console.log('DDEEEEP', e);
    }

    // 🔹 Handle deep links while the app is running (Android & iOS)
    const linkingSubscription = Linking.addEventListener('url', ({url}) => {
      handleDeepLink(url);
    });

    // Cleanup event listeners
    return () => {
      linkingSubscription.remove();
      firebaseSubscription();
    };
  }, [data.email, data.password, doUserLoggedIn, currentUserId]);

  useEffect(() => {
    if (currentUserId !== undefined) {
      const notificationToken = async () => {
        if (Platform.OS === 'android') {
          await messaging().registerDeviceForRemoteMessages();
        }

        const fcmToken = await messaging().getToken();
        return fcmToken;
      };
      notificationToken().then(async e => {
        console.log('user notificatoin id', e);
        sendFcmToken({token, fcmToken: e}).then(e => {
          if (e?.error?.status === 401) {
            dispatch(authLogout());
            dispatch(deleteCachedMessages());
            dispatch(removeRoomList());
            dispatch(emptyUnreadRoomList());
          }
        });
      });
    }
  }, [currentUserId]);

  const joinLiveStreamWithNotificationHandler = async (detail, token) => {
    const joinStreamApi = await joinLivestream(
      token,
      detail?.notification?.data?.roomId,
    );

    console.log(joinStreamApi, 'joinStreamAPi');

    if (joinStreamApi?.statusCode === 200) {
      console.log('liveJOINDATA', data?.data?.data);

      navigate('confirmlivestreamjoin', {
        data: joinStreamApi?.data,
        roomId: detail?.notification?.data?.roomId,
      });
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

    // Alert.alert('hdleoo');

    console.log(initialNotification, 'XOOOO');

    if (initialNotification) {
      console.log('Notification caused application to open');

      if (initialNotification?.notification?.data?.type === 'message') {
        try {
          navigate('Chats', {
            chatRoomId: initialNotification?.notification?.data?.roomId,
            name: initialNotification?.notification?.data?.userName,
            profileImageUrl:
              initialNotification?.notification?.android?.largeIcon,
          });
        } catch (e) {
          console.log('Error on MainJS', e?.message);
        }
      } else if (
        initialNotification?.notification?.data?.type === 'livestream'
      ) {
        await joinLiveStreamWithNotificationHandler(initialNotification, token);
      } else {
        console.log('NOTHING_MATCHED');
      }

      if (initialNotification?.notification?.data?.type === 'subscription') {
        console.log('LUCK');

        Linking.openURL(initialNotification?.notification?.data?.link);
      }
    }
  }

  useEffect(() => {
    bootstrap();
  }, [doUserClickedOnForeGroundNotification]);

  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(async ({type, detail}) => {
      if (type === EventType.PRESS) {
        console.log('Got token from notification:', detail);

        if (detail?.notification?.data?.type === 'livestream') {
          await joinLiveStreamWithNotificationHandler(detail, token);
        }

        if (detail?.notification?.data?.type === 'subscription') {
          console.log('LUCK');

          if (type === EventType.PRESS && detail?.notification?.data?.link) {
            Linking.openURL(detail.notification.data.link);
          }
        }
      }
    });

    return () => {
      // ✅ Important cleanup
      unsubscribe();
    };
  }, [token]);

  // useFocusEffect(
  //   useCallback(() => {
  //     const onMessageReceived = async msg => {
  //       console.log(msg);

  //       if (msg?.data?.type === 'incoming_call') {
  //         Alert.alert('Incoming cal');
  //       }

  //       let remoteNotificationData = JSON.parse(msg?.data?.payload);

  //       if (remoteNotificationData?.type === 'message') {
  //         dispatch(
  //           updateCacheRoomList({
  //             chatRoomId: remoteNotificationData?.content?.roomId,
  //             createdAt: remoteNotificationData?.content?.createdAt,
  //             message: remoteNotificationData?.content?.hasAttachment ? '' : remoteNotificationData?.content?.message,
  //             hasAttachment: remoteNotificationData?.content?.hasAttachment,
  //             senderId: remoteNotificationData?.content?.sender_id,
  //             profileImage: remoteNotificationData?.content?.profile_image,
  //             userName: remoteNotificationData?.content?.username,
  //             role: remoteNotificationData?.content?.sender_role,
  //           }),
  //         );

  //         console.log('808080', remoteNotificationData, '::');

  //         dispatch(pushUnReadRoomIds({chatRoomId: remoteNotificationData?.content?.roomId}));

  //         if (currentChatRoomId !== remoteNotificationData?.content?.roomId) {
  //           onDisplayNotification(remoteNotificationData?.content);
  //         }
  //       } else if (remoteNotificationData?.type === 'livestream') {
  //         // Alert.alert("fuck")

  //         await liveStreamNotification(remoteNotificationData?.content);
  //       } else if (remoteNotificationData?.type === 'others') {
  //         await showOthersCategoryNotification(remoteNotificationData);
  //       } else if (remoteNotificationData?.type === 'subscription') {
  //         await showSubscriptionNotification(remoteNotificationData);
  //       } else {
  //         showPostInteractionNotification(remoteNotificationData);
  //       }
  //     };

  //     let unsubscribe = firebase.messaging().onMessage(onMessageReceived);

  //     return () => {
  //       unsubscribe();
  //     };
  //   }, [currentChatRoomId]),
  // );

  useFocusEffect(
    useCallback(() => {
      const onMessageReceived = async msg => {
        console.log(msg);

        // Handle incoming call type directly
        if (msg?.data?.type === 'incoming_call') {
          // Alert.alert('Incoming call');
          handleCall();
          return; // stop further processing
        }

        // ✅ Proceed only if payload exists
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
          dispatch(
            updateCacheRoomList({
              chatRoomId: remoteNotificationData?.content?.roomId,
              createdAt: remoteNotificationData?.content?.createdAt,
              message: remoteNotificationData?.content?.hasAttachment
                ? ''
                : remoteNotificationData?.content?.message,
              hasAttachment: remoteNotificationData?.content?.hasAttachment,
              senderId: remoteNotificationData?.content?.sender_id,
              profileImage: remoteNotificationData?.content?.profile_image,
              userName: remoteNotificationData?.content?.username,
              role: remoteNotificationData?.content?.sender_role,
            }),
          );

          console.log('808080', remoteNotificationData, '::');

          dispatch(
            pushUnReadRoomIds({
              chatRoomId: remoteNotificationData?.content?.roomId,
            }),
          );

          if (currentChatRoomId !== remoteNotificationData?.content?.roomId) {
            onDisplayNotification(remoteNotificationData?.content);
          }
        } else if (remoteNotificationData?.type === 'livestream') {
          await liveStreamNotification(remoteNotificationData?.content);
        } else if (remoteNotificationData?.type === 'others') {
          await showOthersCategoryNotification(remoteNotificationData);
        } else if (remoteNotificationData?.type === 'subscription') {
          await showSubscriptionNotification(remoteNotificationData);
        } else {
          showPostInteractionNotification(remoteNotificationData);
        }
      };

      const unsubscribe = firebase.messaging().onMessage(onMessageReceived);

      return () => {
        unsubscribe();
      };
    }, [currentChatRoomId]),
  );

  useEffect(() => {
    // Handle cold-start link only once
    if (!hasHandledInitialLink.current) {
      Linking.getInitialURL().then(url => {
        if (url) {
          handleDeepLink(url);
          hasHandledInitialLink.current = true; // mark as handled
        }
      });
    }

    // Listen for links when app is open
    const subscription = Linking.addEventListener('url', ({url}) => {
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, []);

  function getQueryParams(url) {
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
  }

  // function handleDeepLink(url) {
  //   if (!url) return;

  //   const route = url.replace('https://link.fahdu.com/go/', '');

  //   // PROFILE handler
  //   if (route.startsWith('profile')) {
  //     const params = getQueryParams(url);
  //     const id = params.id;
  //     const username = route.split('/')[1]?.split('?')[0];

  //     if (currentUserId === id) {
  //       navigate('profile');
  //     } else {
  //       navigate('othersProfile', {
  //         userName: username,
  //         userId: id,
  //         role: 'creator',
  //       });
  //     }
  //     return; // stop here
  //   }

  //   // POST handler
  //   if (route.startsWith('post')) {
  //     const postId = route.split('/')[1]?.split('?')[0];
  //     if (postId) {
  //       navigate('sharedPost', {postId});
  //     }
  //     return; // stop here
  //   }

  //   console.log('Unrecognized deep link:', route);
  // }

  function handleDeepLink(url) {
    if (!url) return;

    let route = url;

    // Handle both prefixes
    if (route.startsWith('https://link.fahdu.com/go/')) {
      route = route.replace('https://link.fahdu.com/go/', '');
    } else if (route.startsWith('exp+fahdu://')) {
      route = route.replace('exp+fahdu://', '');
    }

    // PROFILE handler
    if (route.startsWith('profile')) {
      const params = getQueryParams(url);
      const id = params.id;
      const username = route.split('/')[1]?.split('?')[0];

      if (currentUserId === id) {
        navigate('profile');
      } else {
        dispatch(setRefferalLink({link: username}));

        if (doUserLoggedIn) {
          navigate('othersProfile', {
            userName: username,
            userId: id,
            role: 'creator',
          });
        }
      }
      return;
    }

    // POST handler
    if (route.startsWith('post')) {
      const postId = route.split('/')[1]?.split('?')[0];
      if (postId) {
        navigate('sharedPost', {postId});
      }
      return; // stop here
    }

    console.log('Unrecognized deep link:', route);
  }

  return (
    <View style={styles.SafeAreaViewStyle}>
      <StatusBar backgroundColor={'#fff'} barStyle={'dark-content'} />
      <AlertBox description={'hello there'} type={true} />
      <StackNavigation />
      <FlashMessage position="top" />
      <ReLoginModal />
    </View>
  );
};

export default Main;

const styles = StyleSheet.create({
  SafeAreaViewStyle: {
    flex: 1,
  },
});
