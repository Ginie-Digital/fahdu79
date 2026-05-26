
import { StyleSheet, View, Image, Text, ActivityIndicator, Alert, Platform, Button, TouchableOpacity, Modal } from 'react-native';

import PostCards from '../Components/HomeComponents/PostCards';
import { responsiveFontSize, responsiveWidth } from 'react-native-responsive-dimensions';
import { FlatList, GestureHandlerRootView, Pressable, RefreshControl, TextInput } from 'react-native-gesture-handler';
import { token as memoizedToken } from '../../Redux/Slices/NormalSlices/AuthSlice';

import { useCanClearCacheMutation, useLazyGetInstagramProfileInfoQuery, useLazyGetStoriesQuery, useLazyGetUserFeedQuery, useLazyGetUnreadChatCountQuery } from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { useDispatch, useSelector } from 'react-redux';
import { FlashList } from '@shopify/flash-list';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { resetAllModal, setCurrentVideoPlayId, setPostsCardType, setUnReadChatIcon, toggleCallAccepted } from '../../Redux/Slices/NormalSlices/HideShowSlice';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';

import { navigate } from '../../Navigation/RootNavigation';
// import CreateCommentBottomSheet from '../Components/HomeComponents/CreateCommentBottomSheet';
import Loader from '../Components/Loader';
import { autoLogout } from '../../AutoLogout';
import { Dialog } from 'react-native-simple-dialogs';
import { mainpulateFirstPageCreatedAt, manipulateCurrentPage, manipulateTotalPages, resetFeed, setFeedCache } from '../../Redux/Slices/NormalSlices/Home/FeedCacheSlice';
import DeviceInfo from 'react-native-device-info';

import Purchases, { LOG_LEVEL } from 'react-native-purchases';

import { _filterPostList } from '../../DesiginData/Utility';
import TermsOfLive from './Stream/TermsOfLive';
import { pushChats, pushGoals } from '../../Redux/Slices/NormalSlices/LiveStream/LiveChats';
// import Stories from '../Components/HomeComponents/Stories';
// import {pushLiveStories} from '../../Redux/Slices/NormalSlices/Home/StoriesSlice';
import UpdateAppComponent from '../Components/HomeComponents/UpdateAppComponent';
import { setSharedCampaignId, setUserFromCampaignLink } from '../../Redux/Slices/NormalSlices/Deeplink/DeeplinkSlice';

import { showMessage, hideMessage } from 'react-native-flash-message';
import BrandSubmitLinkModal from '../Components/Modal/BrandSubmitLinkModal';
import PostShimmer from '../Components/Shimmers/PostShimmer';
import AreYou from './LoginSignup/AreYou';

import { resetAll } from '../../Redux/Actions';

import PostProgress from '../PostProgress';
import { resetUploadProgress } from '../../Redux/Slices/NormalSlices/UploadSlice';
import ReLoginModal from './LoginSignup/ReLoginModal';
import LowBalanceModal from '../Components/LowBalanceModal';
import socketServices from '../../SocketServices';
import LiveBanner from '../LiveStream/LiveBanner';
import LiveUsersScroll from '../LiveStream/LiveUsersScroll';
import useJoinLiveStream from '../Hook/useJoinLiveStream';

const PlaceHolder = ({ text }) => {
  return (
    <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
      <Text
        style={{
          fontFamily: 'MabryPro-Regular',
          color: '#282828',
          fontSize: responsiveFontSize(2),
        }}>
        {text}
      </Text>
    </View>
  );
};



const SocialPostRender = memo(({ item, index, token }) => <PostCards item={item} index={index} token={token} />);

const FeedItemSeparator = () => <View style={{ backgroundColor: '#E9E9E9', height: 4 }} />;

