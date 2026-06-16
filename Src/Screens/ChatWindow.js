import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Button, FlatList, Keyboard, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, ToastAndroid, View } from 'react-native';
import { useFocusEffect as useFocusEffectNav } from '@react-navigation/native';

import { useGetInitialChatsQuery, useGetLatestChatQuery, useLazyGetInitialChatsQuery, useLazyGetLatestChatQuery, useLazyGetOldChatsQuery, useSetSeenToServerMutation } from '../../Redux/Slices/QuerySlices/roomListSliceApi';

import { responsiveWidth } from 'react-native-responsive-dimensions';
import { LeftChatBubble, RightChatBubble } from '../Components/ChatWindowComponents/ChatWindowElements';

import { useSendMessageMutation } from '../../Redux/Slices/QuerySlices/roomListSliceApi';
import { useHeaderHeight } from '@react-navigation/elements';

import { useSelector, useDispatch } from 'react-redux';
import { userIdCreateSelector } from '../../Redux/Slices/NormalSlices/AuthSlice';

import { deleteCachedMessages, pushSentMessageResponse, saveThread, updateThread } from '../../Redux/Slices/NormalSlices/MessageSlices/ThreadSlices';

import ChatWindowInput from '../Components/ChatWindowComponents/ChatWindowInput';
import ChatWindowClipModal from '../Components/ChatWindowComponents/ChatWindowClipModal';
import ChatWindowPreviewModal from '../Components/ChatWindowComponents/ChatWindowPreviewModal';
import ChatWindowVideoModal from '../Components/ChatWindowComponents/ChatWindowVideoModal';
import { setChatWindowSenderUserDetails } from '../../Redux/Slices/NormalSlices/MessageSlices/ChatWindowSenderDetailSlice';
import ChatWindowPaymentModal from '../Components/ChatWindowComponents/ChatWindowPaymentModal';
import ChatWindowFullSizedImageModal from '../Components/ChatWindowComponents/ChatWindowFullSizedImageModal';
import { setClickedNotification, setUnReadChatIcon, toggleCallRequestModal, toggleNewMessageRecieved, toggleShowBankDetailsModal, toggleShowRechargeModal, updateOnlineStatus } from '../../Redux/Slices/NormalSlices/HideShowSlice';
import { useFocusEffect, useIsFocused, useRoute } from '@react-navigation/native';
import ChatWindowInformationModal from '../Components/ChatWindowComponents/ChatWindowInformationModal';

import { setCurrentScreen, setsecondUser } from '../../Redux/Slices/NormalSlices/SecondUserSlice';
import { screens } from '../../DesiginData/Data';
import { removeRoomList, resetUnreadCount, updateCacheRoomList } from '../../Redux/Slices/NormalSlices/RoomListSlice';

//For Logging out user when not authorized via server;
import { authLogout } from '../../Redux/Slices/NormalSlices/AuthSlice';
import { emptyUnreadRoomList, removeRoomIds } from '../../Redux/Slices/NormalSlices/UnReadThreadSlice';
import { saveFeeDetails } from '../../Redux/Slices/NormalSlices/MessageSlices/ChatWindowFeeDetailsSlice';
import { setCurrentChattingRoom, resetCurrentChattingRoom } from '../../Redux/Slices/NormalSlices/MessageSlices/ChatWindowCurrentChattingRoom';

import { ChatWindowError, ChatWindowFollowError, LoginPageErrors } from '../Components/ErrorSnacks';
import { signOutGoogle } from '../../OAuth';
import { useFollowUserMutation, useLazyCallTriesStatusQuery, useLazyOnlineStatusQuery, useUnFollowUserMutation } from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { soundObj } from '../../Sound';
import { autoLogout } from '../../AutoLogout';
import MediaLoadingModal from '../Components/ChatWindowComponents/MediaLoadingModal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WIDTH_SIZES } from '../../DesiginData/Utility';
import ChatWindowFeeSetup from '../Components/ChatWindowComponents/ChatWindowFeeSetup';
import ChatWindowLabelModal from '../Components/ChatWindowLabelModal';
import CallRequestModal from '../Components/ChatWindowComponents/CallRequestModal';
import CallPricesModal from '../Components/ChatWindowComponents/CallPricesModal';
import TimeRequestModal from '../Components/Calling/TimeRequestModal';
import LowBalanceModal from '../Components/LowBalanceModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import socketServices from '../../SocketServices';
import TypingIndicator from '../Components/ChatWindowComponents/TypingIndicator';

