import { StyleSheet, Text, View, Image, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import React, { useState } from "react";
import { responsiveWidth } from "react-native-responsive-dimensions";
import OtherProfilePicture from "../Components/MyProfile/OtherProfilePicture";
import UserDetailMyProfile from "../Components/MyProfile/UserDetailMyProfile";
import RatingSocialMyProfile from "../Components/MyProfile/RatingSocialMyProfile";
import BioMyProfile from "../Components/MyProfile/BioMyProfile";
import ChooseContentMyProfile from "../Components/MyProfile/ChooseContentMyProfile";
import { useLazyCreatorProfileQuery, useLazyCreatorRatingQuery, useLazyGetWishListQuery, useLazyIsValidFollowQuery, useLazyMyPostListQuery, useLazyOtherPostListQuery } from "../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi";
import { token as memoizedToken } from "../../Redux/Slices/NormalSlices/AuthSlice";
import { useDispatch, useSelector } from "react-redux";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useCallback } from "react";
import DIcon from "../../DesiginData/DIcons";
import PostCards from "../Components/HomeComponents/PostCards";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import WishList from "../Components/MyProfile/WishList";
import { toggleCreatePostBottomSheet, toggleHomeBottomSheet, toggleRefreshOtherProfile, toggleWishListSheet } from "../../Redux/Slices/NormalSlices/HideShowSlice";
import WishListCard from "../Components/MyProfile/WishListCard";
import MessageSubButton from "../Components/MyProfile/MessageSubButton";
import { configureStore } from "@reduxjs/toolkit";
import ProfileActionModal from "../Components/MyProfile/ProfileActionModal";
import AreYouSure from "../Components/AreYouSure";
import UnSubscribeModal from "../Components/MyProfile/UnSubscribeModal";

