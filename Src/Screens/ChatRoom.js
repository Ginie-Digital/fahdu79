import { StyleSheet, Text, View, Pressable, FlatList, StatusBar, Button, Vibration, Linking, ToastAndroid, PermissionsAndroid, AppState, Platform, ActivityIndicator, Alert, BackHandler, RefreshControl } from 'react-native';
import { useLayoutEffect, useRef } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ChatRoomAudienceSort from '../Components/ChatRoomAudienceSort';
import { responsiveFontSize, responsiveHeight, responsiveWidth } from 'react-native-responsive-dimensions';
import DIcon from '../../DesiginData/DIcons';

import { useSelector, useDispatch } from 'react-redux';

import { useGetRoomListQuery, useLazyGetRoomListQuery, useLazySearchChatRoomQuery } from '../../Redux/Slices/QuerySlices/roomListSliceApi';
import { useGetPendingCallsQuery, useGetScheduledCallsQuery } from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';

import { deleteFirst, removeRoomList, setCacheByFilter, clearCache } from '../../Redux/Slices/NormalSlices/RoomListSlice';

import { audienceFilterMap, chatRoomSortMap, getTimeAgo, WIDTH_SIZES } from '../../DesiginData/Utility';

import { setDefaultSort } from '../../Redux/Slices/NormalSlices/SortSelectedSlice';

import { token as memoizedToken } from '../../Redux/Slices/NormalSlices/AuthSlice';

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import { checkNotificationGranted, disp } from '../../Notificaton';
import { userIdCreateSelector } from '../../Redux/Slices/NormalSlices/AuthSlice';

import LinearGradient from 'react-native-linear-gradient';

import { resetCurrentChattingRoom } from '../../Redux/Slices/NormalSlices/MessageSlices/ChatWindowCurrentChattingRoom';
import { resetAllModal, setPostsCardType, setUnReadChatIcon, toggleFloatingViews, toggleHideShowInformationModal, toggleShowChatRoomSelector } from '../../Redux/Slices/NormalSlices/HideShowSlice';

import { autoLogout } from '../../AutoLogout';
import SwitcherSheet from '../Components/HomeComponents/SwitcherSheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { navigate } from '../../Navigation/RootNavigation';
import { getMessaging, requestPermission } from '@react-native-firebase/messaging';
import Loader from '../Components/Loader';
import { setDefaultAudience } from '../../Redux/Slices/NormalSlices/AudienceSelectedSlice';
import Verify from '../../Assets/svg/vvv.svg';

import { Image } from 'expo-image';
import NotificationHeader from '../Components/NotificationHeader';
import { labelColor } from '../../DesiginData/Data';
import LabelEditsModal from '../LabelEditsModal';
import FloatingButton from './Chatroom/FloatingButton';
import PulseDot from '../LiveStream/PulseDot';
import CustomCheckbox from '../Components/CustomCheckbox';
import useJoinLiveStream from '../Hook/useJoinLiveStream';
import { setMassMessageAddToUserList } from '../../Redux/Slices/NormalSlices/MessageSlices/MassMessage';

const getRoomLastChatObject = (array, _id) => {
  if (array?.length > 0) {
    const roomIdObjectIndex = array.findIndex(x => x._id === _id);
    return array[roomIdObjectIndex]?.lastMessage;
  } else {
    return [];
  }
};

