import { StyleSheet, Text, View, Share, Pressable, TouchableOpacity, FlatList, Linking, Vibration, Alert, Platform } from 'react-native';

import React, { useCallback, useEffect, useState } from 'react';
import { useFollowUserMutation, useGetRoomIdMutation, useLazyCreatorProfileQuery, useLazyCreatorRatingQuery, useLazyIsValidFollowQuery, useSubmitLinkToBrandMutation, useBlockUserMutation, useUnblockUserMutation, useLazyGetCreatorsPlanQuery } from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { useDispatch, useSelector } from 'react-redux';
import { responsiveFontSize, responsiveHeight, responsiveWidth } from 'react-native-responsive-dimensions';
import ReadMore from '@fawazahmed/react-native-read-more';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LoginPageErrors, chatRoomSuccess } from '../ErrorSnacks';
import OtherProfilePicture from '../MyProfile/OtherProfilePicture';
import { toggleOtherProfileActionSheet, toggleOtherProfileRatingSheet, toggleRefreshOtherProfile, toggleOtherProfileLoader, toggleRatingModal, toggleOtherProfileActionModal } from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import { setCacheByFilter, updateCacheRoomList } from '../../../Redux/Slices/NormalSlices/RoomListSlice';
import { navigate } from '../../../Navigation/RootNavigation';
import { autoLogout } from '../../../AutoLogout';
import { setOtherProfileUserInfo, setRating } from '../../../Redux/Slices/NormalSlices/OtherProfile/OtherProfileUserInfoSlice';
import { useLazyGetRoomListQuery } from '../../../Redux/Slices/QuerySlices/roomListSliceApi';
import { setHaveFollowedOrSubscribedOtherUser, setOtherProfileShareLink, setProfileDetails } from '../../../Redux/Slices/NormalSlices/Posts/ProfileFeedCacheSlice';
import share from 'react-native-share';

import { Image } from 'expo-image';
import AnimatedButton from '../AnimatedButton';
import { formatNiche, WIDTH_SIZES } from '../../../DesiginData/Utility';
import { ScrollView } from 'react-native-gesture-handler';
import { useMessageNavigation } from '../../Hook/useMessageNavigation';

//Ye share funciton stack navigation dwara use kiya ja raha hais

export const shareLink = async link => {
  console.log(link);

  try {
    let x = await share.open({
      url: `${link}`,
    });

    if (x.success) {
      chatRoomSuccess('Shared successfully!');
    }

    if (x.dismissedAction) {
      console.log('Did not share!');
    }
  } catch (e) {
    console.log(e?.message);
  }
};