const Loader = () => {
  return (
    <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
      <ActivityIndicator color={'#282828'} size={'large'} />
    </View>
  );
};

let timer;

const ChatWindow = ({ route, navigation }) => {
  const messageInputRef = useRef(null);
  const headerHeight = useHeaderHeight();

  // ── Android manual keyboard height tracking ──
  // With adjustNothing, Android does nothing when the keyboard opens.
  // We manually track keyboard height and apply it as paddingBottom.
  // This gives identical behavior across all OEMs (Xiaomi, OnePlus, Nothing, etc.)
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showListener = Keyboard.addListener('keyboardDidShow', (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });

    const hideListener = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  // Reset keyboard height when navigating away to prevent stale padding
  useFocusEffectNav(
    useCallback(() => {
      return () => {
        if (Platform.OS === 'android') {
          keyboardHeight.setValue(0);
        }
      };
    }, []),
  );

  const flatlistThreadListRef = useRef();

  //!<!--------------States Start>

  const [shouldSkip, setShouldSkip] = useState(true);

  const [loading, setLoading] = useState(false);

  const [fullVideoModalUri, setFullVideoModalUri] = useState(null);

  //!<!-------------States Finish>

  const { chatRoomId, name, profileImageUrl, role, id, label } = route.params.params || route.params;

  const chatThreadFromCache = useSelector(state => state.thread.threadStore[chatRoomId]);

  const token = useSelector(state => state.auth.user.token);

  const currentUserId = useSelector(state => state.auth.user.currentUserId);

  console.log('CurrentUserId', currentUserId, 'OtherUserId', id, Platform.OS, role);

  const [setSeenToServer] = useSetSeenToServerMutation();

  const newMessageStatus = useSelector(state => state.hideShow.visibility.newMessageRecieved);

  const [fullSizeImageUrl, setFullSizeImageUri] = useState(undefined);

  const [disableSendButton, setDisableSendButton] = useState(false);

  const [loadingMessage, setLoadingMessage] = useState(false);

  const [updatedOnlineStatus, setUpdatedOnlineStatus] = useState(false);

  //pagination

  const [currentPage, setCurrentPage] = useState(1);

  const [totalPages, setTotalPages] = useState(1);

  const [isMounted, setIsMounted] = useState(false);

  const [followUser] = useFollowUserMutation();

  const [unFollowUser] = useUnFollowUserMutation();

  const [getInitialChats] = useLazyGetInitialChatsQuery();



  const [isOldChatsFinished, setIsOldChatsFinished] = useState(false);

  const [callTriesStatus] = useLazyCallTriesStatusQuery();

  const [doRaisedRequest, setDoRaisedRequest] = useState({});

  const [onlineStatus] = useLazyOnlineStatusQuery();

  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);

  async function userStatusHandler() {
    try {
      const response = await onlineStatus({ token, displayName: name });

      if (response.data?.statusCode === 200) {
        if (response?.data?.data?.status === 'online') {
          setUpdatedOnlineStatus(true);
          dispatch(updateOnlineStatus({ onlineStatus: true }));
        } else {
          setUpdatedOnlineStatus(false);
          dispatch(updateOnlineStatus({ onlineStatus: false }));
        }
      }
    } catch (error) {
      console.error('Error fetching user status:', error);
    }
  }
  useEffect(() => {
    userStatusHandler();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoadingMessage(true);
    }, [route, navigation]),
  );

  useFocusEffect(
    useCallback(() => {
      dispatch(setsecondUser({ role }));
    }, [role]),
  );



  console.log('RoooooomId', chatRoomId);

  useEffect(() => {
    async function fetchCallStatus() {
      const { data, error } = await callTriesStatus({ token, roomId: chatRoomId });

      console.log(data, '::OPPO');

      if (data?.success) {
        const { hasCallRequest, callTries, availability, type, initiator } = data?.data;

        setDoRaisedRequest({ hasCallRequest, callTries, availability, type, initiator });

        dispatch(toggleCallRequestModal({ show: true }));
      }

      // console.log(data, error, 'opopop');

      // if (data) {
      //   console.log('Data', data?.data?.initiator, currentUserId);

      //   // LOG  Data {"data": {"callTries": 1, "initiatedAt": "2025-06-02T10:31:49.607Z", "initiator": "67fde0e702f40aeb67610439", "type": "VIDEO"}, "message": "Call request found", "statusCode": 200}
      //   setCallTriesData(data?.data);

      //   if (data?.data?.callTries > -1 && data?.data?.callTries < 3 && data?.data?.initiator !== currentUserId) {
      //     dispatch(toggleCallRequestModal({show: true}));
      //   }
      // }

      // if (error) {
      //   console.log('Error', error);
      // }
    }

    fetchCallStatus();
  }, [token, chatRoomId]);


  useFocusEffect(
    useCallback(() => {
      // Screen focused
      socketServices.emit('join_room', {
        roomId: chatRoomId,
        userId: currentUserId,
      });

      socketServices.on('user_typing', () => {
        setIsOtherUserTyping(true);
      });

      socketServices.on('user_stop_typing', () => {
        setIsOtherUserTyping(false);
      });

      return () => {
        socketServices.emitStopTyping(chatRoomId, currentUserId);
        socketServices.off('user_typing');
        socketServices.off('user_stop_typing');
      };
    }, [chatRoomId, currentUserId]),
  );

  // !<!---------Use Queries------------>

  const { data: responseDataServerThreads, isSuccess: isSuccessServerThreads, isFetching: isFetchingServerThreads, error: errorServerThreads } = useGetInitialChatsQuery({ token, chatRoomId, page: currentPage }, { skip: shouldSkip });

  //todo:-> aut key values jo abhi use nai hue hai wo iss liye rakha hai taaki baad mein use karr saku
  const [trigger, { error: errorLatestMessage }] = useLazyGetLatestChatQuery();

  const [sendMessage] = useSendMessageMutation();

  const arr = Object.assign([]);
  let arr2 = Object.assign([]);

  const onChangeText = useCallback(value => (messageInputRef.current = value), []);

  const onButtonSendButtonClick = useCallback(
    dispatch => {
      const messageContent = messageInputRef.current?.trim();

      if (!messageContent) {
        console.log('🟡 [ChatWindow] Blocked empty message send attempt');
        return;
      }

      setDisableSendButton(true);

      const attachment = {
        url: '',
        type: '',
        format: '',
        is_charagble: false,
        charge_amount: 0,
        paid_by_reciever: false,
        preview: '',
      };

      sendMessage({ token, message: messageContent, roomId: chatRoomId, attachment })
        .then(async e => {
          if (e?.data?.statusCode === 200) {
            setDisableSendButton(false);
            messageInputRef.current = '';
            arr.push(e.data.data);
            dispatch(pushSentMessageResponse({ chatRoomId, sentMessageResponse: arr?.shift() }));

            // ✅ Update cache with current online status from state
            dispatch(
              updateCacheRoomList({
                chatRoomId,
                createdAt: e?.data?.data?.createdAt,
                message: e?.data?.data?.message,
                hasAttachment: false,
                senderId: e?.data?.data?.sender?._id,
                recipientId: route.params?.id,
                userName: route.params?.name,
                profileImage: route.params?.profileImageUrl,
                role: route.params?.role,
                onlineStatus: updatedOnlineStatus,
                unreadCount: 0,
              }),
            );

            try {
              if (soundObj) {
                soundObj.replayAsync();
              }
            } catch (playError) {
              console.log('🔊 [ChatWindow:SendMessage] Sound Play Error:', playError);
            }
          } else if (e?.error?.data?.status_code === 2044) {
            console.log('Status Code not 200');
            autoLogout();
            ChatWindowError('Please Login Again');
            await signOutGoogle();
          } else {
            console.log('🔴 [ChatWindow:SendMessage] Error Response:', JSON.stringify(e, null, 2));
            console.log('🔴 [ChatWindow:SendMessage] RoomID:', chatRoomId);
            console.log('🔴 [ChatWindow:SendMessage] Token Exists:', !!token);

            const errorData = e?.error?.data;
            const errorStatus = e?.error?.status;
            const errorMessage = errorData?.message || errorData?.errorMessage;

            if (errorStatus === 403 || errorData?.status_code === 403 || errorMessage?.toLowerCase()?.includes('blocked')) {
              ChatWindowError(errorMessage || 'Unable to send message');
            } else if (errorMessage?.search('Follow') >= 0) {
              LoginPageErrors(errorMessage);
            } else if (errorMessage?.search('insufficient') >= 0) {
              dispatch(toggleShowRechargeModal({ show: true }));
            } else {
              // Detailed logging and informative feedback for "Can't reach server" cases
              if (errorStatus === 'FETCH_ERROR') {
                 console.log('🌐 [ChatWindow:SendMessage] FETCH_ERROR detected - checking network...');
                 ChatWindowError("Can't reach server. Please check your internet.");
              } else if (errorStatus === 'TIMEOUT_ERROR') {
                 console.log('⏱️ [ChatWindow:SendMessage] TIMEOUT_ERROR detected');
                 ChatWindowError("Request timed out. Please try again.");
              } else if (errorMessage) {
                 console.log('📝 [ChatWindow:SendMessage] Validation or Server Error:', errorMessage);
                 ChatWindowError(errorMessage);
              } else {
                 console.log('❓ [ChatWindow:SendMessage] Generic Error:', errorStatus, errorMessage);
                 ChatWindowError("Can't reach server");
              }
            }
            setDisableSendButton(false);
          }
        })
        .catch(error => {
          console.log('❌ [ChatWindow:SendMessage] Promise Catch:', error);
          ChatWindowError("Something went wrong");
          setDisableSendButton(false);
        });
    },
    [navigation, route, updatedOnlineStatus],
  );

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setCurrentChattingRoom({ chatRoomId }));

    dispatch(setChatWindowSenderUserDetails({ name: name, profileImageUrl: profileImageUrl, role, id }));

    return () => {
      // Clear current chatting room when leaving — this allows message
      // notifications for this room to show again in the foreground
      dispatch(resetCurrentChattingRoom());
    };
  }, [route, navigation]);

  const __id = useMemo(() => {
    console.log(chatThreadFromCache?.messages[chatThreadFromCache?.messages?.length - 1]?._id, 'memoized__id');

    return chatThreadFromCache?.messages[chatThreadFromCache?.messages?.length - 1]?._id;
  }, [chatThreadFromCache?.messages]);

  // Keep a ref in sync so fetches always use the latest __id without being a dependency
  const __idRef = useRef(__id);
  useEffect(() => {
    __idRef.current = __id;
  }, [__id]);

  useFocusEffect(
    useCallback(() => {
      //remove unRead From RoomList
      dispatch(removeRoomIds({ chatRoomId }));

      if (!chatThreadFromCache) {
        setShouldSkip(false);

        setLoading(true);

        if (isSuccessServerThreads) {
          dispatch(saveThread({ chatRoomId, threadDetails: responseDataServerThreads }));
          dispatch(saveFeeDetails({ chatRoomId, feeDetails: responseDataServerThreads?.feeDetails }));
          setLoading(false);
        }

        if (errorServerThreads) {
          // console.log(red(`Fetching Error @ChatWindow : LN 91, `), );

          if (errorServerThreads?.data?.status_code === 2044) {
            console.log('Fetch chat 2044');
            dispatch(authLogout());
            dispatch(deleteCachedMessages());
            dispatch(removeRoomList());
            dispatch(emptyUnreadRoomList());
          }
        }
      } else {
        console.log('elese block');

        console.log(__id, 'CHATID');
        async function fetchFreshLatestChats(token, chatRoomId) {
          const { data: responseLatestMessage } = await trigger({ token, chatRoomId, _id: __id }, false);

          if (responseLatestMessage?.messages?.length > 0) {
            console.log('There are some message');

            setLoadingMessage(false);

            arr2.push(responseLatestMessage?.messages);

            dispatch(updateThread({ chatRoomId, newMessage: arr2.shift() }));

            let latestMessage = responseLatestMessage?.messages?.at(-1);

            dispatch(updateCacheRoomList({ chatRoomId, createdAt: latestMessage?.createdAt, message: latestMessage?.message, hasAttachment: latestMessage?.attachment?.url === '' ? false : true, senderId: latestMessage?.sender_id, userName: name, profileImage: profileImageUrl, role: role })); //To Sort Chat RoomList
          } else {
            console.log('No new message found !');
            setLoadingMessage(false);
          }

          setSeenToServer({ token, roomId: chatRoomId })
            .then(s => {
              dispatch(resetUnreadCount({ chatRoomId }));
              // Check if there are still unread messages in other rooms
              // The icon will be updated in the ChatRoom screen when user navigates there
            })
            .catch(e => console.log('There was error in setting seen to server', e));
        }

        fetchFreshLatestChats(token, chatRoomId).then(() => setLoading(false));

        if (errorLatestMessage) {
          if (errorLatestMessage?.data?.status_code === 2044) {
            dispatch(authLogout());
            dispatch(deleteCachedMessages());
            dispatch(removeRoomList());
            dispatch(emptyUnreadRoomList());
            dispatch(removeRoomList());
            ChatWindowError('Please Login Again');
            signOutGoogle();
          }
        }
      }
    }, [chatThreadFromCache, isFetchingServerThreads, isSuccessServerThreads, errorServerThreads, route, navigation, __id]),
  );

  function fetchFreshLatestChats(token, chatRoomId) {
    const currentId = __idRef.current;
    trigger({ token, chatRoomId, _id: currentId }, false)
      .then(responseLatestMessage => {
        if (responseLatestMessage?.data?.messages?.length > 0) {
          if (responseLatestMessage?.data?.messages[0]._id !== currentId) {
            dispatch(updateThread({ chatRoomId, newMessage: responseLatestMessage?.data?.messages }));
            let latestMessage = responseLatestMessage?.data?.messages?.at(-1);
            dispatch(updateCacheRoomList({ chatRoomId, createdAt: latestMessage?.createdAt, message: latestMessage?.message, hasAttachment: latestMessage?.attachment?.url === '' ? false : true, senderId: responseLatestMessage?.data?.messages[0]?.sender_id, userName: name, profileImage: profileImageUrl, role: role }));
          } else console.log('Encountered same.');
        }
        setSeenToServer({ token, roomId: chatRoomId });
      })
      .catch(e => {
        console.log('Error While fetching latest message', e);
        ChatWindowError(e?.message);
      });
  }

  useEffect(() => {
    // Skip the initial mount (counter is 0)
    if (newMessageStatus > 0) {
      fetchFreshLatestChats(token, chatRoomId);
    }
  }, [newMessageStatus]);

  useEffect(() => {
    dispatch(setClickedNotification({ click: false }));
  }, [route, navigation]);

  const endReached = useCallback(() => {
    // ✅ Add more strict conditions
    if (!chatThreadFromCache?.messages || chatThreadFromCache.messages.length < 10) {
      console.log('Not enough messages to paginate yet');
      setIsOldChatsFinished(true);
      return;
    }

    // ✅ Prevent multiple rapid calls
    if (loading || isFetchingServerThreads) {
      console.log('Already loading, skipping pagination');
      return;
    }

    // ✅ Check if already at the end
    if (currentPage >= totalPages && totalPages !== 1) {
      console.log('Already fetched all pages');
      setIsOldChatsFinished(true);
      return;
    }

    clearTimeout(timer);

    timer = setTimeout(() => {
      console.log(`Fetching page ${currentPage + 1} of ${totalPages}`);
      setCurrentPage(prev => prev + 1);
    }, 500); // Reduced timeout
  }, [chatThreadFromCache?.messages, currentPage, totalPages, loading, isFetchingServerThreads]);

  useEffect(() => {
    const getMeOldChats = async () => {
      const { data, error } = await getInitialChats({ token, chatRoomId, page: currentPage });

      if (data) {
        dispatch(
          saveThread({
            chatRoomId,
            threadDetails: data,
            append: currentPage > 1, // ✅ Append if it's not the first page
          }),
        );
        dispatch(saveFeeDetails({ chatRoomId, feeDetails: data?.feeDetails }));
        setTotalPages(Number(Math.ceil(Number(data?.metadata[0]?.total) / Number(data?.metadata[0]?.limit))));
      }
    };

    if (!isMounted) {
      setIsMounted(true);
    } else {
      console.log('Fetching old chats for page:', currentPage);
      getMeOldChats();
    }
  }, [currentPage, chatRoomId, token]);

  // On Android with adjustNothing, we manually track keyboard height via
  // keyboardDidShow/keyboardDidHide and apply paddingBottom. This bypasses
  // OEM-specific inconsistencies with adjustResize + windowIsTranslucent.
  const Container = Platform.OS === 'android' ? Animated.View : KeyboardAvoidingView;
  const containerProps = Platform.OS === 'android'
    ? { style: { flex: 1, paddingBottom: keyboardHeight } }
    : { style: { flex: 1 }, behavior: 'padding', keyboardVerticalOffset: headerHeight };

  return (
    <GestureHandlerRootView style={styles.wrapper}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <Container {...containerProps}>


        {/* All your modals */}
        <ChatWindowVideoModal fullVideoModalUri={fullVideoModalUri} />
        <ChatWindowInformationModal chatRoomId={chatRoomId} followUser={followUser} unFollowUser={unFollowUser} role={role} />
        {loading ? (
          <Loader />
        ) : (
          <FlatList


            removeClippedSubviews={false}
            ref={flatlistThreadListRef}
            data={chatThreadFromCache ? [...chatThreadFromCache?.messages]?.reverse() : []}
            renderItem={({ item }) => (
              <>
                {currentUserId === item?.sender_id ? (
                  <RightChatBubble displayThread={item} setFullVideoModalUri={setFullVideoModalUri} setFullSizeImageUri={setFullSizeImageUri} otherUserId={id} chatRoomId={chatRoomId} />
                ) : (
                  <LeftChatBubble displayThread={item} setFullVideoModalUri={setFullVideoModalUri} setFullSizeImageUri={setFullSizeImageUri} chatRoomId={chatRoomId} token={token} otherUserId={id} />
                )}
              </>
            )}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            keyExtractor={(item, index) => item._id ? `${item._id}` : `fallback-${index}`}
            inverted
            ListHeaderComponent={() => (loadingMessage ? <ActivityIndicator color={'red'} size={'small'} /> : null)}
            ListFooterComponent={() => !isOldChatsFinished && <ActivityIndicator size={'large'} color={'#e7e8ea'} />}
            onEndReached={endReached}
            onEndReachedThreshold={0.1}
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingTop: 10 }}
          />
        )}
        {/* All your remaining modals and components */}
        <ChatWindowFullSizedImageModal uri={fullSizeImageUrl} />
        <ChatWindowClipModal />
        <TypingIndicator visible={isOtherUserTyping} />
        <ChatWindowInput
          doRaisedRequest={doRaisedRequest}
          show={doRaisedRequest?.initiator !== currentUserId}
          onChangeText={onChangeText}
          onButtonSendButtonClick={() => onButtonSendButtonClick(dispatch)}
          disableSendButton={disableSendButton}
          roomId={chatRoomId}
          userId={currentUserId}
          otherUserId={id}
          name={name}
          profileImageUrl={profileImageUrl}
          role={role}
          onlineStatus={updatedOnlineStatus}
        />
      </Container>
      <ChatWindowPaymentModal token={token} chatRoomId={chatRoomId} />
      <MediaLoadingModal />
      <ChatWindowFeeSetup />
      <ChatWindowLabelModal roomId={chatRoomId} label={label} />
      <LowBalanceModal />
      <CallPricesModal userId={id} roomId={chatRoomId} />
      <TimeRequestModal visible={true} roomId={chatRoomId} />
    </GestureHandlerRootView>
  );
};

export default ChatWindow;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: Math.round(WIDTH_SIZES[24] - 1.1),
  },
  leftChat: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'flex-start',
    paddingHorizontal: 10,
    marginVertical: 6,
  },
  rightChat: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: 10,
    marginVertical: 6,
  },
  chatContainerLeft: {
    width: responsiveWidth(70),
    borderWidth: 1,
    padding: 5,
    flexDirection: 'column',
    borderColor: 'red',
  },
  chatContainerRight: {
    width: responsiveWidth(70),
    borderWidth: 1,
    padding: 5,
    flexDirection: 'column',
    borderColor: 'red',
  },
});