// ✅ Extracted OUTSIDE the parent component to prevent unmount/remount flicker
const EachChildContainer = React.memo(({ showSelectorCheckBox, item, index, navigation, currentUserId, lastChatFromRoomList, arrayOfunReadThreadIds, liveUsers, onJoinLiveStream, checkBoxSelectAll, target, dispatch }) => {
  const simplifiedDataFromApi = useMemo(() => {
    return {
      name: item?.recipient?.displayName,
      chatRoomId: item?._id,
      profileImageUrl: item?.recipient?.profile_image?.url,
      id: item?.recipient?._id,
    };
  }, [item]);

  // Check if this user is live
  const isUserLive = liveUsers?.some(liveUser => liveUser.userId === simplifiedDataFromApi.id);

  let lastMessageObject = getRoomLastChatObject(lastChatFromRoomList, simplifiedDataFromApi?.chatRoomId);

  const unreadCount = item?.unreadCounterUser || 0;
  const lastMessageTime = item?.updatedAt;
  const isUserOnline = item?.onlineStatus;

  return (
    <Pressable
      style={[styles.eachChatContainer, index === 0 ? { marginTop: 0 } : null]}
      onPress={() => {
        if (!showSelectorCheckBox) {
          navigation.navigate('Chats', {
            chatRoomId: simplifiedDataFromApi?.chatRoomId,
            name: simplifiedDataFromApi?.name,
            profileImageUrl: simplifiedDataFromApi?.profileImageUrl,
            role: item?.recipient?.role,
            id: simplifiedDataFromApi?.id,
            label: item?.label,
          });
        } else {
          dispatch(setMassMessageAddToUserList({ _id: simplifiedDataFromApi?.id }));
        }
      }}>
      <View style={{ flexDirection: 'row', gap: responsiveWidth(4), flex: 1 }}>
        <View style={{ position: 'relative' }}>
          {isUserLive ? (
            <Pressable
              onPress={() => onJoinLiveStream && onJoinLiveStream(simplifiedDataFromApi.id)}
              style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.95 : 1 }] }]}
            >
              <View style={styles.liveOuterBorder}>
                <View style={styles.profileImageWrapper}>
                  <Image cachePolicy="memory-disk" placeholderContentFit="cover" placeholder={require('../../Assets/Images/DefaultProfile.jpg')} source={{ uri: item?.recipient?.profile_image?.url }} contentPosition="center" contentFit="cover" resizeMethod="resize" style={styles.profileImage} />
                </View>
              </View>
              <View style={styles.liveBadge}>
                <PulseDot size={4} color="#FF3B30" />
                <Text style={styles.liveBadgeText}>Live</Text>
              </View>
            </Pressable>
          ) : (
            <>
              <View style={styles.profileImageWrapper}>
                <Image cachePolicy="memory-disk" placeholderContentFit="cover" placeholder={require('../../Assets/Images/DefaultProfile.jpg')} source={{ uri: item?.recipient?.profile_image?.url }} contentPosition="center" contentFit="cover" resizeMethod="resize" style={styles.profileImage} />
              </View>
              <View style={[styles.onlineDot, { backgroundColor: isUserOnline ? '#27C200' : '#E74C3C' }]} />
            </>
          )}
        </View>

        <View style={styles.chatOverViewWrapper}>
          <View style={styles.upperHalf}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', gap: responsiveWidth(2), flex: 1 }}>
                <Text style={styles.upperHalfUserNameTitle} numberOfLines={1}>
                  {simplifiedDataFromApi.name}
                </Text>
                {item?.recipient?.role === 'creator' ? (
                  <View style={{ transform: [{ translateX: responsiveWidth(0.1) }, { translateY: responsiveWidth(0.1) }] }}>
                    <Verify />
                  </View>
                ) : null}
              </View>

              {lastMessageTime && <Text style={styles.timeText}>{getTimeAgo(lastMessageTime)}</Text>}
            </View>

            <View style={styles.lowerHalf}>
              <View style={styles.lowerHalfMessage}>
                <Text style={styles.messages} numberOfLines={1} ellipsizeMode="tail">
                  {lastMessageObject?.length === 0 ? 'Loading...' : !lastMessageObject?.hasAttachment ? lastMessageObject?.message : lastMessageObject?.senderId === currentUserId ? 'You have sent attachment' : 'You have recieved attachment'}
                </Text>
              </View>

              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {item?.label !== 'none' && <View style={[styles.label, { backgroundColor: labelColor[item?.label] }]} />}

      {showSelectorCheckBox && item?.type !== 'none' && (
        <CustomCheckbox
          checked={
            checkBoxSelectAll?.all ||
            (checkBoxSelectAll?.followers && item?.type === 'follower') ||
            (checkBoxSelectAll?.subscribers && item?.type === 'subscriber') ||
            target?.selectedUsers?.includes(simplifiedDataFromApi?.id) ||
            target?.label?.includes(item?.label)
          }
          onToggle={() => dispatch(setMassMessageAddToUserList({ _id: simplifiedDataFromApi?.id }))}
        />
      )}
    </Pressable>
  );
});