const UpperOtherProfile = ({ toCallApiInfo }) => {
  const { userName } = toCallApiInfo;
  console.log('userinfos', userName);

  const [getUserProfileDetailsApi] = useLazyCreatorProfileQuery({ refetchOnFocus: true });
  const [followUser] = useFollowUserMutation();
  const [isValidFollow] = useLazyIsValidFollowQuery();
  const [getRoomId] = useGetRoomIdMutation();
  const [creatorRating] = useLazyCreatorRatingQuery();
  const [getRoomList] = useLazyGetRoomListQuery();
  const [getCreatorsPlan] = useLazyGetCreatorsPlanQuery();
  const [blockUser] = useBlockUserMutation();
  const [unblockUser] = useUnblockUserMutation();
  const [isFetchingSubscription, setIsFetchingSubscription] = useState(false);

  const loggedInUserRole = useSelector(state => state.auth.user.role);

  // const [userProfileDetails, setUserProfileDetails] = useState({});

  const token = useSelector(state => state.auth.user.token);

  const refresh = useSelector(state => state.hideShow.visibility.refreshOtherProfile);

  const { stateOne, stateTwo } = useSelector(state => state.hideShow.visibility.otherProfileLoader);

  const { profileDetails: userProfileDetails, haveSubscribed, haveFollowed } = useSelector(state => state.profileFeedCache.data);

  const [tempRating, setTempRating] = useState(0);

  const [msgClick, setMsgClick] = useState(false);

  const chatRoomObject = useSelector(state => state.roomList.data.none);

  const goChat = useMessageNavigation(token, userProfileDetails, chatRoomObject);

  const thisUserRating = useSelector(state => state.otherProfileUserInfo.rating);

  const getRating = async userData => {
    if (userData?.displayName) {
      // Pass false to force fresh fetch (skip RTK Query cache)
      const { data, error } = await creatorRating({ token, displayName: userData?.displayName }, false);

      if (data) {
        setTempRating(data?.data?.rating);
      }
    }
  };

  useEffect(() => {
    getRating(userProfileDetails);
  }, [userProfileDetails, thisUserRating]);

  const [isFollowing, setIsFollowing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const navigation = useNavigation();

  const dispatch = useDispatch();

  // useEffect(() => {
  //   navigation.addListener("blur", () => {
  //     dispatch(toggleOtherProfileLoader({ info: { stateOne: true, stateTwo: true, stateThree: true } }));
  //   });

  //   return navigation.removeListener("blur");
  // }, []);

  useEffect(() => {
    const listeners = navigation.addListener('blur', () => {
      dispatch(setRating({ rate: 0 }));
    });

    return () => navigation.removeListener(listeners);
  }, []);

  useEffect(() => {
    setIsFollowing(haveFollowed);
    setSubscribed(haveSubscribed);
    setIsBlocked(userProfileDetails?.isBlocked || false);
  }, [haveSubscribed, haveFollowed, userProfileDetails?.isBlocked]);

  const shareCard = useCallback(async name => { }, []);

  const handleFollow = useCallback(() => {
    console.log('xx');

    followUser({ token, displayName: toCallApiInfo?.userName })
      .then(e => {
        console.log(e, '::::');

        if (e?.data) {
          dispatch(setHaveFollowedOrSubscribedOtherUser({ type: 'follow', setFollow: true }));
        }

        if (e?.error?.data?.message?.search('Already') >= 0) {
          dispatch(setHaveFollowedOrSubscribedOtherUser({ type: 'follow', setFollow: true }));
        } else if (e?.error?.data?.status_code === 2044) {
          console.log('Logout');
        }
      })

      .catch(e => {
        console.log(e?.data);
      });
  }, [toCallApiInfo]);

  //   const handleMessageNavigation = useCallback(async () => {
  //   try {
  //     const data = {
  //       user_id: { user1: userProfileDetails?._id },
  //     };

  //     const e = await getRoomId({ token, data });

  //     if (e?.error?.status === 'FETCH_ERROR') {
  //       LoginPageErrors('Please check your network or go to chatroom to start conversation');
  //       return;
  //     }

  //     if (!e?.data?.statusCode) return;

  //     let chatRoomAndWidowDetails = {
  //       chatRoomId: e?.data?.data?._id,
  //       name: userProfileDetails?.displayName,
  //       profileImageUrl: userProfileDetails?.profile_image?.url,
  //       role: userProfileDetails?.role,
  //       id: userProfileDetails?._id,
  //     };

  //     if (Object?.keys(chatRoomObject)?.length === 0) {
  //       const { data, error } = await getRoomList({
  //         token,
  //         page: 1,
  //         sortBy: 'recent',
  //         filter: 'none',
  //       });

  //       if (data) {
  //         dispatch(setCacheByFilter({ type: 'none', data: data?.data?.rooms }));
  //       }

  //       if (error?.status === 'FETCH_ERROR') {
  //         LoginPageErrors('Please check your network');
  //       }
  //     } else {
  //       dispatch(
  //         updateCacheRoomList({
  //           chatRoomId: chatRoomAndWidowDetails?.chatRoomId,
  //           createdAt: e?.data?.data?.createdAt,
  //           message: e?.data?.data?.lastMessage?.hasAttachment ? '' : e?.data?.data?.lastMessage?.message,
  //           hasAttachment: e?.data?.data?.lastMessage?.hasAttachment,
  //           senderId: chatRoomAndWidowDetails?.id,
  //           profileImage: chatRoomAndWidowDetails?.profileImageUrl,
  //           userName: chatRoomAndWidowDetails?.name,
  //           role: chatRoomAndWidowDetails?.role,
  //         }),
  //       );
  //     }

  //     navigate('Chats', chatRoomAndWidowDetails); // ✅ works after room is ready
  //   } catch (err) {
  //     console.error('Error in handleMessageNavigation:', err);
  //     LoginPageErrors('Something went wrong. Please try again.');
  //   }
  // }, [token, userProfileDetails, chatRoomObject, dispatch, navigate]);

  async function subscribedOrFollowed(userName) {
    const { data, error } = await isValidFollow({ token, userName }, false);

    setSubscribed(data?.data?.subscribe);

    setIsFollowing(data?.data?.follow);

    dispatch(setHaveFollowedOrSubscribedOtherUser({ data: { haveSubscribed: data?.data?.subscribe, haveFollowed: data?.data?.follow } }));
  }

  async function getUserProfileDetails(toCallApiInfo) {
    let userDetail = await getUserProfileDetailsApi({ token, displayName: toCallApiInfo?.userName }, false);

    if (userDetail?.error?.data?.status_code === 2044) {
      autoLogout();
    }
    dispatch(setProfileDetails({ profileDetails: userDetail?.data?.data }));
  }

  useEffect(() => {
    async function callAll() {
      if (userName && userName !== 'undefined') {
        await subscribedOrFollowed(userName);
      }
      if (toCallApiInfo && toCallApiInfo?.userName && toCallApiInfo?.userName !== 'undefined') {
        await getUserProfileDetails(toCallApiInfo);
      }
    }

    callAll().then(e => {
      dispatch(toggleOtherProfileLoader({ info: { stateOne: false } }));
    });
  }, [toCallApiInfo, userName, refresh]);

  const handleRating = useCallback((userProfileDetails, isFollowing) => {
    console.log(userProfileDetails?.likes, 'hgsgdhsghdgshdg');

    if (isFollowing) {
      dispatch(setOtherProfileUserInfo({ userInfo: { displayName: userProfileDetails?.displayName, profilePirUrl: userProfileDetails?.profile_image?.url } }));
      dispatch(setRating({ rate: userProfileDetails?.likes }));
      dispatch(toggleRatingModal({ show: true }));
    } else {
      LoginPageErrors('Hey! Follow creator to rate');
    }
  }, []);

  const UserDetailMyProfile = useCallback(() => {
    console.log(userProfileDetails, '((((((099899999999');

    return (
      <View style={[styles.userDetailContainer, userProfileDetails?.role === 'creator' ? { marginTop: responsiveWidth(10) } : { marginTop: responsiveWidth(8) }]}>
        <Text style={styles.name}>{userProfileDetails?.fullName}</Text>

        {/* User Name */}
        <View style={styles.userName}>
          <View style={styles.userNameRow}>
            <Text style={styles.userNameTitle}>{userProfileDetails?.displayName}</Text>

            {userProfileDetails?.role === 'creator' && (
              <View style={{ height: 19, width: 19 }}>
                <Image source={require('../../../Assets/Images/verify.png')} contentFit="contain" style={{ flex: 1 }} />
              </View>
            )}
          </View>
        </View>

        {userProfileDetails?.role === 'creator' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creatorScrollContainer}>
            <View style={styles.creatorRow}>
              {/* Category Tag */}
              <View style={styles.categoryTag}>
                <Text style={styles.categoryText}>{formatNiche(userProfileDetails?.niche?.[0])}</Text>
              </View>

              {/* Followers */}
              <Pressable style={({ pressed }) => [styles.statItem, { backgroundColor: pressed ? '#FFEDE0' : '#fff' }]}>
                <View style={{ height: 16, width: 14 }}>
                  <Image source={require('../../../Assets/Images/follow.png')} contentFit="contain" style={{ flex: 1 }} />
                </View>
                <Text style={styles.statText}>{userProfileDetails?.followers?.count?.followers}</Text>
              </Pressable>

              {/* Likes */}
              <Pressable style={({ pressed }) => [styles.statItem, { backgroundColor: pressed ? '#FFEDE0' : '#fff' }]} onPress={() => handleRating(userProfileDetails, isFollowing)}>
                <View style={{ height: 16, width: 17 }}>
                  <Image source={require('../../../Assets/Images/star.png')} contentFit="contain" style={{ flex: 1 }} />
                </View>
                <Text style={styles.statText}>{Math.round(tempRating)}</Text>
              </Pressable>

              {/* Share Button */}
              <Pressable style={({ pressed }) => [styles.statItem, { backgroundColor: pressed ? '#FFEDE0' : '#fff' }]} onPress={() => shareLink(userProfileDetails?.deeplink?.link)}>
                <View style={{ height: 17, width: 22 }}>
                  <Image source={require('../../../Assets/Images/shares.png')} contentFit="contain" style={{ flex: 1 }} />
                </View>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </View>
    );
  }, [userProfileDetails, isFollowing, tempRating]);

  // const RatingSocialMyProfile = useCallback(() => {
  //   async function getCreatorsRating(userProfileDetails) {
  //     const {data, error} = await creatorRating({token, displayName: userProfileDetails?.displayName});
  //     dispatch(setRating({rate: data?.data?.rating}));
  //   }

  //   useEffect(() => {
  //     getCreatorsRating(userProfileDetails);
  //   }, [userProfileDetails]);

  //   return <View style={styles.socialRatingContainer}></View>;
  // }, [userProfileDetails, thisUserRating]);

  // Collapse 3+ consecutive newlines into 2, trim, and cap at 10 lines
  const sanitizeBio = (text) => {
    if (!text) return text;
    let cleaned = text.replace(/\n{3,}/g, '\n\n').trim();
    const lines = cleaned.split('\n');
    if (lines.length > 10) {
      cleaned = lines.slice(0, 10).join('\n') + '...';
    }
    return cleaned;
  };

  const BioMyProfile = useCallback(() => {
    // Don't show bio for blocked profiles (when displayName is undefined)
    if (!userProfileDetails?.displayName) {
      return null;
    }

    // Default bio text if none is provided
    const defaultBio = 'Sharing unique content and engaging with my community. Join me on this journey! 🌟🎨';
    const rawBio = userProfileDetails?.aboutUser || defaultBio;
    const bioText = sanitizeBio(rawBio);

    return (
      <View style={styles.bioContainer}>
        <ReadMore animate numberOfLines={5} style={styles.bioText} seeMoreStyle={styles.seeMoreLess} seeLessStyle={styles.seeMoreLess}>
          {bioText}
        </ReadMore>
        {userProfileDetails?.username && <Text style={styles.usernameLink}>@{'YellowDimond'}</Text>}
      </View>
    );
  }, [userProfileDetails]);

  const OnlineShare = useCallback(() => {
    return (
      <View style={styles.onlineContainer}>
        <Pressable onPress={() => shareCard(userProfileDetails?.deeplink?.link)}>{/* <DIcon provider={"Octicons"} name={"share-android"} size={responsiveWidth(4.5)} /> */}</Pressable>
      </View>
    );
  }, [userProfileDetails]);

  const handleBlockUser = useCallback(async () => {
    try {
      const data = {
        id: userProfileDetails?._id,
      };
      const response = await blockUser({ token, data });

      if (response?.data) {
        setIsBlocked(true);
        chatRoomSuccess('User blocked successfully');
      } else if (response?.error) {
        LoginPageErrors(response?.error?.data?.message || 'Failed to block user');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      LoginPageErrors('An error occurred while blocking user');
    }
  }, [userProfileDetails, token]);

  const handleUnblockUser = useCallback(async () => {
    try {
      const data = {
        id: userProfileDetails?._id,
      };
      const response = await unblockUser({ token, data });

      if (response?.data) {
        setIsBlocked(false);
        chatRoomSuccess('User unblocked successfully');
      } else if (response?.error) {
        LoginPageErrors(response?.error?.data?.message || 'Failed to unblock user');
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      LoginPageErrors('An error occurred while unblocking user');
    }
  }, [userProfileDetails, token]);

  const BlockButton = useCallback(() => {
    // Check if profile is already blocked (API returns undefined values)
    const isProfileBlocked = !userProfileDetails?.displayName || !userProfileDetails?._id;

    if (isProfileBlocked) {
      return (
        <View style={[styles.btnContainer, { width: '100%', justifyContent: 'center', paddingHorizontal: responsiveWidth(6.3), marginTop: responsiveWidth(3) }]}>
          <AnimatedButton
            title="Go to Blocked List"
            style={[styles.blockButton]}
            buttonMargin={4}
            showOverlay={false}
            onPress={() => {
              navigation.replace('settingsPage');
            }}
          />
        </View>
      );
    }

    return (
      <View style={[styles.btnContainer, { width: '100%', justifyContent: 'center', paddingHorizontal: responsiveWidth(6.3), marginTop: responsiveWidth(3) }]}>
        <AnimatedButton
          title={isBlocked ? 'Unblock User' : 'Block User'}
          style={[styles.blockButton]}
          buttonMargin={4}
          showOverlay={false}
          onPress={isBlocked ? handleUnblockUser : handleBlockUser}
          icon={<Image source={require('../../../Assets/Images/block.png')} style={{ width: 20, height: 20, marginRight: 8 }} />}
        />
      </View>
    );
  }, [isBlocked, handleBlockUser, handleUnblockUser, userProfileDetails]);

  const MessageSubButton = useCallback(() => {
    if (!isFollowing) {
      return (
        <View style={[styles.btnContainer, { width: '100%', justifyContent: 'center' }]}>
          <AnimatedButton title="Follow" style={[styles.subscribeButton]} buttonMargin={4} showOverlay={false} onPress={handleFollow} />
        </View>
      );
    }

    return (
      <View style={styles.btnContainer}>
        {/* Subscribe Button (if not subscribed) */}
        {!subscribed && (
          <AnimatedButton
            title="Subscribe"
            style={[styles.subscribeButton]}
            buttonMargin={4}
            showOverlay={false}
            loading={isFetchingSubscription}
            onPress={async () => {
              try {
                setIsFetchingSubscription(true);
                // Pre-fetch plans before navigating
                await getCreatorsPlan({ token, id: userProfileDetails?._id });
                navigate('subscribeCreator', {
                  name: userProfileDetails?.displayName,
                  profileImageUrl: userProfileDetails?.profile_image?.url,
                  role: userProfileDetails?.role,
                  id: userProfileDetails?._id,
                });
              } catch (error) {
                console.error('Error pre-fetching subscription data:', error);
                // Navigate anyway even if pre-fetch fails
                navigate('subscribeCreator', {
                  name: userProfileDetails?.displayName,
                  profileImageUrl: userProfileDetails?.profile_image?.url,
                  role: userProfileDetails?.role,
                  id: userProfileDetails?._id,
                });
              } finally {
                setIsFetchingSubscription(false);
              }
            }}
          />
        )}

        {/* Message Button (Centered) */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <AnimatedButton title="Message" style={[styles.messageButton]} buttonMargin={4} showOverlay={false} onPress={goChat} />
        </View>

        {/* Three Dots Button (Right-Aligned) */}
        <View style={{ justifyContent: 'center' }}>
          <Pressable
            onPress={() => {
              dispatch(toggleOtherProfileActionSheet({ info: { show: 1, subscribed } }));
              dispatch(toggleOtherProfileActionModal({ show: true }));
            }}
            style={({ pressed }) => ({
              height: 16,
              width: 14,
              opacity: pressed ? 0.5 : 1,
            })}>
            <Image source={require('../../../Assets/Images/threeDots.png')} contentFit="contain" style={{ flex: 1 }} />
          </Pressable>
        </View>
      </View>
    );
  }, [userProfileDetails, isFollowing, subscribed, loggedInUserRole]);

  return (
    <View style={{ backgroundColor: '#fff' }}>
      <OtherProfilePicture displayName={userProfileDetails?.displayName} userId={userProfileDetails?._id} />
      <UserDetailMyProfile />
      <View style={{ flexDirection: 'column' }}>
        <BioMyProfile />
      </View>
      {/* {userProfileDetails?.role === 'creator' && <RatingSocialMyProfile />} */}
      {userProfileDetails?.role === 'creator' ? <MessageSubButton /> : (
        <View>
          <BlockButton />
        </View>
      )}
    </View>
  );
};

export default UpperOtherProfile;

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    // marginTop: responsiveWidth(4),
    backgroundColor: 'red',
  },

  loginButton: {
    padding: Platform.OS === 'ios' ? responsiveWidth(2) : null,

    // paddingHorizontal: responsiveWidth(2),
    backgroundColor: '#FFA86B',
    borderRadius: responsiveWidth(3.2),
    borderColor: '#1e1e1e',
    color: '#1e1e1e',
    textAlign: 'center',
    fontFamily: 'Rubik-Medium',
    width: responsiveWidth(40.8),
    height: responsiveWidth(9.8),
    fontSize: responsiveFontSize(2),
    overflow: 'hidden',
    marginTop: responsiveWidth(1),
    borderWidth: responsiveWidth(0.3),
  },
  threeDots: {
    width: responsiveWidth(6),
  },
  upperProfileContainer: {
    height: responsiveWidth(70),
    borderWidth: 1,
    backgroundColor: 'white',
  },
  socialRatingContainer: {
    color: '#282828',
    paddingHorizontal: responsiveWidth(3.5),
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: responsiveWidth(2),
  },

  onlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: responsiveWidth(5),
    marginTop: responsiveWidth(3),
    paddingHorizontal: responsiveWidth(4),
    height: responsiveWidth(10),
    width: responsiveWidth(85),
    borderRadius: responsiveWidth(3),
    borderWidth: responsiveWidth(0.5),
  },
  userName: {
    flexDirection: 'row',
    alignItems: 'center',
    width: responsiveWidth(50),
    gap: responsiveWidth(1),
    fontFamily: 'Rubik',
  },
  seeMoreLess: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'MabryPro-Medium',
    color: '#ffa07a',
    marginTop: responsiveWidth(2),
  },
  intdustryCategoryText: {
    borderColor: '#FE0BAC',
    backgroundColor: '#FFD6F1',
    paddingHorizontal: responsiveWidth(2),
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: responsiveWidth(5),
    paddingVertical: responsiveWidth(1.5),
    borderWidth: responsiveWidth(0.5),
  },
  userDetailContainer: {
    paddingHorizontal: WIDTH_SIZES[24],
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor : 'red',
    marginBottom: 4,
  },
  userNameTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#282828',
    marginRight: responsiveWidth(1),
    fontFamily: 'Rubik-SemiBold',
  },
  creatorInfo: {
    marginTop: responsiveWidth(3),
    marginRight: responsiveWidth(2),
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(2),
    paddingRight: responsiveWidth(1),
    // backgroundColor : 'red',
    // marginBottom : 4,
    width: '100%',
  },
  categoryTag: {
    backgroundColor: '#FFD6F1',
    borderColor: '#FE0BAC',
    borderWidth: 1.5,
    borderRadius: responsiveWidth(5),
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    paddingHorizontal: 15,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryText: {
    color: '#FE0BAC',
    fontSize: 13,
    fontFamily: 'Rubik-Medium',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#1e1e1e',
    borderWidth: 1.5,
    borderRadius: responsiveWidth(5),
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    paddingHorizontal: responsiveWidth(4),
    height: 35,
  },
  statText: {
    marginLeft: responsiveWidth(1),
    color: '#1e1e1e',
    fontSize: 13,
    fontFamily: 'Rubik-SemiBold',
    verticalAlign: 'middle',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#1e1e1e',
    borderWidth: 1,
    borderRadius: responsiveWidth(5),
    paddingVertical: responsiveWidth(1.5),
    paddingHorizontal: responsiveWidth(3),
  },
  bioContainer: {
    marginTop: responsiveWidth(3),
    // paddingHorizontal: responsiveWidth(4),
    // backgroundColor: 'green',
    borderRadius: 8,
    marginBottom: 8,
    width: responsiveWidth(88),
    alignSelf: 'center',
  },
  bioText: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    lineHeight: 18,
  },
  seeMoreLess: {
    fontSize: responsiveFontSize(2),
    fontFamily: 'Rubik-Medium',
    color: '#FE0BAC',
    marginTop: responsiveWidth(1),
  },
  usernameLink: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Medium',
    color: '#FE0BAC',
    marginTop: responsiveWidth(1.5),
  },
  name: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    color: '#1e1e1e',
    marginVertical: 6,
    textAlign: 'left',
  },

  btnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: responsiveWidth(6.3),
    marginTop: 4,
    marginBottom: responsiveWidth(2.1),
    height: responsiveWidth(10),
  },

  subscribeButton: {
    backgroundColor: 'rgba(255, 168, 107, 1)',
    borderColor: '#1e1e1e',
    width: responsiveWidth(35),
    height: responsiveWidth(9.8),
    borderWidth: 2,
  },

  messageButton: {
    backgroundColor: 'white',
    borderColor: '#1e1e1e',
    borderWidth: 2,
    width: responsiveWidth(35),
    height: responsiveWidth(9.8),
    borderRadius: responsiveWidth(3.2),
  },

  blockButton: {
    backgroundColor: '#FFA86B',
    borderColor: '#1e1e1e',
    borderWidth: 2,
    width: responsiveWidth(87.4),
    height: responsiveWidth(9.8),
    borderRadius: responsiveWidth(3.2),
  },

  menuIcon: {
    marginLeft: responsiveWidth(2),
    marginBottom: 16,
  },
  creatorScrollContainer: {
    marginTop: responsiveWidth(1.8),
    // backgroundColor : 'red',
    paddingHorizontal: 0,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
});