const Home = () => {
  const token = useSelector(state => state.auth.user.token);

  const homeFlashRef = useRef(null);

  useScrollToTop(
    React.useRef({
      scrollToTop: () =>
        homeFlashRef.current?.scrollToOffset({
          animated: true,
          offset: 0,
        }),
    }),
  );

  const currentUserDetails = useSelector(state => state?.auth?.user);

  const [fetchFeedData, { isLoading: isUserFeedFetching, isSuccess: isUserFeedSuccess }] = useLazyGetUserFeedQuery();

  // const [getStories] = useLazyGetStoriesQuery();

  const [getInstagramProfileInfo] = useLazyGetInstagramProfileInfoQuery();

  const postCardType = useSelector(state => state.hideShow.visibility.postCardType);

  const [campaignArray, setCampaignArray] = useState([]);

  const [removePostId, setRemovePostId] = useState(undefined);

  const [refreshing, setRefreshing] = useState(false);



  const { show: commentBottomSheetVisibility } = useSelector(state => state.hideShow.visibility.commentBottomSheet);
  const { show: postActionSheetBottomSheetVisibility } = useSelector(state => state.hideShow.visibility.postActionBottomSheet);
  const switcherSheetVisibility = useSelector(state => state.hideShow.visibility.switcherSheet);
  const liveTermsHideShow = useSelector(state => state.hideShow.visibility.hideShowLiveTerms);

  const [refreshFeed, setRefreshFeed] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const { content: cachedFeed, blockedPost: blockedPostArr, totalPages, currentPage, firstPostCreatedAt } = useSelector(state => state.feedCache.data);

  const filteredFeed = useMemo(() => {
    return _filterPostList([...cachedFeed], [...blockedPostArr]);
  }, [cachedFeed, blockedPostArr]);

  // const [showStories, setShowStories] = useState(false);

  const dispatch = useDispatch();

  const [pages, setPages] = useState(1);

  const [mainLoading, setMainLoading] = useState(true);

  const [canClearCache] = useCanClearCacheMutation();

  const [getUnreadChatCount] = useLazyGetUnreadChatCountQuery();

  const callData = useSelector(state => state.call.data);

  const suspension = useSelector(state => state.auth.user.suspended);


  // Get live users from Redux
  const reduxLiveUsers = useSelector(state => state.liveUsers.liveUsers);

  // Map Redux data to component format
  const liveUsers = reduxLiveUsers.map(user => ({

    id: user.id,
    username: user.displayName,
    avatarUrl: user.profileImage || 'https://via.placeholder.com/64',
    roomId: user.roomId,
    userId: user.userId,
  }));

  // Hook for joining live streams
  const { joinLiveStream, isLoading: isJoiningLiveStream } = useJoinLiveStream();

  // Handler to join a live stream
  const handleJoinLiveStream = async (user) => {
    console.log('Joining stream:', user);
    if (user?.roomId) {
      await joinLiveStream(user.roomId, {
        displayName: user.username,
        profileImage: user.avatarUrl,
        userId: user.userId,
      });
    }
  };

  async function shouldClearCache() {
    const androidVersion = Platform.OS === 'android' ? DeviceInfo.getSystemVersion() : null;
    const iosVersion = Platform.OS === 'ios' ? DeviceInfo.getSystemVersion() : null;
    const { data, error } = await canClearCache({
      token,
      data: {
        user_id: currentUserDetails?.currentUserId,
        android_version: androidVersion,
        ios_version: iosVersion,
      },
    });

    if (data?.data?.clearcache) {
      dispatch(resetAllModal());
      dispatch(resetAll());
    }
  }

  function handleCall() {
    console.log('hello', currentUserDetails?.currentUserId);
    socketServices.emitTyping('6915b4967398b818d22d5e52', currentUserDetails?.currentUserId);
  }

  useEffect(() => {
    // shouldClearCache();

    dispatch(toggleCallAccepted({ status: false }));

    // Fetch unread chat count and show icon if count > 0
    const fetchUnreadCount = async () => {
      try {
        const { data } = await getUnreadChatCount({ token });
        if (data?.data > 0) {
          dispatch(setUnReadChatIcon({ show: true }));
        } else {
          dispatch(setUnReadChatIcon({ show: false }));
        }
      } catch (error) {
        console.log('Error fetching unread chat count:', error);
      }
    };

    if (token) {
      fetchUnreadCount();
    }
  }, []);

  useEffect(() => {
    if (currentUserDetails?.onlyBrandsAccess) {
      dispatch(setPostsCardType({ postCardType: 'brand' }));
    }
  }, [currentUserDetails.onlyBrandsAccess]);

  // Background message handler is registered in index.js — do NOT register here
  // (previously had a duplicate handler that overwrote the comprehensive index.js handler on every render)

  //Update states


  const ListHeader = () => (
    <>
      <PostProgress />

      {/* Show LiveBanner if only 1 user is live, otherwise show LiveUsersScroll */}
      {liveUsers.length === 1 && (
        <LiveBanner
          username={liveUsers[0].username}
          avatarUrl={liveUsers[0].avatarUrl}
          onJoin={() => handleJoinLiveStream(liveUsers[0])}
          userDetails={liveUsers[0]}
        />
      )}

      {liveUsers.length > 1 && (
        <LiveUsersScroll
          liveUsers={liveUsers}
          onUserPress={handleJoinLiveStream}
        />
      )}
    </>
  );


  const userRole = useSelector(state => state.auth.user.role);


  const isLoadingRef = useRef(false);

  const fetchFeeds = useCallback(async (isInitial = false) => {
    if (isLoadingRef.current) {
      // Even if we skip the fetch, ensure mainLoading is cleared
      // so shimmer doesn't get stuck
      if (isInitial) {
        setMainLoading(false);
      }
      return;
    }
    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      const { data: responseFeed, error } = await fetchFeedData({
        token,
        page: currentPage,
        timestamp: currentPage === 1 ? '' : firstPostCreatedAt,
      });

      if (error?.data?.status_code === 401) {
        autoLogout();
        return;
      }

      if (responseFeed) {
        if (currentPage === 1 && responseFeed?.data?.posts?.length > 0) {
          dispatch(
            mainpulateFirstPageCreatedAt({
              timestamp: responseFeed?.data?.posts[0]?.createdAt,
            }),
          );
        }

        dispatch(
          manipulateTotalPages({
            currentTotalPage: Math.ceil(responseFeed?.data?.metadata[0]?.total / responseFeed?.data?.metadata[0]?.limit),
          }),
        );

        if (responseFeed?.data?.posts?.length > 0) {
          // Check if we are appending or setting (if page 1, we might want to refresh)
          if (currentPage === 1) {
            dispatch(setFeedCache({ data: responseFeed?.data?.posts }));
          } else {
            // Append logic
            if (cachedFeed.findIndex(x => x._id === responseFeed?.data?.posts[0]?._id) === -1) {
              dispatch(
                setFeedCache({
                  data: [...cachedFeed, ...responseFeed?.data?.posts],
                }),
              );
            }
          }
        }
      }
    } catch (err) {
      console.error("Fetch feed error:", err);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
      setRefreshFeed(false);
      setMainLoading(false);
    }
  }, [currentPage, token, firstPostCreatedAt, cachedFeed]);

  // Handle Initial Load and Refresh
  useFocusEffect(
    useCallback(() => {
      if (currentPage === 1 && cachedFeed.length === 0) {
        fetchFeeds(true);
      } else {
        // If feed is already cached, ensure shimmer is dismissed
        setMainLoading(false);
      }
    }, [refreshFeed, token, cachedFeed.length])
  );

  // Handle Pagination
  useEffect(() => {
    if (currentPage > 1) {
      fetchFeeds();
    }
  }, [currentPage]);

  // Handle Manual Refresh
  useEffect(() => {
    if (refreshFeed) {
      fetchFeeds(true);
    }
  }, [refreshFeed]);

  // Safety net: if mainLoading is stuck for more than 10 seconds, force clear it
  useEffect(() => {
    if (mainLoading) {
      const timeout = setTimeout(() => {
        console.warn('[Home] mainLoading safety timeout triggered');
        setMainLoading(false);
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [mainLoading]);

  //Just to remove homeBottomSheet
  useEffect(() => {
    console.log('[BS_DEBUG][Home Screen] useEffect mount: dispatching resetAllModal');
    dispatch(resetAllModal());
    dispatch(resetUploadProgress());
  }, []);

  useEffect(() => {
    let index = campaignArray?.findIndex(x => x?._id === removePostId);

    if (index !== -1) {
      let tempArr = [...campaignArray];

      tempArr?.splice(index, 1);

      setCampaignArray(tempArr);
    }
  }, [removePostId]);

  useFocusEffect(
    useCallback(() => {
      console.log('[BS_DEBUG][Home Screen] useFocusEffect: dispatching resetAllModal');
      dispatch(resetAllModal());
    }, []),
  );

  const onRefresh = () => {
    console.log('Refresh');
    setRefreshing(true);
  };

  const onRefreshFeed = () => {
    dispatch(resetFeed());
    dispatch(manipulateCurrentPage({ currentPage: 1 }));
    dispatch(manipulateTotalPages({ currentTotalPage: 0 }));
    setRefreshFeed(true);
  };
  ``;

  useEffect(() => {
    console.log('USEREMEMMEMEMEM CALLELD DFIFDFJP{{}{}{}');

    async function configureRevenueCat() {
      console.log('🛠️ Setting up RevenueCat', currentUserDetails?.currentUserId);

      Purchases.setLogLevel(LOG_LEVEL.ERROR);

      if (Platform.OS === 'ios') {
        try {
          // Step 1: Always log out first to clear Anonymous ID

          if (!currentUserDetails?.currentUserId) return;

          Purchases.configure({
            apiKey: 'appl_jdVBoXcPlFOOtSRgdOySIPRyiIt',
            appUserID: String(currentUserDetails?.currentUserId),
          });

          const customerInfo = await Purchases.getCustomerInfo();
          console.log('✅ User Logged In:', customerInfo.originalAppUserId);
          console.log('📜 Full Customer Info:', customerInfo);

          const result = await Purchases.logIn(String(currentUserDetails?.currentUserId));
          console.log('✅ Logged In:', result.customerInfo.originalAppUserId);
        } catch (error) {
          console.error('❌ RevenueCat configuration failed:', error);
        }
      } else {
        console.log('⚠️ RevenueCat setup skipped (not iOS)');
      }
    }

    configureRevenueCat();
  }, [currentUserDetails?.currentUserId]);

  const currentShownPost = useCallback(post => {
    if (post[0]?.isViewable) {
      dispatch(setCurrentVideoPlayId({ currentVideoId: post[0]?.item?._id }));
    }
  }, []);

  const showMeSuspension = () => {
    console.log('clalign');
    console.log(suspension);
  };

  const ListEndLoader = () => {
    if (!isLoading && cachedFeed?.length !== 0) {
      return (
        <Text
          style={{
            fontFamily: 'MabryPro-Bold',
            color: '#282828',
            textAlign: 'center',
          }}>
          You're all caught up!
        </Text>
      );
    } else {
      return <ActivityIndicator size={'large'} color={'#e7e8ea'} />;
    }
  };

  const fetchNextPage = async () => {
    if (cachedFeed?.length <= 0) return;

    if (currentPage >= totalPages) return;

    dispatch(manipulateCurrentPage({ currentPage: currentPage + 1 }));
  };

  if (mainLoading || refreshFeed) {
    return <PostShimmer />;
  }

  // console.log(cachedFeed[0])

  return (
    <GestureHandlerRootView style={styles.homeContainer}>
      <FlashList
        ref={homeFlashRef}
        data={filteredFeed}
        renderItem={({ item, index }) => <SocialPostRender item={item} index={index} token={token} />}
        keyExtractor={item => item._id}
        onViewableItemsChanged={({ changed, viewableItems }) => currentShownPost(viewableItems)}
        estimatedItemSize={434}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshFeed} onRefresh={onRefreshFeed} />}
        onEndReachedThreshold={0.1}
        onEndReached={fetchNextPage}
        ListFooterComponent={ListEndLoader}
        renderToHardwareTextureAndroid
        decelerationRate={Platform.OS === 'ios' ? 'normal' : 'fast'}
        ItemSeparatorComponent={FeedItemSeparator}
        ListHeaderComponent={ListHeader}
      // ListHeaderComponent={() => <Button title="Dummy Cal" onPress={() => handleCall()} />}
      />




      {/* <CreateCommentBottomSheet /> */}
      {/* {postActionSheetBottomSheetVisibility === 1 && <PostActionBottomSheet />}
      {switcherSheetVisibility === 1 && <SwitcherSheet />} */}
      <TermsOfLive />
      <LowBalanceModal />
      {currentUserDetails?.role !== 'creator' && <AreYou />}
    </GestureHandlerRootView>
  );
};

export default Home;

const styles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopColor: '#282828',
  },
});