const OthersProfile = ({ route }) => {


  console.log(route?.params, "OTHER")


  const [isFollowing, setIsFollowing] = useState(false);

  const [otherPostList, { error }] = useLazyOtherPostListQuery({ refetchOnFocus: true });

  const [getUserProfileDetailsApi, { error: getUserProfileError }] = useLazyCreatorProfileQuery({ refetchOnFocus: true });

  const [getRatingsApi, { error: ratingsError }] = useLazyCreatorRatingQuery({ refetchOnFocus: true });

  const [getWishList, { error: wishListError }] = useLazyGetWishListQuery({ refetchOnFocus: true });

  const [isValidFollow] = useLazyIsValidFollowQuery();

  const currentContentIndex = useSelector((state) => state.currentMyProfileContent.content.index);

  const displayName = useSelector((state) => state.auth.user);

  const [posts, setPosts] = useState([]);

  const [pinPosts, setPinPosts] = useState([]);

  const [wishList, setWishList] = useState([]);

  const [userProfileDetails, setUserProfileDetails] = useState({});

  const [ratings, setRatings] = useState(0);

  const [areYouSureModal, setAreYouSureModal] = useState(false);

  const [donateData, setDonateData] = useState({});

  const [subscribed, setSubscribed] = useState(false);

  const [unsubscribeModalVisible, setUnsubscribeModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const token = useSelector(state => state.auth.user.token);

  const navigation = useNavigation();

  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);

  const refreshOtherProfile = useSelector(state => state.hideShow.visibility.refreshOtherProfile);

  useFocusEffect(
    useCallback(() => {
      async function doSubscribed() {
        const { data, error } = await isValidFollow({ token, userName: route?.params?.userName }, false);

        setSubscribed(data?.data?.subscribe);
        setIsFollowing(data?.data?.follow);
      }

      doSubscribed();

      async function getPostList() {
        let { data: postData } = await otherPostList({ token, userName: route?.params?.userName }, false);

        if (postData) {
          setPosts(postData?.data?.posts);

          setPinPosts(
            postData?.data?.pinnedPosts.map((x, i) => {
              return {
                ...x,
                pinned: true,
              };
            })
          );
        }

        setLoading(false);
      }

      getPostList();

      async function getUserProfileDetails() {
        let userDetail = await getUserProfileDetailsApi({ token, displayName: route?.params?.userName }, false);

        console.log(userDetail?.data?.data);

        setUserProfileDetails(userDetail?.data?.data);
      }

      getUserProfileDetails();

      async function getUserRatings() {
        let rating = await getRatingsApi({ token, displayName: route?.params?.userName }, false);

        setRatings(rating?.data?.data?.rating);
      }
      getUserRatings();

      async function wishListCall() {
        let list = await getWishList({ token, userId: route?.params?.userId }, false);
        setWishList(list?.data?.data?.items);
      }

      wishListCall();
    }, [isFollowing, refreshOtherProfile])
  );

  //Just to remove homeBottomSheet
  useFocusEffect(
    useCallback(() => {
      dispatch(toggleHomeBottomSheet({ show: -1 }));
      dispatch(toggleCreatePostBottomSheet({ show: -1 }));
      dispatch(toggleWishListSheet({ show: -1 }));
    }, [])
  );

  const [getCashfreeSub] = useLazyGetCashfreeSubscriptionQuery();
  const [isFetchingSubscription, setIsFetchingSubscription] = useState(false);

  const handleUnsubscribePress = useCallback(async () => {
    const creatorId = userProfileDetails?._id;
    if (!creatorId) return;

    setIsFetchingSubscription(true);
    try {
      await getCashfreeSub({ token, creatorId }).unwrap();
      setSelectedItem({
        userDetails: userProfileDetails,
        creatorId: userProfileDetails?._id,
        creatorName: userProfileDetails?.displayName,
      });
      dispatch(toggleProfileAction());
      setTimeout(() => {
        setUnsubscribeModalVisible(true);
      }, 300);
    } catch (error) {
      console.error('Error prefetching subscription details:', error);
      setSelectedItem({
        userDetails: userProfileDetails,
        creatorId: userProfileDetails?._id,
        creatorName: userProfileDetails?.displayName,
      });
      dispatch(toggleProfileAction());
      setTimeout(() => {
        setUnsubscribeModalVisible(true);
      }, 300);
    } finally {
      setIsFetchingSubscription(false);
    }
  }, [userProfileDetails, token]);

  const onUnsubscribePress = () => {
    handleUnsubscribePress();
  };

  const GridPostComponent = useCallback(({ item }) => {
    return item?.post_content_files?.[0]?.format === "image" ? (
      <TouchableOpacity style={styles.gridEachImageContainer} onPress={() => navigation.navigate("singlepost", { item })}>
      </TouchableOpacity>
    ) : (
      <TouchableOpacity style={[styles.gridEachImageContainer, { position: "relative" }]} onPress={() => navigation.navigate("singlepost", { item })}>
        <View style={{ justifyContent: "center", alignItems: "center", width: responsiveWidth(10), height: responsiveWidth(10), position: "absolute", left: "30%", top: "35%", zIndex: 3 }}>
          <DIcon provider={"AntDesign"} name={"play"} size={responsiveWidth(8)} color={"white"} />
        </View>
        <Image source={!item?.video?.thumbnail?.url ? require("../../Assets/Images/DefaultPost.jpg") : { uri: item?.video?.thumbnail?.url }} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
      </TouchableOpacity>
    );
  }, []);



  if(loading) {
    return (
      <View style = {{flex : 1, justifyContent : 'center', alignItems : 'center', backgroundColor : "#fffaf0"}}>
          <ActivityIndicator size={'small'} color={'#ffa07a'} />
      </View>
    )
  }


  if (userProfileDetails?.role === "creator") {

    if (posts?.length === 0 && pinPosts?.length === 0) {
      return (
        <GestureHandlerRootView style={styles.profileContainer}>
          <OtherProfilePicture userProfileDetails={userProfileDetails} />

          <UserDetailMyProfile userProfileDetails={userProfileDetails} />

          <RatingSocialMyProfile userProfileDetails={userProfileDetails} ratings={ratings} />

          <BioMyProfile userProfileDetails={userProfileDetails} />

          <MessageSubButton subscribed={subscribed} isFollowing={isFollowing} setIsFollowing={setIsFollowing} token={token} userName={route?.params?.userName} userProfileDetails={userProfileDetails} />

          {isFollowing && <ChooseContentMyProfile />}

          {isFollowing && (
            <View style={{ height: responsiveWidth(60), width: responsiveWidth(60), justifyContent: "center", alignItems: "center", alignSelf: "center", marginTop: responsiveWidth(10) }}>
              <Text style={{ fontFamily: "MabryPro-Regular", color: "#282828" }}>Sorry no items to show.</Text>
            </View>
          )}
        </GestureHandlerRootView>
      );
    } else {
      return (
        <GestureHandlerRootView style={styles.profileContainer}>
          {currentContentIndex === 0 ? (
            <>
              <FlatList
                ListHeaderComponent={() => {
                  return (
                    <>
                      <OtherProfilePicture userProfileDetails={userProfileDetails} />
                      <UserDetailMyProfile userProfileDetails={userProfileDetails} />
                      <RatingSocialMyProfile areYouSureModal={areYouSureModal} userProfileDetails={userProfileDetails} ratings={ratings} isDisabled={!isFollowing || route?.params?.userId === displayName?.currentUserId ? true : false} token={token} userName={route?.params?.userName} />

                      <BioMyProfile userProfileDetails={userProfileDetails} />

                      <MessageSubButton subscribed={subscribed} isFollowing={isFollowing} setIsFollowing={setIsFollowing} token={token} userName={route?.params?.userName} userProfileDetails={userProfileDetails} />

                      {isFollowing && <ChooseContentMyProfile />}

                      <AreYouSure setAreYouSureModal={setAreYouSureModal} />

                      <View style={{ marginBottom: responsiveWidth(8) }}></View>
                    </>
                  );
                }}
                data={isFollowing ? [...pinPosts, ...posts] : []}
                renderItem={({ item, index }) => <PostCards item={item} />}
                keyExtractor={(item) => {
                  return item?._id;
                }}
                estimatedItemSize={556}
                showsVerticalScrollIndicator={false}
                horizontal={false}
              />
            </>
          ) : currentContentIndex === 1 ? (
            <FlatList
              data={isFollowing ? posts : []}
              ListHeaderComponent={() => {
                return (
                  <>
                    <OtherProfilePicture userProfileDetails={userProfileDetails} />
                    <UserDetailMyProfile userProfileDetails={userProfileDetails} />
                    <RatingSocialMyProfile areYouSureModal={areYouSureModal} userProfileDetails={userProfileDetails} ratings={ratings} />
                    <BioMyProfile userProfileDetails={userProfileDetails} />
                    <MessageSubButton subscribed={subscribed} isFollowing={isFollowing} setIsFollowing={setIsFollowing} token={token} userName={route?.params?.userName} userProfileDetails={userProfileDetails} />
                    {isFollowing && <ChooseContentMyProfile />}
                    <AreYouSure setAreYouSureModal={setAreYouSureModal} />
                    <View style={{ marginBottom: responsiveWidth(8) }}></View>
                  </>
                );
              }}
              renderItem={({ item, index }) => <GridPostComponent item={item} />}
              keyExtractor={(item) => item?._id}
              numColumns={3}
            />
          ) : (
            <FlatList
              ListHeaderComponent={() => {
                return (
                  <>
                    <OtherProfilePicture userProfileDetails={userProfileDetails} />
                    <UserDetailMyProfile userProfileDetails={userProfileDetails} />
                    <RatingSocialMyProfile areYouSureModal={areYouSureModal} userProfileDetails={userProfileDetails} ratings={ratings} />
                    <BioMyProfile userProfileDetails={userProfileDetails} />
                    <MessageSubButton subscribed={subscribed} isFollowing={isFollowing} setIsFollowing={setIsFollowing} token={token} userName={route?.params?.userName} userProfileDetails={userProfileDetails} />
                    {isFollowing && <ChooseContentMyProfile />}
                    <AreYouSure setAreYouSureModal={setAreYouSureModal} />
                    <View style={{ marginBottom: responsiveWidth(8) }}></View>
                  </>
                );
              }}
              data={isFollowing ? wishList : []}
              renderItem={({ item, index }) => <WishListCard item={item} setDonateData={setDonateData} pressDisabled={false} />}
              key={(item) => item?._id}
              showsVerticalScrollIndicator={false}
            />
          )}

          <ProfileActionModal 
            setIsFollowing={setIsFollowing} 
            isFollowing={isFollowing} 
            token={token} 
            userName={route?.params?.userName} 
            setSubscribed={setSubscribed} 
            onUnsubscribePress={handleUnsubscribePress}
            subscribed={subscribed}
            isFetchingSubscription={isFetchingSubscription}
          />

          <UnSubscribeModal
            visible={unsubscribeModalVisible}
            onClose={() => setUnsubscribeModalVisible(false)}
            item={selectedItem}
            onSuccess={() => {
              dispatch(toggleRefreshOtherProfile());
              setSubscribed(false);
              setUnsubscribeModalVisible(false);
            }}
          />
        </GestureHandlerRootView>
      );
    }
  } else {
    return (
      <GestureHandlerRootView style={styles.profileContainer}>
        <OtherProfilePicture userProfileDetails={userProfileDetails} />
        <UserDetailMyProfile userProfileDetails={userProfileDetails} />
        <BioMyProfile userProfileDetails={userProfileDetails} />
      </GestureHandlerRootView>
    );
  }
};

export default OthersProfile;

const styles = StyleSheet.create({
  profileContainer: {
    flex: 1,
    backgroundColor: "#fffaf0",
    borderTopColor: "#282828",
    borderTopWidth: 1,
    paddingHorizontal: responsiveWidth(2),
    paddingTop: responsiveWidth(2),
  },
  gridView: {
    marginTop: 10,
    flex: 1,
  },
  gridEachImageContainer: {
    width: responsiveWidth(30),
    height: responsiveWidth(30),
    margin: responsiveWidth(1),
    overflow: "hidden",
    borderRadius: responsiveWidth(2),
    borderWidth: 2,
  },
});
