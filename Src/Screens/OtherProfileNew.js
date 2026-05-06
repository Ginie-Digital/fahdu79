import {StyleSheet, Text, View, ScrollView, FlatList, Dimensions, Image, ActivityIndicator, Modal} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {responsiveWidth} from 'react-native-responsive-dimensions';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {useDispatch, useSelector} from 'react-redux';
import UpperOtherProfile from '../Components/NewOtherProfileComponents/UpperOtherProfile';
import OthersProfileActionSheet from '../Components/NewOtherProfileComponents/OthersProfielActionSheet';
import OtherProfileFeedPost from '../Components/NewOtherProfileComponents/OtherProfileFeedPost';
import OtherGridFeedPostComponent from '../Components/NewOtherProfileComponents/OtherGridFeedPostComponent';
import OtherWishListPostComponent from '../Components/NewOtherProfileComponents/OtherWishListPostComponent';
import {toggleOtherProfileActionSheet, toggleOtherProfileActionModal, toggleRefreshOtherProfile} from '../../Redux/Slices/NormalSlices/HideShowSlice';
import PostActionBottomSheet from '../Components/HomeComponents/PostActionBottomSheet';
import CreateCommentBottomSheet from '../Components/HomeComponents/CreateCommentBottomSheet';
import OtherProfileRatingSheet from '../Components/NewOtherProfileComponents/OtherProfileRatingSheet';
import UnSubscribeModal from '../Components/MyProfile/UnSubscribeModal';
import Loader from '../Components/Loader';
import {useLazyContactInfoQuery, useLazyOtherPostListQuery, useLazyGetCashfreeSubscriptionQuery} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {token as memoizedToken} from '../../Redux/Slices/NormalSlices/AuthSlice';
import {setFeedCachePost, manipulateTotalPagesPost, manipulateCurrentPagePost} from '../../Redux/Slices/NormalSlices/Posts/ProfileFeedCacheSlice';

import FAbout from '../../Assets/Images/ProfileTab/fabout.svg';
import UFAbout from '../../Assets/Images/ProfileTab/ufabout.svg';
import FPost from '../../Assets/Images/ProfileTab/fpost.svg';
import UFPost from '../../Assets/Images/ProfileTab/ufpost.svg';
import FWishlist from '../../Assets/Images/ProfileTab/fwishlist.svg';
import UFWishlist from '../../Assets/Images/ProfileTab/ufwishlist.svg';

import {Tabs, MaterialTabBar} from 'react-native-collapsible-tab-view';
import ProfileUser from '../Components/MyProfile/ProfileUser';

const showContentList = [
  {
    id: 1,
    uri: require('../../Assets/Images/post.png'),
    uriFocus: require('../../Assets/Images/postFocus.png'),
  },
  {
    id: 2,
    uri: require('../../Assets/Images/grid.png'),
    uriFocus: require('../../Assets/Images/gridFocus.png'),
  },
  {
    id: 3,
    uri: require('../../Assets/Images/wishlist.png'),
    uriFocus: require('../../Assets/Images/wishlistFocus.png'),
  },
];

const Tab = createMaterialTopTabNavigator();

