import { StyleSheet, Text, View, ScrollView, FlatList, Dimensions, Image, Button, Alert } from 'react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import SettingsPage from '../Src/Screens/SettingsPage';
import FeedPostComponent from '../Src/Components/PostComponents/FeedPostComponent';
import GridFeedPostComponent from '../Src/Components/PostComponents/GridFeedPostComponent';
import WishListPostComponent from '../Src/Components/PostComponents/WishListPostComponent';
import { responsiveWidth } from 'react-native-responsive-dimensions';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import UpperProfile from '../Src/Components/MyProfile/UpperProfile';

import { useDispatch, useSelector } from 'react-redux';
import WishListPreviewModal from '../Src/Components/MyProfile/WishListPreviewModal';
import PostTipModal from '../Src/Components/HomeComponents/PostTipModal';
import CreateCommentBottomSheet from '../Src/Components/HomeComponents/CreateCommentBottomSheet';
import PostActionBottomSheet from '../Src/Components/HomeComponents/PostActionBottomSheet';
import TipSheet from '../Src/Components/PostComponents/TipSheet';
import { useLazyContactInfoQuery, useLazyMyPostListQuery } from '../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { setFeedCacheMyPost, manipulateTotalPagesMyPost, manipulateCurrentPageMyPost } from '../Redux/Slices/NormalSlices/Posts/MyProfileFeedCacheSlice';

import { Tabs, MaterialTabBar } from 'react-native-collapsible-tab-view';
import FAbout from '../Assets/Images/ProfileTab/fabout.svg';
import UFAbout from '../Assets/Images/ProfileTab/ufabout.svg';
import FPost from '../Assets/Images/ProfileTab/fpost.svg';
import UFPost from '../Assets/Images/ProfileTab/ufpost.svg';
import FWishlist from '../Assets/Images/ProfileTab/fwishlist.svg';
import UFWishlist from '../Assets/Images/ProfileTab/ufwishlist.svg';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import ProfileUser from '../Src/Components/MyProfile/ProfileUser';
import { useContactInfo } from '../Src/Hook/FeeSetupUpdate';

const showContentList = [
  {
    id: 1,
    uri: require('../Assets/Images/post.png'),
    uriFocus: require('../Assets/Images/postFocus.png'),
  },

  {
    id: 2,
    uri: require('../Assets/Images/grid.png'),
    uriFocus: require('../Assets/Images/gridFocus.png'),
  },

  {
    id: 3,
    uri: require('../Assets/Images/wishlist.png'),
    uriFocus: require('../Assets/Images/wishlistFocus.png'),
  },
];

const TopTabNavigation = ({ notificationData }) => {
  const [isFocused, setIsFocused] = useState(false); // Track focus state
  const userInformation = useSelector(state => state.auth.user);

  const navigation = useNavigation();

  const tabsRef = useRef(null);

  // const [contactInfo] = useLazyContactInfoQuery();

  const { fetchContactInfo } = useContactInfo(userInformation?.token, userInformation?.currentUserId);

  const handleTabChange = tabIndex => {
    tabsRef.current?.setIndex(tabIndex);
  };

  useFocusEffect(
    useCallback(() => {
      if (notificationData?.from === 'notification') {
        handleTabChange(2);
        navigation.setParams({ from: undefined });

        return;
      }
    }, [handleTabChange, notificationData]),
  );

  // Re-render the header whenever the screen/tab gains focus
  useFocusEffect(
    useCallback(() => {
      console.log('Tab or screen is focused');
      setIsFocused(true); // Set focus state to true

      // Optional: Cleanup function when the screen/tab loses focus
      return () => {
        console.log('Tab or screen is unfocused');
        setIsFocused(false); // Set focus state to false
      };
    }, []),
  );

  const [postList] = useLazyMyPostListQuery();

  const token = useSelector(state => state.auth.user.token);

  const dispatch = useDispatch();

  const [currentTab, setCurrentTab] = useState('profile');

  const commentBottomSheetVisibility = useSelector(state => state.hideShow.visibility.commentBottomSheet.show);
  const postActionSheetBottomSheetVisibility = useSelector(state => state.hideShow.visibility.postActionBottomSheet.show);
  const whoTippedSheetVisibility = useSelector(state => state.hideShow.visibility.whoTippedSheet.show);
  const wishListPreviewModalVisibility = useSelector(state => state.hideShow.visibility.wishListPreviewModal);
  const postTipModalVisibility = useSelector(state => state.hideShow.visibility.sendPostTipsModal.show);


  useEffect(() => {
    fetchContactInfo();
  }, []);

  const getPostList = async () => {
    let { data: postData } = await postList({ token }, false);

    if (postData) {
      let pinnedPost = postData?.data?.pinnedPosts.map(x => ({
        ...x,
        pinned: true,
      }));

      let combinedPinnedUnPinnedPosts = [...pinnedPost, ...postData?.data?.posts];
      dispatch(setFeedCacheMyPost({ data: combinedPinnedUnPinnedPosts }));

      if (postData?.data?.metadata?.[0]) {
        const meta = postData.data.metadata[0];
        const totalPages = Math.ceil(meta.total / meta.limit);
        dispatch(manipulateTotalPagesMyPost({ currentTotalPage: totalPages }));
        dispatch(manipulateCurrentPageMyPost({ currentPage: 1 }));
      }
    }
  };

  useEffect(() => {
    getPostList();
  }, [token]);

  return (
    <>
      {(userInformation?.role === 'creator' || userInformation?.role === 'admin') && (
        <Tabs.Container ref={tabsRef} renderTabBar={props => <MaterialTabBar {...props} indicatorStyle={{ backgroundColor: '#1E1E1E', height: responsiveWidth(0.4) }} />} renderHeader={() => <UpperProfile isFocused={isFocused} />} onTabChange={({ tabName }) => setCurrentTab(tabName)}>
          <Tabs.Tab name="profile" label={({ name }) => (currentTab === name ? <FAbout /> : <UFAbout />)}>
            <FeedPostComponent />
          </Tabs.Tab>

          <Tabs.Tab name="post" label={({ name }) => (currentTab === name ? <FPost size={10} /> : <UFPost />)}>
            <GridFeedPostComponent />
          </Tabs.Tab>

          <Tabs.Tab name="wishlist" label={({ name }) => (currentTab === name ? <FWishlist size={10} /> : <UFWishlist />)}>
            <WishListPostComponent wishlistId={notificationData?.wishlistScrollId} />
          </Tabs.Tab>
        </Tabs.Container>
      )}

      {userInformation?.role !== 'creator' && userInformation?.role !== 'admin' && (
        <FlatList
          data={[]} // No actual list data
          renderItem={null} // Nothing to render
          keyExtractor={() => 'dummy'}
          ListHeaderComponent={
            <>
              <UpperProfile isFocused={isFocused} />
              <ProfileUser />
            </>
          }
          showsVerticalScrollIndicator={false}
          style={{backgroundColor: '#fff'}}
          contentContainerStyle={{backgroundColor: '#fff'}}
        />
      )}


      {wishListPreviewModalVisibility && <WishListPreviewModal />}
      {postTipModalVisibility && <PostTipModal />}
      <CreateCommentBottomSheet fromPage={'myProfilePost'} />
      {postActionSheetBottomSheetVisibility === 1 && <PostActionBottomSheet />}
      {whoTippedSheetVisibility === 1 && <TipSheet />}
    </>
  );
};

export default TopTabNavigation;
