import {StyleSheet, Text, View, TouchableOpacity, Dimensions, Pressable} from 'react-native';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {responsiveWidth, responsiveFontSize, responsiveHeight} from 'react-native-responsive-dimensions';
import DIcon from '../../../DesiginData/DIcons';
import Moment from 'react-moment';

import {Gesture} from 'react-native-gesture-handler';
import {GestureDetector} from 'react-native-gesture-handler';
import Animated, {runOnJS, useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';
import {useNavigation, useNavigationState} from '@react-navigation/native';
import {useLazyGetAllCommentsQuery, useLazyGetSelfLikeQuery, useLazyIsValidFollowQuery, useLikeApiMutation, usePostPaymentMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useDispatch, useSelector} from 'react-redux';
import {setCurrentVideoPlayId, toggleCommentBottomSheet, toggleLoadingComments, togglePostActionBottomSheet, toggleSendPostTipModal, toggleWhoTippedSheet} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import Pinchable from 'react-native-pinchable';
import {LoginPageErrors, chatRoomSuccess} from '../ErrorSnacks';
import {savePostComments, setCurrentCommentDetails, setTotalPages} from '../../../Redux/Slices/NormalSlices/CurrentCommentSlice';
import {navigate} from '../../../Navigation/RootNavigation';
import {memo} from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {likeDislike, unlockPost} from '../../../Redux/Slices/NormalSlices/Home/FeedCacheSlice';
import {autoLogout} from '../../../AutoLogout';
import share from 'react-native-share';
import Play from '../../../Assets/svg/play.svg';

import {Image} from 'expo-image';
import Carousel from 'react-native-reanimated-carousel';
import MentionText from '../MentionText';

let timer;

const handlePostActionHandler = async (postId, image, displayName, description) => {
  console.log(postId, image, displayName, '{}{}{}{}');

  try {
    let x = await share.open({
      url: `https://link.fahdu.com/go/post/${postId}`,
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

const PostCards = ({item, index, token}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [postPayment, {isLoading: isUnlocking}] = usePostPaymentMutation();
  const [unlockClick, setUnlockClick] = useState(false);
  const [unlockedFiles, setUnlockedFiles] = useState(item?.post_content_files);

  useEffect(() => {
    setUnlockedFiles(item?.post_content_files);
  }, [item?.post_content_files]);

  console.log(item);
  console.log('UNLOCK_SETTINGS_DEBUG:', item?._id, item?.unlockSettings, 'is_charagble:', item?.is_charagble, 'for_subscribers:', item?.for_subscribers);

  const screenName = useNavigationState(state => state.routes[state.index].name);

  const dispatch = useDispatch();

  const {comments} = useSelector(state => state.currentComment.content);

  const [showHeart, setShowHeart] = useState(false);

  const [doLiked, setDoLiked] = useState(item?.has_liked);

  const heartSize = useSharedValue(0);

  const heartDisplay = useSharedValue('flex');

  const currentUserInfo = useSelector(state => state.auth.user);

  const [likeApi] = useLikeApiMutation();

  const [likeCount, setLikeCount] = useState(item?.count?.likes);

  const [commentCount, setCommentCounts] = useState(item?.count?.comments);


  const [getAllComments] = useLazyGetAllCommentsQuery();

  const [subscribeClick, setSubscribeClick] = useState(false);

  useEffect(() => {
    setDoLiked(item?.has_liked);
    setLikeCount(item?.count?.likes);

    console.log(item?.count?.comments, 'Fucking');

    setCommentCounts(item?.count?.comments);
  }, [item?.has_liked, item?.count?.likes, item?.count?.commments, comments]);

  const toggleIndex = useCallback(
    async s => {
      setShowHeart(s);

      clearTimeout(timer);

      if (!doLiked) {
        setDoLiked(true);
        setLikeCount(likeCount => likeCount + 1);
      }

      timer = setTimeout(async () => {
        if (!item.has_liked) {
          console.log('run once...');

          dispatch(likeDislike({type: 'INC', index}));
          const {data, error} = await likeApi({token, data: {postId: item?._id}});

          if (error) {
            LoginPageErrors(error?.data?.message);

            if (error?.data?.status_code === 2044) {
              autoLogout();
            }

            if (error?.status === 'FETCH_ERROR') {
              LoginPageErrors('Please check your network');
            }
          }
        }
      }, 1000);
    },
    [item.has_liked, index, doLiked],
  );

  const navigation = useNavigation();

  function sendLike() {
    if (doLiked) {
      setDoLiked(false);
      setLikeCount(likeCount => likeCount - 1);
    } else {
      setDoLiked(true);
      setLikeCount(likeCount => likeCount + 1);
    }

    clearTimeout(timer);
    timer = setTimeout(executeServer, 1000);
  }

  //Local vairable toggle but not cache...change for api

  function executeServer() {
    console.log('Eexcute Once ...*******************************');
    likeApi({token, data: {postId: item?._id}}).then(e => {
      console.log(e?.data?.message);
      if (e?.data?.message?.search('dis') === -1) {
        dispatch(likeDislike({type: 'INC', index}));
      } else {
        dispatch(likeDislike({type: 'DEC', index}));
      }

      if (e?.error) {
        LoginPageErrors(e?.error?.data?.message);

        if (e?.error?.data?.status_code === 2044) {
          autoLogout();
        }

        if (e?.error?.status === 'FETCH_ERROR') {
          LoginPageErrors('Please check your network');
        }
      }
    });
  }

  const handleLink = async id => {
    console.log('hello');

    console.log('Generated dynamic link:', link);
    // return link;
  };

  const animatedStyles = useAnimatedStyle(() => ({
    position: 'absolute',
    zIndex: 3,
    alignSelf: 'center',
    width: withSpring(heartSize.value, {
      duration: 1000, // Slower duration
      damping: 10, // Add damping
      stiffness: 100, // Add stiffness
    }),
    height: withSpring(heartSize.value, {
      duration: 1000, // Slower duration
      damping: 10, // Add damping
      stiffness: 100, // Add stiffness
    }),
    display: heartDisplay.value,
  }));

  const startAnimation = () => {
    heartSize.value = withSpring(100, {duration: 1000, damping: 10, stiffness: 100});
    setTimeout(() => {
      heartSize.value = withSpring(0, {duration: 1000, damping: 10, stiffness: 100});
    }, 1000); // Delay before shrinking
  };

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .onStart(() => {
          console.log('Yay, double tap!');
        }),
    [],
  );

  const handleGoToOthersProfile = useCallback(() => {
    if (currentUserInfo?.currentUserId !== item?.createdBy?._id) {
      navigation.navigate('othersProfile', {
        userName: item?.createdBy?.displayName,
        userId: item?.createdBy?._id,
        role: 'creator',
      });
    } else {
      navigation.navigate('profile');
    }
  }, [item, currentUserInfo?.currentUserId]);

  const handleOpenCommentSheet = async (id, focus) => {
    dispatch(toggleLoadingComments({show: true}));

    dispatch(toggleCommentBottomSheet({info: {show: 1, focus}}));

    console.log(id, 'POSTID');

    const {data, error} = await getAllComments({token, _id: id});

    const metadata = data?.data?.metadata[0]; // { total, page, limit }
    const totalPages = Math.ceil(metadata?.total / metadata?.limit);

    console.log(totalPages, '✅✅✅✅✅');

    dispatch(setTotalPages({totalPages}));

    console.log('Comments errors', error);

    if (error) {
      console.log(error);
      LoginPageErrors(error.message);
    }

    if (data) {
      dispatch(savePostComments({comments: data?.data?.comments}));
      dispatch(toggleLoadingComments({show: false}));
      dispatch(setCurrentCommentDetails({data: {id}}));
    }
  };

  const handleCoinClicks = useCallback(
    x => {
      console.log(item?.createdBy?._id, currentUserInfo?.currentUserId);

      if (item?.createdBy?._id === currentUserInfo?.currentUserId) {
        dispatch(toggleWhoTippedSheet({info: {show: 1, postId: item?._id}}));
      } else {
        dispatch(toggleSendPostTipModal({info: {show: true, postId: item?._id}}));
      }
    },
    [screenName, item?._id],
  );

  const handleUnlockPost = useCallback(async () => {
    if (isUnlocking) return;
    try {
      console.log('Unlocking post:', item?._id);
      const { data, error } = await postPayment({
        token,
        data: { postId: item?._id },
      });

      if (error) {
        console.log('Unlock post error:', error);
        LoginPageErrors(error?.data?.message || 'Failed to unlock post');
        if (error?.data?.status_code === 2044) {
          autoLogout();
        }
        return;
      }

      if (data && data.statusCode === 200) {
        console.log('Unlock post success data:', data);
        chatRoomSuccess(data?.message || 'Post unlocked successfully');
        setUnlockedFiles(data?.data?.post_content_files);
        dispatch(
          unlockPost({
            postId: item?._id,
            post_content_files: data?.data?.post_content_files,
          })
        );
      } else {
        LoginPageErrors(data?.message || 'Failed to unlock post');
      }
    } catch (err) {
      console.log('Unlock post exception:', err);
      LoginPageErrors('An unexpected error occurred');
    }
  }, [item?._id, token, postPayment, isUnlocking, dispatch]);

  if (unlockedFiles) {
    if (unlockedFiles?.[0]?.format === 'video') {
      return (
        <View style={[styles.cardContainer, {marginTop: responsiveWidth(2), marginBottom: responsiveWidth(2), borderColor: '#E9E9E9'}]}>
          <View>
            <View style={[styles.cardHeaderWrapper, {paddingHorizontal: responsiveWidth(2), marginBottom: responsiveWidth(3)}]}>
              <View style={styles.headerLeftWrapper}>
                <View style={styles.headerLeftContentContainer}>
                  <Pressable style={styles.profileImageContainer} onPress={() => handleGoToOthersProfile(item?.createdBy?.displayName)}>
                    <Image cachePolicy="memory-disk" placeholderContentFit="cover" placeholder={require('../../../Assets/Images/DefaultProfile.jpg')} source={{uri: item?.createdBy?.profile_image?.url}} resizeMethod="resize" style={styles.profileImage} />
                  </Pressable>

                  <View>
                    <Pressable style={styles.headerInformation} onPress={() => handleGoToOthersProfile(item?.createdBy?.displayName)}>
                      <View style={{flexDirection: 'column'}}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: responsiveWidth(1)}}>
                          <Text style={[styles.userName, {color: '#1e1e1e'}]} numberOfLines={1} ellipsizeMode="tail">
                            {item?.createdBy?.displayName}
                          </Text>
                          {item?.createdBy?.role === 'creator' && (
                            <View style={styles.verifyContainer}>
                              <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/verify.png')} contentFit="contain" style={{flex: 1}} />
                            </View>
                          )}
                        </View>
                        <Moment style={styles.timiming} element={Text} fromNow>
                          {item?.createdAt}
                        </Moment>
                      </View>
                    </Pressable>
                  </View>
                </View>
              </View>

              {item?.pinned && (
                <View style={{marginLeft: responsiveWidth(30), transform: [{rotate: '25deg'}]}}>
                  <DIcon provider={'Ionicons'} name={'pin'} size={responsiveWidth(6)} color={'#fff'} />
                </View>
              )}

              <TouchableOpacity
                style={styles.iconContainer}
                onPress={() =>
                  dispatch(
                    togglePostActionBottomSheet({
                      info: {
                        show: 1,
                        postId: item?._id,
                        userId: item?.createdBy?._id,
                        userName: item?.createdBy?.displayName,
                        profileImage: item?.createdBy?.profile_image?.url,
                      },
                    }),
                  )
                }>
                <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/threeDots.png')} contentFit="contain" style={{flex: 1}} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.imageContainer, {aspectRatio: 2 / 3}]}>
            <Image cachePolicy="memory-disk" placeholderContentFit="cover" source={{uri: item?.video?.thumbnail?.url}} style={styles.videoImage} />

            <GestureDetector gesture={tap}>
              <LinearGradient colors={['#00000065', 'transparent', 'transparent', 'transparent', 'transparent', 'transparent', '#00000060', '#00000070']} style={styles.overLayContainer}>
                <View style={styles.playAndDescription}>
                  <MentionText 
                    content={item?.postContent} 
                    style={styles.videoPostDescription} 
                    numberOfLines={2} 
                  />
                </View>
              </LinearGradient>
            </GestureDetector>

            <TouchableOpacity
              style={{
                position: 'absolute',
                top: '40%',
                left: '50%',
                transform: [{translateX: -responsiveWidth(7.5)}, {translateY: -responsiveWidth(7.5)}],
                zIndex: 10,
              }}
              onPress={() =>
                navigation.navigate('homevideoplayer', {
                  videoUrl: unlockedFiles?.[0]?.url,
                  coverUrl: item?.video?.thumbnail?.url,
                  userImage: item?.createdBy?.profile_image?.url,
                  displayName: item?.createdBy?.displayName,
                  description: item?.postContent,
                  count: item?.count,
                  postId: item?._id,
                  liked: item?.has_liked,
                  role: item?.createdBy?.role,
                  id: item?.createdBy?._id,
                })
              }>
              <Play width={responsiveWidth(15)} height={responsiveWidth(15)} />
            </TouchableOpacity>
          </View>
          <View
            style={{
              paddingHorizontal: responsiveWidth(2),
              borderColor: 'red',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: responsiveWidth(4),
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: responsiveWidth(5.5),
                marginLeft: 14,
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  gap: responsiveWidth(1),
                  alignItems: 'center',
                  // width: responsiveFontSize(7),
                }}>
                <TouchableOpacity onPressIn={() => sendLike()}>
                  {doLiked ? (
                    <View style={styles.bottomIconContainer}>
                      <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/heartFill.png')} contentFit="contain" style={{flex: 1}} />
                    </View>
                  ) : (
                    <View style={styles.bottomIconContainer}>
                      <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/heartOutline.png')} contentFit="contain" style={{flex: 1}} />
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.likeCommentText}>{likeCount === 0 ? null : likeCount}</Text>
              </View>

              <View style={{flexDirection: 'row', gap: responsiveWidth(1), alignItems: 'center'}}>
                <TouchableOpacity onPress={() => handleOpenCommentSheet(item?._id, false)}>
                  <View style={styles.bottomIconContainer}>
                    <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/comment.png')} contentFit="contain" style={{flex: 1}} />
                  </View>
                </TouchableOpacity>

                <Text style={styles.likeCommentText}>{commentCount === 0 ? null : commentCount}</Text>
              </View>

              <View style={{flexDirection: 'row', marginTop: responsiveWidth(0.83)}}>
                <TouchableOpacity onPress={() => handlePostActionHandler(item?._id, item?.createdBy?.profile_image?.url, item?.createdBy?.displayName, item?.postContent)}>
                  <View style={styles.bottomIconContainer}>
                    <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/share.png')} contentFit="contain" style={{flex: 1}} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={() => handleCoinClicks()}>
              <View style={{right: responsiveWidth(3.2)}}>
                <View style={styles.coinContainer}>
                  <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/Coins.png')} contentFit="contain" style={{flex: 1}} />
                </View>
              </View>
            </TouchableOpacity>
          </View>
          <View
            style={{
              borderColor: 'red',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: responsiveWidth(1),
            }}>
            <View
              style={{
                width: responsiveWidth(40),
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <View style={{flexDirection: 'row', gap: responsiveWidth(1), alignItems: 'center', marginLeft: 22}}>
                {/* <Image
                  cachePolicy="memory-disk"
                  placeholderContentFit="cover"
                  source={{uri: item?.createdBy?.profile_image?.url}}
                  style={{
                    height: responsiveWidth(6),
                    width: responsiveWidth(6),
                    borderWidth: responsiveWidth(0.3),
                    contentFit: 'contain',
                    alignSelf: 'center',
                    borderRadius: responsiveWidth(40),
                    borderWidth: 1,
                    borderColor: '#1e1e1e',
                  }}
                /> */}

                <View style={{height: responsiveWidth(5.5), width: responsiveWidth(5.5), borderRadius: responsiveWidth(5), overflow: 'hidden', borderWidth: 1.5}}>
                  <Image source={{uri: item?.createdBy?.profile_image?.url}} contentFit="contain" style={{flex: 1}} />
                </View>

                <Text onPress={() => handleOpenCommentSheet(item?._id, true)} style={[styles.addCommentsText, {marginLeft: responsiveWidth(1), fontFamily: 'Rubik-Regular'}]}>
                  Add a Comment...
                </Text>
              </View>
            </View>
          </View>
        </View>
      );
    } else {
      return (
        <View style={[styles.cardContainer]}>
          <View style={{paddingHorizontal: responsiveWidth(2)}}>
            <View style={styles.cardHeaderWrapper}>
              <View style={styles.headerLeftWrapper}>
                <View style={styles.headerLeftContentContainer}>
                  <Pressable style={styles.profileImageContainer} onPress={() => handleGoToOthersProfile(item?.createdBy?.displayName)}>
                    <Image cachePolicy="memory-disk" placeholderContentFit="cover" placeholder={require('../../../Assets/Images/DefaultProfile.jpg')} source={{uri: item?.createdBy?.profile_image?.url}} resizeMethod="resize" style={styles.profileImage} />
                  </Pressable>

                  <View>
                    <Pressable style={styles.headerInformation} onPress={() => handleGoToOthersProfile(item?.createdBy?.displayName)}>
                      <View style={{flexDirection: 'column'}}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: responsiveWidth(1)}}>
                          <Text style={[styles.userName, {color: '#1e1e1e'}]} numberOfLines={1} ellipsizeMode="tail">
                            {item?.createdBy?.displayName}
                          </Text>
                          {item?.createdBy?.role === 'creator' && (
                            <View style={styles.verifyContainer}>
                              <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/verify.png')} contentFit="contain" style={{flex: 1}} />
                            </View>
                          )}
                        </View>
                        <Moment style={styles.timiming} element={Text} fromNow>
                          {item?.createdAt}
                        </Moment>
                      </View>
                    </Pressable>
                  </View>
                </View>
              </View>
              {item?.pinned && (
                <View style={{marginLeft: responsiveWidth(30), transform: [{rotate: '25deg'}]}}>
                  <DIcon provider={'Ionicons'} name={'pin'} size={responsiveWidth(6)} color={'#1e1e1e'} />
                </View>
              )}

              <TouchableOpacity
                style={styles.iconContainer}
                onPress={() =>
                  dispatch(
                    togglePostActionBottomSheet({
                      info: {
                        show: 1,
                        postId: item?._id,
                        userId: item?.createdBy?._id,
                        userName: item?.createdBy?.displayName,
                        profileImage: item?.createdBy?.profile_image?.url,
                      },
                    }),
                  )
                }>
                <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/threeDots.png')} contentFit="contain" style={{flex: 1}} />
              </TouchableOpacity>
            </View>
            <View style={styles.cardTextWrapper}>
              {item?.postContent ? (
                <MentionText content={item?.postContent} style={styles.cardText} maxLines={3} />
              ) : null}
            </View>
          </View>

          <View style={[styles.imageContainer]}>
            {unlockedFiles?.length > 1 ? (
              <View style={{width: '100%', position: 'relative'}}>
                <Carousel
                  loop={false}
                  width={Dimensions.get('window').width}
                  height={
                    item?.image?.hasAspectRatio
                      ? Dimensions.get('window').width / (Number(item?.image?.aspectRatio?.width) / Number(item?.image?.aspectRatio?.height))
                      : Dimensions.get('window').width * 1.25
                  }
                  autoPlay={false}
                  data={unlockedFiles}
                  scrollAnimationDuration={300}
                  onSnapToItem={index => setActiveSlide(index)}
                  onConfigurePanGesture={(g) => {
                    g.activeOffsetX([-20, 20]);
                    g.failOffsetY([-5, 5]);
                  }}
                  renderItem={({item: file}) => (
                    <GestureDetector gesture={tap}>
                      <Pinchable style={{width: '100%', height: '100%'}} id={item?._id?.toString() + file.url}>
                        <Image
                          cachePolicy="memory-disk"
                          placeholderContentFit="cover"
                          placeholder={require('../../../Assets/Images/DefaultPost.jpg')}
                          source={{uri: file.url}}
                          contentFit="cover"
                          style={{
                            width: '100%',
                            height: '100%',
                          }}
                        />
                      </Pinchable>
                    </GestureDetector>
                  )}
                />
                <View style={styles.paginationBadge}>
                  <Text style={styles.paginationText}>
                    {activeSlide + 1}/{unlockedFiles?.length}
                  </Text>
                </View>
                <View style={styles.dotsContainer}>
                  {unlockedFiles?.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        i === activeSlide ? styles.activeDot : styles.inactiveDot,
                      ]}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <GestureDetector gesture={tap}>
                <Pinchable style={{width: '100%', position: 'relative'}} id={item?._id?.toString()}>
                  <Image
                    cachePolicy="memory-disk"
                    placeholderContentFit="cover"
                    placeholder={require('../../../Assets/Images/DefaultPost.jpg')}
                    source={!unlockedFiles?.[0]?.url ? require('../../../Assets/Images/DefaultPost.jpg') : {uri: unlockedFiles[0].url}}
                    contentFit="cover"
                    style={{
                      width: '100%',
                      height: undefined,
                      aspectRatio: item?.image?.hasAspectRatio ? Number(item?.image?.aspectRatio?.width) / Number(item?.image?.aspectRatio?.height) : 1 / 1,
                    }}
                    id={item?._id?.toString()}
                  />
                </Pinchable>
              </GestureDetector>
            )}
          </View>

          <View
            style={{
              paddingHorizontal: responsiveWidth(2),
              // borderColor: 'red',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: responsiveWidth(4),
              // marginLeft: 8,
              // backgroundColor : 'red'
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: responsiveWidth(5.5),
                marginLeft: 8,
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  gap: responsiveWidth(1),
                  alignItems: 'center',
                }}>
                <TouchableOpacity onPressIn={() => sendLike()}>
                  {doLiked ? (
                    <View style={styles.bottomIconContainer}>
                      <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/heartFill.png')} contentFit="contain" style={{flex: 1}} />
                    </View>
                  ) : (
                    <View style={styles.bottomIconContainer}>
                      <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/heartOutline.png')} contentFit="contain" style={{flex: 1}} />
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.likeCommentText}>{likeCount === 0 ? null : likeCount}</Text>
              </View>

              <View style={{flexDirection: 'row', gap: responsiveWidth(1), alignItems: 'center'}}>
                <TouchableOpacity onPress={() => handleOpenCommentSheet(item?._id, false)}>
                  <View style={styles.bottomIconContainer}>
                    <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/comment.png')} contentFit="contain" style={{flex: 1}} />
                  </View>
                </TouchableOpacity>
                <Text style={styles.likeCommentText}>{commentCount === 0 ? null : commentCount}</Text>
              </View>

              <View style={{flexDirection: 'row', marginTop: responsiveWidth(0.83)}}>
                <TouchableOpacity onPress={() => handlePostActionHandler(item?._id, item?.createdBy?.profile_image?.url, item?.createdBy?.displayName, item?.postContent)}>
                  <View style={styles.bottomIconContainer}>
                    <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/share.png')} contentFit="contain" style={{flex: 1}} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {item?.createdBy?.role !== 'admin' && (
              <TouchableOpacity onPress={() => handleCoinClicks()}>
                <View style={{right: responsiveWidth(3.2)}}>
                  <View style={styles.coinContainer}>
                    <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/Coins.png')} contentFit="contain" style={{flex: 1}} />
                  </View>
                </View>
              </TouchableOpacity>
            )}
          </View>
          <View
            style={{
              // paddingHorizontal: responsiveWidth(2),

              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: responsiveWidth(1),
            }}>
            <View
              style={{
                width: responsiveWidth(40),
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <View style={{flexDirection: 'row', gap: responsiveWidth(1), alignItems: 'center', marginLeft: 22}}>
                <View style={{height: responsiveWidth(5.5), width: responsiveWidth(5.5), borderRadius: responsiveWidth(5), overflow: 'hidden', borderWidth: 1.5}}>
                  <Image source={{uri: item?.createdBy?.profile_image?.url}} contentFit="contain" style={{flex: 1}} />
                </View>

                <Text onPress={() => handleOpenCommentSheet(item?._id, true)} style={[styles.addCommentsText, {marginLeft: responsiveWidth(1), fontFamily: 'Rubik-Regular'}]}>
                  Add a Comment...
                </Text>
              </View>
            </View>
          </View>
        </View>
      );
    }
  } else {
    return (
      <View style={[styles.cardContainer, {marginBottom: 0}]}>
        <View style={{paddingHorizontal: responsiveWidth(2), paddingBottom: 0}}>
          <View style={styles.cardHeaderWrapper}>
            <View style={styles.headerLeftWrapper}>
              <View style={styles.headerLeftContentContainer}>
                <Pressable style={styles.profileImageContainer} onPress={() => handleGoToOthersProfile(item?.createdBy?.displayName)}>
                  <Image cachePolicy="memory-disk" placeholderContentFit="cover" placeholder={require('../../../Assets/Images/DefaultProfile.jpg')} source={{uri: item?.createdBy?.profile_image?.url}} resizeMethod="resize" style={styles.profileImage} />
                </Pressable>

                <View>
                  <Pressable style={styles.headerInformation} onPress={() => handleGoToOthersProfile(item?.createdBy?.displayName)}>
                    <View style={{flexDirection: 'column'}}>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: responsiveWidth(1)}}>
                        <Text style={[styles.userName, {color: '#1e1e1e'}]} numberOfLines={1} ellipsizeMode="tail">
                          {item?.createdBy?.displayName}
                        </Text>
                        {item?.createdBy?.role === 'creator' && (
                          <View style={styles.verifyContainer}>
                            <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/verify.png')} contentFit="contain" style={{flex: 1}} />
                          </View>
                        )}
                      </View>
                      <Moment style={styles.timiming} element={Text} fromNow>
                        {item?.createdAt}
                      </Moment>
                    </View>
                  </Pressable>
                </View>
              </View>
            </View>

            {item?.pinned && (
              <View style={{marginLeft: responsiveWidth(30), transform: [{rotate: '25deg'}]}}>
                <DIcon provider={'Ionicons'} name={'pin'} size={responsiveWidth(6)} color={'#1e1e1e'} />
              </View>
            )}

            <TouchableOpacity
              style={styles.iconContainer}
              onPress={() =>
                dispatch(
                  togglePostActionBottomSheet({
                    info: {
                      show: 1,
                      postId: item?._id,
                      userId: item?.createdBy?._id,
                      userName: item?.createdBy?.displayName,
                      profileImage: item?.createdBy?.profile_image?.url,
                      postContent: item?.postContent,
                    },
                  }),
                )
              }>
              <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/threeDots.png')} contentFit="contain" style={{flex: 1}} />
            </TouchableOpacity>
          </View>
          <View style={styles.cardTextWrapper}>
            {item?.postContent ? (
              <MentionText content={item?.postContent} style={styles.cardText} maxLines={3} />
            ) : null}
          </View>
        </View>

        <View style={[styles.imageContainer]}>
          <View style={{width: '100%', position: 'relative'}} id={item?._id?.toString()}>
            <Image
              cachePolicy="memory-disk"
              placeholderContentFit="cover"
              blurRadius={6}
              placeholder={require('../../../Assets/Images/DefaultPost.jpg')}
              source={!item?.image_preview?.[0]?.url ? require('../../../Assets/Images/blur.jpg') : {uri: item?.image_preview?.[0]?.url}}
              contentFit="cover"
              style={{
                width: '100%',
                height: undefined,
                aspectRatio: 1 / 1,
              }}
              onLoad={() => console.log('Image loaded lsuccess')}
              id={item?._id?.toString()}
            />

            <View style={styles.subPlaceHolder}>
              <View style={styles.exclusiveOverlayContent}>
                <DIcon provider={'SimpleLineIcons'} name={'lock'} color="#fff" size={25} />
                <Text style={styles.exclusiveTitle}>Unlock Exclusive Content</Text>

                <View style={styles.exclusiveButtonsRow}>
                  <Pressable
                    style={[styles.exclusiveSubscribeBtn, subscribeClick && {backgroundColor: 'rgba(255,255,255,0.15)'}]}
                    onPressIn={() => setSubscribeClick(true)}
                    onPressOut={() => setSubscribeClick(false)}
                    onPress={() =>
                      navigate('subscribeCreator', {
                        name: item?.createdBy?.displayName,
                        profileImageUrl: item?.createdBy?.profile_image?.url,
                        role: item?.createdBy?.role,
                        id: item?.createdBy?._id,
                      })
                    }>
                    <Text style={styles.exclusiveBtnText}>Subscribe Now</Text>
                  </Pressable>

                  {item?.unlockSettings?.enabled && (
                    <Pressable
                      style={[styles.exclusiveUnlockBtn, unlockClick && {backgroundColor: 'rgba(255,255,255,0.15)'}]}
                      onPressIn={() => setUnlockClick(true)}
                      onPressOut={() => setUnlockClick(false)}
                      onPress={handleUnlockPost}
                      disabled={isUnlocking}
                    >
                      <Text style={styles.exclusiveBtnText}>
                        {isUnlocking ? 'Unlocking...' : `${item?.unlockSettings?.unlockAmount || 0}`}
                      </Text>
                      {!isUnlocking && (
                        <View style={styles.exclusiveCoinCircle}>
                          <Text style={styles.exclusiveCoinSymbol}>₹</Text>
                        </View>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>

        <View
          style={{
            paddingHorizontal: responsiveWidth(2),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: responsiveWidth(4),
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: responsiveWidth(5.5),
              marginLeft: 8,
            }}>
            <View
              style={{
                flexDirection: 'row',
                gap: responsiveWidth(1),
                alignItems: 'center',
              }}>
              <TouchableOpacity onPressIn={() => sendLike()}>
                {doLiked ? (
                  <View style={styles.bottomIconContainer}>
                    <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/heartFill.png')} contentFit="contain" style={{flex: 1}} />
                  </View>
                ) : (
                  <View style={styles.bottomIconContainer}>
                    <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/heartOutline.png')} contentFit="contain" style={{flex: 1}} />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.likeCommentText}>{likeCount === 0 ? null : likeCount}</Text>
            </View>

            <View style={{flexDirection: 'row', gap: responsiveWidth(1), alignItems: 'center'}}>
              <TouchableOpacity onPress={() => handleOpenCommentSheet(item?._id, false)}>
                <View style={styles.bottomIconContainer}>
                  <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/comment.png')} contentFit="contain" style={{flex: 1}} />
                </View>
              </TouchableOpacity>
              <Text style={styles.likeCommentText}>{commentCount === 0 ? null : commentCount}</Text>
            </View>

            <View style={{flexDirection: 'row', marginTop: responsiveWidth(0.83)}}>
              <TouchableOpacity onPress={() => handlePostActionHandler(item?._id, item?.createdBy?.profile_image?.url, item?.createdBy?.displayName, item?.postContent)}>
                <View style={styles.bottomIconContainer}>
                  <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/share.png')} contentFit="contain" style={{flex: 1}} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {item?.createdBy?.role !== 'admin' && (
            <TouchableOpacity onPress={() => handleCoinClicks()}>
              <View style={{right: responsiveWidth(3.2)}}>
                <View style={styles.coinContainer}>
                  <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/Coins.png')} contentFit="contain" style={{flex: 1}} />
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: responsiveWidth(1),
          }}>
          <View
            style={{
              width: responsiveWidth(40),
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <View style={{flexDirection: 'row', gap: responsiveWidth(1), alignItems: 'center', marginLeft: 22}}>
              <View style={{height: responsiveWidth(5.5), width: responsiveWidth(5.5), borderRadius: responsiveWidth(5), overflow: 'hidden', borderWidth: 1.5}}>
                <Image source={{uri: item?.createdBy?.profile_image?.url}} contentFit="contain" style={{flex: 1}} />
              </View>

              <Text onPress={() => handleOpenCommentSheet(item?._id, true)} style={[styles.addCommentsText, {marginLeft: responsiveWidth(1), fontFamily: 'Rubik-Regular'}]}>
                Add a Comment...
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }
};

export default memo(PostCards);

const styles = StyleSheet.create({
  cardContainer: {
    borderBottomColor: '#E9E9E9',
    overflow: 'hidden',
    marginTop: responsiveHeight(1.6),
    marginBottom: responsiveHeight(1),
    backgroundColor: 'white',
    width: '100%',
  },

  cardHeaderWrapper: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    // borderWidth : 1,
    borderColor: 'blue',
  },

  headerLeftWrapper: {
    height: responsiveWidth(12),
    justifyContent: 'center',
    // borderWidth : 1,
    flexBasis: '50%',
  },
  headerLeftContentContainer: {
    height: '100%',
    borderColor: 'blue',
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(5.33),
  },
  profileImageContainer: {
    borderColor: '#1e1e1e',
    height: responsiveWidth(11.2),
    width: responsiveWidth(11.2),
    borderRadius: responsiveWidth(10),
    overflow: 'hidden',
    position: 'relative',
    left: responsiveWidth(2.5),
    borderWidth: responsiveWidth(0.5),
  },
  profileImage: {
    width: '100%',
    contentFit: 'cover',
    height: '100%',
  },
  userName: {
    fontFamily: 'Rubik-SemiBold',
    color: '#1e1e1e',
    fontSize: responsiveFontSize(1.97),
    lineHeight: 19,
  },
  status: {
    fontSize: responsiveFontSize(1.6),
    letterSpacing: 0.5,
    color: '#1e1e1e',
    fontFamily: 'Rubik-Regular',
  },
  cardTextWrapper: {
    // borderWidth : 1,
    flex: 1,
    marginLeft: responsiveWidth(2),
    paddingHorizontal: responsiveWidth(1),
    paddingVertical: responsiveWidth(1.5),
    // width: responsiveWidth(90),
    height: 'auto',
  },
  cardImageContainer: {
    paddingVertical: responsiveWidth(2),
    borderWidth: 1,
    width: '100%',
    paddingHorizontal: responsiveWidth(4),
  },
  cardText: {
    color: '#1e1e1e',
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.72),
    marginVertical: 8,
    // backgroundColor : 'red',
    paddingLeft: responsiveWidth(1.2),
  },
  imageContainer: {
    overflow: 'hidden',
    width: 'auto',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    flexGrow: 0,
  },
  likeCommentText: {
    color: '#1e1e1e',
    fontSize: responsiveFontSize(1.97),
    fontFamily: 'Rubik-Medium',
  },
  paginationBadge: {
    position: 'absolute',
    top: responsiveWidth(2.5),
    right: responsiveWidth(3.5),
    backgroundColor: 'rgba(30, 30, 30, 0.73)',
    paddingHorizontal: responsiveWidth(3),
    paddingVertical: responsiveWidth(1.2),
    borderRadius: responsiveWidth(3.5),
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: responsiveWidth(10),
    zIndex: 10,
  },
  paginationText: {
    color: '#FFFFFF',
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.3),
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 10,
  },
  dot: {
    height: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#000000',
  },
  activeDot: {
    width: 16,
    backgroundColor: '#FFA86B',
  },
  inactiveDot: {
    width: 6,
    backgroundColor: '#FFFFFF',
  },
  timiming: {
    fontSize: responsiveFontSize(1.23),
    lineHeight: 12,
    marginTop: 1,
    color: '#1e1e1e',
    fontFamily: 'Rubik-Regular',
  },
  subscribeMessage: {
    fontFamily: 'Rubik-Bold',
    color: 'white',

    textAlign: 'center',

    textShadowColor: 'rgba(0, 0, 0, 0.75)',
  },
  subPlaceHolder: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: responsiveWidth(2),
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  subscribeBox: {
    borderWidth: 2,
    borderColor: 'white',
    resizeMode: 'contain',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: responsiveWidth(8),
    padding: responsiveWidth(2),
    borderRadius: responsiveWidth(2),
  },
  unlockBox: {
    backgroundColor: '#FFA86B',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: responsiveWidth(4),
    paddingHorizontal: responsiveWidth(5),
    paddingVertical: responsiveWidth(2.5),
    borderRadius: responsiveWidth(2),
    shadowColor: '#FFA86B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    minWidth: responsiveWidth(60),
  },
  unlockContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: responsiveWidth(2),
  },
  unlockCoinIcon: {
    width: responsiveWidth(5.5),
    height: responsiveWidth(5.5),
  },
  unlockMessage: {
    fontFamily: 'Rubik-Bold',
    color: 'white',
    fontSize: responsiveFontSize(1.8),
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  multiImageIndicator: {
    position: 'absolute',
    top: responsiveWidth(3),
    right: responsiveWidth(3),
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: responsiveWidth(1.5),
    borderRadius: responsiveWidth(2),
    zIndex: 10,
  },

  videoImage: {
    flex: 1,
    width: '100%',
  },

  overLayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    display: 'flex',
    opacity: 0.9,
  },

  playAndDescription: {
    marginTop: 'auto',
    alignSelf: 'center',
    marginBottom: responsiveWidth(6),
    width: '100%',
    color: '#fff',
    paddingHorizontal: responsiveWidth(2),
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  videoPostDescription: {
    color: 'white',
    width: responsiveWidth(60),
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.72),
  },
  iconContainer: {
    height: 19,
    width: 5,
    marginRight: 12,
  },
  verifyContainer: {
    width: 15,
    height: 14.32,
  },
  bottomIconContainer: {
    width: 20,
    height: 20,
    // backgroundColor : '#fff'
  },
  coinContainer: {
    width: 23,
    height: 23,
  },
  addCommentsText: {
    color: '#b2b2b2',
    fontSize: responsiveFontSize(1.5),
    fontFamily: 'Rubik-Medium',
  },
  exclusiveOverlayContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  exclusiveTitle: {
    fontFamily: 'Rubik-Medium',
    fontSize: 16,
    lineHeight: 16,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  exclusiveButtonsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  exclusiveSubscribeBtn: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exclusiveUnlockBtn: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  exclusiveBtnText: {
    fontFamily: 'Rubik-Medium',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  exclusiveCoinCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFE72D',
    borderWidth: 1.5,
    borderColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exclusiveCoinSymbol: {
    fontSize: 8,
    color: '#1E1E1E',
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 10,
  },
});