const OtherProfileNew = ({route}) => {
  console.log('First step of other profile 1', route?.params);

  const [isLoading, setIsLoading] = useState(true);
  const [afterTime, setAfterTime] = useState(false);
  const [activeTab, setActiveTab] = React.useState('Homess');
  const [currentTab, setCurrentTab] = useState('profile');
  const [contactDescription, setContactDescription] = useState({});
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [contactInfoLoaded, setContactInfoLoaded] = useState(false);

  const {stateOne, stateTwo, stateThree} = useSelector(state => state.hideShow.visibility.otherProfileLoader);
  const {haveSubscribed, haveFollowed} = useSelector(state => state.profileFeedCache.data);
  const [unsubscribeModalVisible, setUnsubscribeModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const dispatch = useDispatch();

  const [getCashfreeSub] = useLazyGetCashfreeSubscriptionQuery();
  const [isFetchingSubscription, setIsFetchingSubscription] = useState(false);

  useEffect(() => {
    dispatch(toggleOtherProfileActionSheet({info: {show: -1}}));

    let clearTimeOuts = setTimeout(() => {
      setAfterTime(true);
    }, 2000);

    return () => {
      clearTimeout(clearTimeOuts);
    };
  }, []);

  const token = useSelector(state => state.auth.user.token);
  const [otherPostList] = useLazyOtherPostListQuery();

  const refreshOtherProfile = useSelector(state => state.hideShow.visibility.refreshOtherProfile);
  const otherProfileActionSheetVisibility = useSelector(state => state.hideShow.visibility.otherProfileActionSheet.show);
  const otherProfileRatingSheetVisibility = useSelector(state => state.hideShow.visibility.otherProfileRatingSheet);
  const commentBottomSheetVisibility = useSelector(state => state.hideShow.visibility.commentBottomSheet.show);
  const postActionSheetBottomSheetVisibility = useSelector(state => state.hideShow.visibility.postActionBottomSheet.show);


  useEffect(() => {
    console.log('Called get profile');

    if (haveSubscribed || haveFollowed) {
      async function getPostList() {
        try {
          let {data: postData, error} = await otherPostList({token, userName: route?.params?.userName});

          console.log('POSTDAT', postData, 'ERROR', error);

          if (postData) {
            let pinnedPost = postData?.data?.pinnedPosts.map((x, i) => {
              return {
                ...x,
                pinned: true,
              };
            });

            let combinedPinnedUnPinnedPosts = [...pinnedPost, ...postData?.data?.posts];
            dispatch(setFeedCachePost({data: combinedPinnedUnPinnedPosts}));

            if (postData?.data?.metadata?.[0]) {
              const meta = postData.data.metadata[0];
              const totalPages = Math.ceil(meta.total / meta.limit);
              console.log('Dispatching Total Pages:', totalPages);
              dispatch(manipulateTotalPagesPost({currentTotalPage: totalPages}));
              dispatch(manipulateCurrentPagePost({currentPage: 1}));
            }
          }
        } catch (error) {
          console.error('Error fetching posts:', error);
        } finally {
          // Add small delay before marking posts as loaded
          setTimeout(() => {
            setPostsLoaded(true);
          }, 500);
        }
      }

      getPostList();
    } else {
      // Add small delay for non-creator profiles too
      setTimeout(() => {
        setPostsLoaded(true);
      }, 500);
    }
  }, [route?.params?.userName, haveSubscribed, haveFollowed, refreshOtherProfile]);

  const [contactInfo] = useLazyContactInfoQuery();

  const fetchContactInfo = useCallback(async (token, userId) => {
    try {
      const response = await contactInfo({
        token,
        userId,
      });

      if (response?.data?.statusCode === 200) {
        const dataArray = Object.keys(response?.data?.data).map(key => ({
          type: key, // key name (audioCall, videoCall, etc.)
          ...response?.data?.data[key], // spread object values
        }));

        setContactDescription(dataArray);
      }
    } catch (error) {
      console.error('Error fetching contact info:', error);
    } finally {
      setTimeout(() => {
        setContactInfoLoaded(true);
      }, 500);
    }
  }, []);

  useEffect(() => {
    fetchContactInfo(token, route?.params?.userId);
  }, [token, route?.params?.userId]);

  const handleUnsubscribePress = useCallback(async () => {
    const creatorId = route?.params?.userId;
    if (!creatorId) return;

    setIsFetchingSubscription(true);
    try {
      await getCashfreeSub({ token, creatorId }).unwrap();
      setSelectedItem({
        userDetails: {
          _id: route?.params?.userId,
          displayName: route?.params?.userName,
          role: route?.params?.role,
        },
        creatorId: route?.params?.userId,
        creatorName: route?.params?.userName,
      });
      dispatch(toggleOtherProfileActionModal({show: false}));
      setTimeout(() => {
        setUnsubscribeModalVisible(true);
      }, 300);
    } catch (error) {
      console.error('Error prefetching subscription details:', error);
      setSelectedItem({
        userDetails: {
          _id: route?.params?.userId,
          displayName: route?.params?.userName,
          role: route?.params?.role,
        },
        creatorId: route?.params?.userId,
        creatorName: route?.params?.userName,
      });
      dispatch(toggleOtherProfileActionModal({show: false}));
      setTimeout(() => {
        setUnsubscribeModalVisible(true);
      }, 300);
    } finally {
      setIsFetchingSubscription(false);
    }
  }, [route?.params, token]);

  // Check if all data is loaded
  useEffect(() => {
    if (postsLoaded && contactInfoLoaded && afterTime) {
      const minimumLoadTime = 3000;
      const startTime = Date.now();

      const checkMinimumTime = () => {
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime >= minimumLoadTime) {
          setIsLoading(false);
        } else {
          setTimeout(() => {
            checkMinimumTime();
          }, minimumLoadTime - elapsedTime);
        }
      };

      checkMinimumTime();
    }
  }, [postsLoaded, contactInfoLoaded, afterTime]);

  const DefaultScreen = () => (
    <View style={{alignItems: 'center', justifyContent: 'center', height: Dimensions.get('screen').height - responsiveWidth(40), borderBottomWidth: 2, borderColor: '#282828', padding: responsiveWidth(30)}}>
      <ActivityIndicator size="large" color="white" animating />
    </View>
  );

  return (
    <>
      <View style={{flex: 1}}>
        {route?.params?.role === 'creator' ? (
          <Tabs.Container
            renderHeader={() => <UpperOtherProfile toCallApiInfo={route?.params} />}
            renderTabBar={props => <MaterialTabBar {...props} indicatorStyle={{backgroundColor: '#1E1E1E', height: responsiveWidth(0.4)}} />}
            onTabChange={({tabName}) => setCurrentTab(tabName)}>
            <Tabs.Tab name="profile" label={({name}) => (currentTab === name ? <FAbout /> : <UFAbout />)}>
              <OtherProfileFeedPost contactDescription={contactDescription} />
            </Tabs.Tab>

            <Tabs.Tab name="post" label={({name}) => (currentTab === name ? <FPost size={20} /> : <UFPost />)}>
            <OtherGridFeedPostComponent toCallApiInfo={route?.params} />
            </Tabs.Tab>

            <Tabs.Tab name="wishlist" label={({name}) => (currentTab === name ? <FWishlist size={20} /> : <UFWishlist />)}>
              <OtherWishListPostComponent toCallApiInfo={route?.params} />
            </Tabs.Tab>
          </Tabs.Container>
        ) : (
          <View style={{flex: 1, backgroundColor: '#fff'}}>
            <UpperOtherProfile toCallApiInfo={route?.params} />
            {/* <ProfileUser /> */}
          </View>
        )}

        {/* Overlay Loading Screen */}
        {isLoading && (
          <View style={styles.loaderOverlay}>
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#1e1e1e" />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          </View>
        )}
      </View>

      {otherProfileActionSheetVisibility === 1 && (
        <OthersProfileActionSheet 
          toCallApiInfo={route?.params} 
          onUnsubscribePress={handleUnsubscribePress}
          isFetchingSubscription={isFetchingSubscription}
        />
      )}
      <UnSubscribeModal
        visible={unsubscribeModalVisible}
        onClose={() => setUnsubscribeModalVisible(false)}
        item={selectedItem}
        onSuccess={() => {
          // Handle success (could dispatch refresh if needed)
          dispatch(toggleRefreshOtherProfile());
          setUnsubscribeModalVisible(false);
        }}
      />
      {postActionSheetBottomSheetVisibility === 1 && <PostActionBottomSheet />}
      {commentBottomSheetVisibility === 1 && <CreateCommentBottomSheet fromPage={'otherProfile'} />}
      {otherProfileRatingSheetVisibility === 1 && <OtherProfileRatingSheet />}
    </>
  );
};

export default OtherProfileNew;

const styles = StyleSheet.create({
  profileContainer: {
    flex: 1,
    backgroundColor: '#fff',
    position: 'relative',
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff', // Semi-transparent black background
    justifyContent: 'center',

    zIndex: 9999, // High z-index to ensure it overlays everything
  },
  loaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    flex: 1,
  },
  loadingText: {
    color: '#1e1e1e',
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Rubik-SemiBold',
  },
});