let monitor = true;

const ChatRoom = () => {
  let x = useRoute();

  const dispatch = useDispatch();

  const [isSkipped, setIsSkipped] = useState(true);

  const [tempDataToList, setTempDataToList] = useState();

  const [notificationAccess, setNotificationAccess] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  // Search State
  const [searchResults, setSearchResults] = useState([]);
  const [triggerSearch, { isLoading: isSearchLoading }] = useLazySearchChatRoomQuery();

  const token = useSelector(state => state.auth.user.token);

  const selectedAudinceForFilter = useSelector(state => state.filterBy.selected.audience);

  const currentUserId = useSelector(state => state.auth.user.currentUserId);

  const selectedSortForFilter = useSelector(state => state.sortBy.selected.sort);

  const searchString = useSelector(state => state.chatRoomSearchValue.data.searchString);

  // Trigger server-side search when searchString changes
  useEffect(() => {
    if (searchString?.length > 0) {
      triggerSearch({ token, searchString })
        .unwrap()
        .then(res => {
          console.log('🔍 Search Results:', res?.data?.rooms?.length);
          setSearchResults(res?.data?.rooms || []);
        })
        .catch(err => {
          console.error('❌ Search Error:', err);
          setSearchResults([]);
        });
    } else {
      setSearchResults([]);
    }
  }, [searchString, token]);

  const [getRoomList] = useLazyGetRoomListQuery();

  const showSelectorCheckBox = useSelector(state => state.hideShow.visibility.showChatRoomSelector);

  const [currentPage, setCurrentPage] = useState(1);

  // Cursor-based pagination state (using refs for instant access in async closures)
  const nextCursorRef = useRef(null);
  const hasMoreRef = useRef(true);
  const [hasMore, setHasMore] = useState(true);
  const isLoadingMoreRef = useRef(false);

  const [loading, setLoading] = useState(false);

  const [apiError, setApiError] = useState(false);

  const navigation = useNavigation();

  const { target } = useSelector(state => state.massMessage.data);

  const visibility = useSelector(state => state.hideShow.visibility.floatingViews);

  const lable = useSelector(state => state.sortBy.selected.label);

  const role = useSelector(state => state.auth.user.role);

  // Get live users from Redux to highlight in chatroom
  const liveUsers = useSelector(state => state.liveUsers.liveUsers);

  // Hook for joining live streams
  const { joinLiveStream } = useJoinLiveStream();

  // Handler to join livestream when clicking on live user's profile pic
  const handleJoinLiveStream = async (userId) => {
    const liveUser = liveUsers.find(user => user.userId === userId);
    if (liveUser?.roomId) {
      await joinLiveStream(liveUser.roomId, {
        userId: liveUser.userId,
        displayName: liveUser.displayName,
        profileImage: liveUser.profileImage,
      });
    }
  };

  const checkBoxSelectAll = useSelector(state => state.massMessage?.data?.audienceType);

  // ✅ Get online filter from Redux
  const onlineFilter = useSelector(state => state.sortBy.selected.onlineFilter);

  // Fetch Call Requests for the bottom bar
  const { data: pendingCallsData } = useGetPendingCallsQuery(token, {
    skip: role === 'creator',
    pollingInterval: 30000, // Refresh every 30 seconds
  });
  const { data: scheduledCallsData } = useGetScheduledCallsQuery(token, {
    skip: role === 'creator',
    pollingInterval: 30000,
  });

  const pendingCount = pendingCallsData?.data?.metadata?.[0]?.total || 0;
  const scheduledCount = scheduledCallsData?.data?.metadata?.[0]?.total || 0;
  const totalCallRequests = Number(pendingCount) + Number(scheduledCount);

  console.log('🌐 Current online filter:', onlineFilter);

  // ✅ Build a combined cache key that reflects BOTH audience and sort filters
  // e.g. 'none', 'subscribers', 'followers', 'none_read', 'subscribers_unread', 'followers_read', etc.
  const getCacheKey = useCallback((audienceFilter, sortFilter) => {
    const audienceKey = audienceFilterMap[audienceFilter] || 'none'; // 'none'|'subscribers'|'followers'
    if (sortFilter === 2) return audienceKey === 'none' ? 'read' : `${audienceKey}_read`;
    if (sortFilter === 3) return audienceKey === 'none' ? 'unread' : `${audienceKey}_unread`;
    return audienceKey; // sort 1 = recent, key is just the audience
  }, []);

  const currentCacheKey = useMemo(
    () => getCacheKey(selectedAudinceForFilter, selectedSortForFilter),
    [selectedAudinceForFilter, selectedSortForFilter, getCacheKey],
  );

  let dataFromCache = useSelector(state => {
    const selectedCache = state.roomList.data[currentCacheKey];

    console.log('🗂️ Using cache:', {
      sortFilter: selectedSortForFilter,
      audienceFilter: selectedAudinceForFilter,
      cacheName: currentCacheKey,
      cacheLength: selectedCache?.length,
      sampleData: selectedCache?.slice(0, 3).map(x => ({ id: x._id, type: x.type, unread: x.unreadCounterUser })),
    });

    return selectedCache || [];
  });

  let arrayOfunReadThreadIds = useSelector(state => state?.unReadThread?.unReadRoomIdArr);

  const ListEndLoader = () => {
    // Use `hasMore` state (not ref) to guarantee re-render when it changes
    if (dataFromCache?.length > 0 && hasMore && nextCursorRef.current && searchString === '' && !loading) {
      return <ActivityIndicator size={'large'} color={'#e7e8ea'} />;
    }
    return null;
  };

  let getNotificationPermission = useCallback(async () => {
    if (Platform.Version >= 33) {
      let x = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);

      if (x === 'granted') {
        setNotificationAccess(true);
      } else {
        setNotificationAccess(false);
      }
    } else {
      let lowEndDeviceNotificationPermission = await checkNotificationGranted();
      if (lowEndDeviceNotificationPermission) {
        setNotificationAccess(true);
      } else {
        setNotificationAccess(false);
      }
    }
  });

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      // ✅ Reset cursor pagination when leaving screen
      nextCursorRef.current = null;
      hasMoreRef.current = true;
      setHasMore(true);
      monitor = true;
      dispatch(toggleHideShowInformationModal({ show: false }));

      // ✅ Reset all filters when leaving the chatroom
      dispatch(setDefaultSort());       // resets sort → Recent, label → none, onlineFilter → all
      dispatch(setDefaultAudience());   // resets audience tab → All
    });

    return unsubscribe;
  }, [navigation]);

  async function requestUserPermission() {
    const authStatus = await requestPermission(getMessaging());

    if (authStatus) {
      console.log('Permission status:', authStatus);
    }
  }

  const isPermissionFetching = useRef(false);

  const handlerAppStateChange = async nextAppState => {
    if (nextAppState === 'active' && !isPermissionFetching.current) {
      console.log('App has come to the foreground!');
      isPermissionFetching.current = true;
      await getNotificationPermission();
      isPermissionFetching.current = false;
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handlerAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    getNotificationPermission();

    if (Platform.OS === 'ios') {
      requestUserPermission();
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      dispatch(toggleHideShowInformationModal({ show: false }));

      // Check if there are any unread messages in the cache
      // Only hide the unread icon if there are no unread messages
      const hasUnreadMessages = dataFromCache?.some(room => room.unreadCounterUser > 0);
      if (!hasUnreadMessages) {
        dispatch(setUnReadChatIcon({ show: false }));
      }
    }, [dataFromCache]),
  );

  useEffect(() => {
    console.log('🔄 Filters changed, resetting state');
    setLoading(true);
    nextCursorRef.current = null;
    hasMoreRef.current = true;
    setHasMore(true);
    monitor = true;
  }, [selectedAudinceForFilter, selectedSortForFilter, onlineFilter, lable]);

  console.log('📊 Current state:', {
    cursor: nextCursorRef.current ? '...' + nextCursorRef.current.slice(-20) : null,
    hasMore,
    monitor,
    label: lable,
    loading,
    cacheSize: dataFromCache?.length,
  });

  // ✅ IMPROVED: Better API call handling
  const roomOperations = async () => {
    console.log('🔍 roomOperations called:', {
      selectedSortForFilter,
      selectedAudinceForFilter,
      currentPage,
      sortBy: chatRoomSortMap[selectedSortForFilter],
      filter: audienceFilterMap[selectedAudinceForFilter],
      label: lable,
    });

    setApiError(false);

    try {
      const { data: roomListResponse, error } = await getRoomList({
        token,
        cursor: nextCursorRef.current,
        audience: audienceFilterMap[selectedAudinceForFilter],
        state: chatRoomSortMap[selectedSortForFilter],
        label: lable,
        status: onlineFilter,
      });

      console.log('📦 API Response:', {
        success: !!roomListResponse,
        roomCount: roomListResponse?.data?.rooms?.length,
        hasMore: roomListResponse?.data?.hasMore,
        nextCursor: roomListResponse?.data?.nextCursor ? '...exists' : null,
        error: error?.status,
      });

      if (roomListResponse) {
        // ✅ Determine which cache to use — combine audience + sort for unique keys
        const cacheType = currentCacheKey;

        console.log('💾 Caching to:', cacheType, 'Rooms:', roomListResponse?.data?.rooms?.length);

        // ✅ IMPROVED: Better cache handling
        const incomingRooms = roomListResponse?.data?.rooms || [];

        if (monitor) {
          // First load - replace cache completely
          console.log('📝 First load - replacing cache');
          dispatch(
            setCacheByFilter({
              type: cacheType,
              data: incomingRooms,
              replace: true,
            }),
          );
          monitor = false;
        } else if (incomingRooms.length > 0) {
          // Pagination - check for duplicates before adding
          const currentCache = dataFromCache || [];
          const firstNewRoomId = incomingRooms[0]?._id;

          if (currentCache.findIndex(x => x?._id === firstNewRoomId) === -1) {
            console.log('📝 Adding new page to cache');
            dispatch(
              setCacheByFilter({
                type: cacheType,
                data: incomingRooms,
              }),
            );
          } else {
            console.log('⚠️ Duplicate data detected, skipping cache update');
          }
        }

        // ✅ Update cursor pagination
        nextCursorRef.current = roomListResponse?.data?.nextCursor || null;
        hasMoreRef.current = roomListResponse?.data?.hasMore ?? false;
        setHasMore(roomListResponse?.data?.hasMore ?? false);
        console.log('📄 Cursor Pagination:', {
          nextCursor: nextCursorRef.current ? '...exists' : null,
          hasMore: hasMoreRef.current,
        });
      }

      if (error?.status === 500) {
        console.error('❌ API Error 500');
        setApiError(true);
      }
    } catch (err) {
      console.error('❌ roomOperations error:', err);
      setApiError(true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      console.log('👁️ Screen focused, cacheKey:', currentCacheKey);

      // ✅ Always clear current cache and refetch fresh data on filter change
      // to avoid displaying stale results from a previous label/sort/audience combo
      console.log('🔄 Refetching fresh data, cacheKey:', currentCacheKey);
      setLoading(true);
      nextCursorRef.current = null;
      hasMoreRef.current = true;
      setHasMore(true);
      monitor = true;

      dispatch(clearCache({ cacheType: currentCacheKey }));

      roomOperations().then(() => {
        if (isActive) {
          setLoading(false);
          console.log('✅ Initial load complete');
        }
      });

      return () => {
        isActive = false;
      };
    }, [selectedSortForFilter, selectedAudinceForFilter, lable, onlineFilter, currentCacheKey]),
  );

  // ✅ Pagination effect removed — cursor-based loading is triggered by fetchNextPage directly


  const userRole = useSelector(state => state.auth.user.role);

  useEffect(() => {
    const backAction = () => {
      dispatch(toggleShowChatRoomSelector({ show: false }));
      dispatch(toggleFloatingViews({ show: 'showMessageFloat' }));
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, []);

  const fetchNextPage = async () => {
    console.log('📜 Fetch next page triggered');

    if (isLoadingMoreRef.current) {
      console.log('✋ Already loading more, skipping');
      return;
    }

    if (!hasMoreRef.current) {
      console.log('✋ No more data (hasMore=false)');
      return;
    }

    if (!nextCursorRef.current) {
      console.log('✋ No cursor available');
      return;
    }

    if (dataFromCache?.length <= 0) {
      console.log('✋ No data in cache');
      return;
    }

    console.log('➡️ Loading next cursor batch');
    isLoadingMoreRef.current = true;
    try {
      await roomOperations();
    } finally {
      isLoadingMoreRef.current = false;
    }
  };

  // ✅ NEW: Pull to refresh handler
  const onRefresh = useCallback(async () => {
    console.log('🔄 Pull to refresh triggered');
    setRefreshing(true);

    // Clear all caches
    dispatch(clearCache({ cacheType: 'all' }));

    // Reset cursor pagination
    nextCursorRef.current = null;
    hasMoreRef.current = true;
    setHasMore(true);
    monitor = true;

    try {
      await roomOperations();
      console.log('✅ Refresh complete');
    } catch (error) {
      console.error('❌ Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [selectedSortForFilter, selectedAudinceForFilter, lable, onlineFilter]);

  // ✅ FIXED: Cache is already keyed by audience+sort (e.g. 'subscribers_unread').
  //   Label filtering is handled entirely server-side via the API `label` param.
  //   The cache is replaced (monitor=true) on every filter change, so no stale data bleeds through.
  //   We do NOT re-filter by label client-side because API response room objects
  //   may not carry the `label` field consistently, which would incorrectly empty the list.
  const getFilteredData = () => {
    let filteredData = dataFromCache || [];

    console.log('🔍 getFilteredData START:', {
      totalChats: filteredData.length,
      selectedAudinceForFilter,
      selectedSortForFilter,
      label: lable,
      onlineFilter,
      searchString,
      cacheKey: currentCacheKey,
    });

    // ✅ Online/offline filtering is handled server-side via `status` param
    // ✅ Label filtering is handled server-side via `label` param

    // Apply search filter
    if (searchString) {
      const beforeSearch = filteredData.length;
      filteredData = filteredData.filter(x => x.recipient?.displayName?.toLowerCase()?.includes(searchString?.toLowerCase()));
      console.log('🔍 After search filter:', {
        before: beforeSearch,
        after: filteredData.length,
        searchString,
      });
    }

    console.log('✅ FINAL filtered data:', filteredData.length);
    return filteredData;
  };

  const EmptyState = () => {
    let title = 'No chats yet';
    let message = 'Start a conversation to see your chats here';
    let iconName = 'message-outline';

    const hasOnlineFilter = onlineFilter !== 'all';

    if (searchString) {
      title = 'No results found';
      message = `No chats match "${searchString}"`;
      iconName = 'magnify';
    } else if (hasOnlineFilter) {
      if (onlineFilter === 'online') {
        title = 'No online users';
        message = 'No users are currently online';
      } else if (onlineFilter === 'offline') {
        title = 'No offline users';
        message = 'No users are currently offline';
      }
      iconName = 'account-network';
    } else if (selectedSortForFilter === 3) {
      // Unread messages - FIX: Swap the audience type logic
      const audienceType = selectedAudinceForFilter === 2 ? ' from subscribers' : selectedAudinceForFilter === 3 ? ' from followers' : '';
      title = 'All caught up! 🎉';
      message = `You have no unread messages${audienceType}`;
      iconName = 'check-all';
    } else if (selectedSortForFilter === 2) {
      // Read messages - FIX: Swap the audience type logic
      const audienceType = selectedAudinceForFilter === 2 ? ' from subscribers' : selectedAudinceForFilter === 3 ? ' from followers' : '';
      title = 'No read messages';
      message = `Messages you've read${audienceType} will appear here`;
      iconName = 'email-open-outline';
    } else if (selectedAudinceForFilter === 2) {
      // FIX: 2 = subscribers (not followers)
      title = 'No subscriber chats';
      message = 'Chats with your subscribers will appear here';
      iconName = 'star-outline';
    } else if (selectedAudinceForFilter === 3) {
      // FIX: 3 = followers (not subscribers)
      title = 'No follower chats';
      message = 'Chats with your followers will appear here';
      iconName = 'account-heart-outline';
    }

    return (
      <View style={styles.emptyContainer}>
        <DIcon provider="MaterialCommunityIcons" name={iconName} size={responsiveWidth(20)} color="#CCCCCC" />
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyMessage}>{message}</Text>
      </View>
    );
  };

  // ✅ EachChildContainer is now defined OUTSIDE the component (above) to prevent flicker

  const isSearchMode = useSelector(state => state.chatRoomSearchValue.data.isSearchMode);

  // ✅ Memoize the data array so FlatList doesn't see a new reference on every tick
  const listData = useMemo(() => {
    return searchString?.length > 0 ? searchResults : getFilteredData();
  }, [searchString, searchResults, dataFromCache, selectedAudinceForFilter, selectedSortForFilter, onlineFilter, lable]);

  return (
    <GestureHandlerRootView style={styles.chatRoomContainer}>
      <View style={styles.titleMessageWrapper}></View>

      {/* Dynamic Chat Tabs */}


      {loading || isSearchLoading ? (
        <Loader />
      ) : (
        <View style={styles.chatlistWrapper}>
          <FlatList
            keyboardDismissMode="on-drag"
            data={listData}
            extraData={[liveUsers, searchResults, checkBoxSelectAll, target]}
            keyExtractor={item => item._id}
            renderItem={({ item, index }) => (
              <EachChildContainer
                showSelectorCheckBox={showSelectorCheckBox}
                item={item}
                index={index}
                navigation={navigation}
                currentUserId={currentUserId}
                lastChatFromRoomList={listData}
                arrayOfunReadThreadIds={arrayOfunReadThreadIds}
                liveUsers={liveUsers}
                onJoinLiveStream={handleJoinLiveStream}
                checkBoxSelectAll={checkBoxSelectAll}
                target={target}
                dispatch={dispatch}
              />
            )}
            contentContainerStyle={{
              paddingBottom: responsiveWidth(10),
            }}
            showsVerticalScrollIndicator={false}
            style={{ marginBottom: responsiveWidth(1) }}
            ItemSeparatorComponent={() => <View style={{ height: 1, borderTopWidth: responsiveWidth(0.3), borderColor: '#E9E9E9' }} />}
            onEndReached={fetchNextPage}
            onEndReachedThreshold={0.1}
            ListFooterComponent={() => <ListEndLoader />}
            ListHeaderComponent={() => !notificationAccess && <NotificationHeader />}
            ListEmptyComponent={() => !loading && <EmptyState />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FFA86B', '#FF7819']} tintColor="#FFA86B" title="Pull to refresh" titleColor="#999" />}
          />
        </View>
      )}

      <SwitcherSheet />
      <LabelEditsModal />

      {visibility === 'showMessageFloat' && role === 'creator' && !isSearchMode ? <FloatingButton onPress={() => console.log('Floating button pressed')} /> : null}



      {/* Call Requests Bottom Bar - ONLY for User role */}
    </GestureHandlerRootView>
  );
};

export default ChatRoom;

const styles = StyleSheet.create({
  chatRoomContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderTopColor: '#282828',
  },

  titleMessageWrapper: {
    paddingHorizontal: responsiveWidth(5),
    marginTop: responsiveWidth(1),
  },

  chatlistWrapper: {
    flex: 1,
  },

  eachChatContainer: {
    flexDirection: 'row',
    width: '100%',
    padding: responsiveWidth(5),
    height: responsiveHeight(7.5),
    gap: 10,
    alignSelf: 'center',
    borderColor: '#282828',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    left: responsiveWidth(0.5),
    marginVertical: responsiveWidth(2),
  },

  profileImageWrapper: {
    borderColor: 'purple',
    borderRadius: responsiveWidth(12),
    position: 'relative',
    borderColor: '#282828',
    resizeMode: 'cover',
    overflow: 'hidden',
    height: 50,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: WIDTH_SIZES[2],
  },

  liveOuterBorder: {
    borderStyle: 'dashed',
    borderColor: '#1e1e1e',
    borderWidth: 2,
    borderRadius: 32,
    width: 62,
    height: 62,
    justifyContent: 'center',
    alignItems: 'center',
  },

  liveBadge: {
    position: 'absolute',
    bottom: -1,
    left: '50%',
    transform: [{ translateX: -24 }],
    width: 48,
    height: 18,
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },

  liveBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Rubik-Medium',
  },

  chatOverViewWrapper: {
    flex: 1,
    justifyContent: 'space-around',
  },

  profileImage: {
    flex: 1,
    width: '100%',
    backgroundColor: '#0553',
  },

  upperHalfUserNameTitle: {
    color: '#353535',
    fontSize: responsiveFontSize(2),
    fontFamily: 'Rubik-Medium',
  },

  lowerHalf: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: responsiveWidth(10),
  },

  lowerHalfRest: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
    aspectRatio: 1,
    width: '4%',
    borderRadius: responsiveWidth(50),
    backgroundColor: 'red',
  },
  lowerHalfText: {
    fontSize: responsiveFontSize(1.4),
    color: 'white',
  },

  lowerHalfMessage: {
    paddingHorizontal: responsiveWidth(2),
    flexDirection: 'row',
  },

  messages: {
    fontSize: responsiveFontSize(1.7),
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    right: responsiveWidth(2),
    width: responsiveWidth(55),
  },

  bottomNavigatinContainer: {
    width: '100%',
    padding: responsiveWidth(1),
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  bottomNavigationEachChild: {
    paddingVertical: responsiveWidth(2),
    paddingHorizontal: responsiveWidth(4),
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: responsiveWidth(8),
  },

  bottomNavigationText: {
    fontSize: responsiveFontSize(2),
    fontFamily: 'Rubik-Bold',
    color: '#282828',
  },
  label: {
    position: 'absolute',
    width: WIDTH_SIZES[36] + WIDTH_SIZES[8],
    height: WIDTH_SIZES[16],
    backgroundColor: 'red',
    alignSelf: 'flex-end',
    right: 0,
    bottom: '-40%',
    borderTopLeftRadius: WIDTH_SIZES[18],
    borderWidth: WIDTH_SIZES[1.5],
    borderColor: '#1e1e1e',
  },
  timeText: {
    fontSize: responsiveFontSize(1.5),
    fontFamily: 'Rubik-Regular',
    color: '#999',
    marginLeft: responsiveWidth(2),
    marginBottom: responsiveWidth(2),
  },

  unreadBadge: {
    backgroundColor: '#FFA86B',
    borderRadius: responsiveWidth(50),
    minWidth: responsiveWidth(4),
    height: responsiveWidth(4),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#FF7819',
  },

  unreadBadgeText: {
    color: '#1e1e1e',
    fontSize: responsiveFontSize(1),
    fontFamily: 'Rubik-Bold',
  },

  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#fff',
    zIndex: 2,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: responsiveWidth(10),
  },
  errorTitle: {
    fontSize: responsiveFontSize(2.5),
    fontFamily: 'Rubik-Bold',
    color: '#1e1e1e',
    marginTop: responsiveWidth(4),
    marginBottom: responsiveWidth(2),
  },
  errorMessage: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: responsiveWidth(6),
    lineHeight: responsiveHeight(3),
  },
  retryButton: {
    backgroundColor: '#FFA86B',
    paddingHorizontal: responsiveWidth(8),
    paddingVertical: responsiveWidth(3),
    borderRadius: responsiveWidth(2),
    borderWidth: responsiveWidth(0.5),
    borderColor: '#1e1e1e',
  },
  retryButtonText: {
    fontSize: responsiveFontSize(2),
    fontFamily: 'Rubik-SemiBold',
    color: '#1e1e1e',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: responsiveWidth(10),
    marginTop: responsiveHeight(20),
  },
  emptyTitle: {
    fontSize: responsiveFontSize(2.5),
    fontFamily: 'Rubik-Bold',
    color: '#1e1e1e',
    marginTop: responsiveWidth(4),
    marginBottom: responsiveWidth(2),
  },
  emptyMessage: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Regular',
    color: '#999',
    textAlign: 'center',
  },
});
