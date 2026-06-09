import {StyleSheet, Text, View, TouchableOpacity, Pressable, Alert, Dimensions} from 'react-native';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {responsiveWidth, responsiveFontSize, responsiveHeight} from 'react-native-responsive-dimensions';
import DIcon from '../../../DesiginData/DIcons';
import Moment from 'react-moment';

import {Gesture} from 'react-native-gesture-handler';
import {GestureDetector} from 'react-native-gesture-handler';
import Animated, {runOnJS, useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';
import {useNavigation, useNavigationState} from '@react-navigation/native';
import {useLazyGetAllCommentsQuery, useLazyGetSelfLikeQuery, useLikeApiMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useDispatch, useSelector} from 'react-redux';
import {setCurrentVideoPlayId, toggleCommentBottomSheet, toggleLoadingComments, togglePostActionBottomSheet, toggleSendPostTipModal, toggleWhoTippedSheet} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import Pinchable from 'react-native-pinchable';
import {LoginPageErrors} from '../ErrorSnacks';
import {savePostComments, setCurrentCommentDetails, setTotalPages} from '../../../Redux/Slices/NormalSlices/CurrentCommentSlice';
import {token as memoizedToken} from '../../../Redux/Slices/NormalSlices/AuthSlice';
import {navigate} from '../../../Navigation/RootNavigation';
import {memo} from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {likeDislikeMyPost} from '../../../Redux/Slices/NormalSlices/Posts/MyProfileFeedCacheSlice';
import Heart from '../../../Assets/svg/heart.svg';
import Fill from '../../../Assets/svg/fillh.svg';
import Comment from '../../../Assets/svg/comm.svg';
import Play from '../../../Assets/svg/play.svg';
import Verify from '../../../Assets/svg/smallveri.svg';
import Paisa from '../../../Assets/svg/paisa.svg';
import share from 'react-native-share';
import {Image} from 'expo-image';
import {WIDTH_SIZES} from '../../../DesiginData/Utility';
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
const PostCards = ({item, index, token, postId}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  console.log(item?.has_liked);

  // console.log("Username", item?.createdBy?.displayName, "LikeCount", item?.count?.likes, item?.has_liked)

  const screenName = useNavigationState(state => state.routes[state.index].name);

  console.log(screenName);

  const dispatch = useDispatch();

  const [showHeart, setShowHeart] = useState(false);

  const [getAllComments] = useLazyGetAllCommentsQuery();

  const [doLiked, setDoLiked] = useState(item?.has_liked);

  const heartSize = useSharedValue(0);

  const heartDisplay = useSharedValue('none');

  const currentUserInfo = useSelector(state => state.auth.user);

  const [likeApi] = useLikeApiMutation();

  const [likeCount, setLikeCount] = useState(item?.count?.likes);

  const [commentCount, setCommentCounts] = useState(item?.count?.comments);

  const [subscribeClick, setSubscribeClick] = useState(false);
  const [unlockClick, setUnlockClick] = useState(false);

  const isSubscriberOnlyPost = item?.for_subscribers === true || item?.for_subscribers === 'true' || item?.forSubscriber === true || item?.forSubscriber === 'true';

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

          dispatch(likeDislikeMyPost({type: 'INC', index}));
          const {error} = await likeApi({token, data: {postId: item?._id}});

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

  console.log('DO LIIKKKKKED', doLiked, item?.post_content_files?.[0]?.format);

  const navigation = useNavigation();

  useEffect(() => {
    console.log('UseEFFFFFFFFFFFFF');
    setLikeCount(item?.count?.likes);
    setCommentCounts(item?.count?.comments);

    setDoLiked(item?.has_liked);
  }, [item?.count?.comments, item?.count?.likes]);

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

  function executeServer() {
    console.log('Eexcute Once ...*******************************');
    likeApi({token, data: {postId: item?._id}}).then(e => {
      console.log(e?.data?.message);
      if (e?.data?.message?.search('dis') === -1) {
        dispatch(likeDislikeMyPost({type: 'INC', index}));
      } else {
        dispatch(likeDislikeMyPost({type: 'DEC', index}));
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

  const tap = useMemo(() => Gesture.Tap().numberOfTaps(2), []);

  const animatedStyles = useAnimatedStyle(() => ({
    position: 'absolute',

    zIndex: 3,
    alignSelf: 'center',
    width: withSpring(heartSize.value, {duration: 600}, isFinished => {
      if (isFinished) {
        heartSize.value = withSpring(0);
      }
    }),
    height: withSpring(heartSize.value, {duration: 600}, isFinished => {
      if (isFinished) {
        heartSize.value = withSpring(0);
      }
    }),
    display: heartDisplay.value,
  }));

  const handleGoToOthersProfile = useCallback(() => {
    if (currentUserInfo?.currentUserId !== item?.createdBy?._id) {
      navigation.navigate('othersProfile', {userName: item?.createdBy?.displayName, userId: item?.createdBy?._id});
    } else {
      console.log('Get fuck out of here...');
    }
  }, [item]);

  // const handleOpenCommentSheet = useCallback((id, focus) => {

  //   dispatch(toggleCommentBottomSheet({info: {show: 1, focus}}));
  // }, []);

  const handleOpenCommentSheet = async (id, focus) => {
    dispatch(toggleLoadingComments({show: true}));

    dispatch(toggleCommentBottomSheet({info: {show: 1, focus, fromPage: 'myProfilePost'}}));

    const {data, error} = await getAllComments({token, _id: id});

    console.log('Comments errors', error);

    const metadata = data?.data?.metadata[0]; // { total, page, limit }
    const totalPages = Math.ceil(metadata?.total / metadata?.limit);

    console.log(totalPages, '✅✅✅✅✅');

    dispatch(setTotalPages({totalPages}));

    if (error) {
      console.log(error);
      dispatch(toggleLoadingComments({show: false}));
    }

    if (data) {
      // console.log(data?.data?.comments, "::::");
      dispatch(toggleLoadingComments({show: false}));
      dispatch(savePostComments({comments: data?.data?.comments}));
      dispatch(setCurrentCommentDetails({data: {id}}));
    }
  };

  // useEffect(() => {

  //   Alert.alert("uoih")

  //   handleOpenCommentSheet(postId, true);
  // }, [postId]);

  const handleCoinClicks = useCallback(() => {
    console.log(item?._id);
    if (screenName === 'myProfileNormalPost') {
      dispatch(toggleWhoTippedSheet({info: {show: 1, postId: item?._id}}));
    } else {
      dispatch(toggleSendPostTipModal({info: {show: true, postId: item?._id}}));
    }
  }, [screenName, item?._id]);

  if (item?.post_content_files) {
    if (item?.post_content_files?.[0]?.format === 'video') {
      return (
        <View style={[styles.cardContainer, {paddingTop: 0, borderColor: '#282828'}]} key={item?._id}>
          <View style={[styles.imageContainer, {aspectRatio: 2 / 3}]}>
            <Image source={{uri: item?.video?.thumbnail?.url}} style={styles.videoImage} />

            <GestureDetector gesture={tap}>
              <LinearGradient colors={['#00000065', 'transparent', 'transparent', 'transparent', 'transparent', 'transparent', '#00000060', '#00000070']} style={styles.overLayContainer}>
                <View style={[styles.cardHeaderWrapper, {paddingHorizontal: responsiveWidth(2), paddingTop: responsiveWidth(1)}]}>
                  <View style={[styles.headerLeftWrapper, {marginLeft: responsiveWidth(3)}]}>
                    <View style={styles.headerLeftContentContainer}>
                      <Pressable style={styles.profileImageContainer} onPress={() => handleGoToOthersProfile(item?.createdBy?.displayName)}>
                        <Image placeholder={require('../../../Assets/Images/DefaultProfile.jpg')} source={item?.createdBy?.profile_image?.url} resizeMethod="resize" style={styles.profileImage} />
                      </Pressable>

                      <View style={{flexDirection: 'column'}}>
                        <Pressable style={styles.headerInformation} onPress={() => handleGoToOthersProfile(item?.createdBy?.displayName)}>
                          <View style={{flexDirection: 'row', alignItems: 'center', gap: responsiveWidth(1)}}>
                            <Text style={[styles.userName, {color: '#fff'}]} numberOfLines={1} ellipsizeMode="tail">
                              {item?.createdBy?.displayName}
                            </Text>
                            {item?.createdBy?.role === 'creator' ? (
                              <View style={{}}>
                                <Verify />
                              </View>
                            ) : null}
                          </View>
                        </Pressable>
                        <Moment style={[styles.timiming, {color: '#fff'}]} element={Text} fromNow>
                          {item?.createdAt}
                        </Moment>
                      </View>
                    </View>
                  </View>
                  {item?.pinned && (
                    <View style={{marginLeft: responsiveWidth(30), transform: [{rotate: '25deg'}]}}>
                      <DIcon provider={'Ionicons'} name={'pin'} size={responsiveWidth(6)} color={'#fff'} />
                    </View>
                  )}
                  <DIcon provider={'Entypo'} name={'dots-three-vertical'} size={responsiveWidth(5)} color="#fff" onPress={() => dispatch(togglePostActionBottomSheet({info: {show: 1, postId: item?._id, userId: item?.createdBy?._id, postContent: item?.postContent}}))} />
                </View>

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
                  videoUrl: item?.post_content_files?.[0]?.url,
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

          <View style={{paddingHorizontal: responsiveWidth(5), borderColor: 'red', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: responsiveWidth(4)}}>
            <View style={{width: responsiveWidth(70), flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: responsiveWidth(4)}}>
              <View style={{flexDirection: 'row', gap: responsiveWidth(1), alignItems: 'center'}}>
                <TouchableOpacity onPress={() => sendLike()}>{doLiked ? <Fill /> : <Heart />}</TouchableOpacity>

                <Text style={styles.likeCommentText}>{likeCount === 0 ? null : likeCount}</Text>
              </View>

              <View style={{flexDirection: 'row', gap: responsiveWidth(1), alignItems: 'center'}}>
                <TouchableOpacity onPress={() => handleOpenCommentSheet(item?._id, false)}>
                  <Comment />
                </TouchableOpacity>

                <Text style={styles.likeCommentText}>{commentCount === 0 ? null : commentCount}</Text>
              </View>
              <View style={{flexDirection: 'row', gap: responsiveWidth(1), alignItems: 'center'}}>
                <TouchableOpacity style={{width: 20, height: 20}} onPress={() => handlePostActionHandler(item?._id, item?.createdBy?.profile_image?.url, item?.createdBy?.displayName, item?.postContent)}>
                  <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/share.png')} contentFit="contain" style={{flex: 1}} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={{paddingHorizontal: responsiveWidth(2), borderColor: 'red', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: responsiveWidth(1)}}>
            <View style={{width: responsiveWidth(40), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
              <View style={{flexDirection: 'row', gap: responsiveWidth(1), alignItems: 'center'}}>
                <View
                  style={{
                    height: responsiveWidth(8),
                    width: responsiveWidth(8),
                    borderRadius: responsiveWidth(4),
                    marginLeft: WIDTH_SIZES['10'],
                    borderWidth: 1,
                    borderColor: '#282828',
                    alignSelf: 'center',
                    overflow: 'hidden', // ensures image doesn't overflow the circular container
                  }}>
                  <Image
                    source={!item?.createdBy?.profile_image?.url ? require('../../../Assets/Images/DefaultProfile.jpg') : {uri: item?.createdBy?.profile_image?.url}}
                    style={{
                      height: '100%',
                      width: '100%',
                      resizeMode: 'cover',
                    }}
                  />
                </View>

                <Text onPress={() => handleOpenCommentSheet(item?._id, true)} style={[styles.addCommentsText, {marginLeft: responsiveWidth(2), fontFamily: 'Rubik-Regular', color: '#B4B4B4'}]}>
                  Add a Comments
                </Text>
              </View>
            </View>
            {/* <DIcon color={"#FFA07A"} provider={"Octicons"} name={"paper-airplane"} /> */}
          </View>
        </View>
      );
    } else {
      return (
        <View style={[styles.cardContainer]} key={item?._id}>
          <View style={{paddingHorizontal: responsiveWidth(2), borderColor: 'red'}}>
            <View style={styles.cardHeaderWrapper}>
              <View style={[styles.headerLeftWrapper, {marginLeft: responsiveWidth(3)}]}>
                <View style={styles.headerLeftContentContainer}>
                  <Pressable style={styles.profileImageContainer} onPress={() => handleGoToOthersProfile(item?.createdBy?.displayName)}>
                    <Image source={!item?.createdBy?.profile_image?.url ? require('../../../Assets/Images/DefaultProfile.jpg') : {uri: item?.createdBy?.profile_image?.url}} resizeMethod="resize" style={styles.profileImage} />
                  </Pressable>

                  <View style={{flexDirection: 'column'}}>
                    <Pressable style={styles.headerInformation} onPress={() => handleGoToOthersProfile(item?.createdBy?.displayName)}>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: responsiveWidth(1)}}>
                        <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                          {item?.createdBy?.displayName}
                        </Text>
                        {item?.createdBy?.role === 'creator' ? (
                          <View style={{}}>
                            <Verify />
                          </View>
                        ) : null}
                      </View>
                    </Pressable>
                    <Moment style={styles.timiming} element={Text} fromNow>
                      {item?.createdAt}
                    </Moment>
                  </View>
                </View>
              </View>
              {item?.pinned && (
                <View style={{marginLeft: responsiveWidth(30), transform: [{rotate: '25deg'}]}}>
                  <DIcon provider={'Ionicons'} name={'pin'} size={responsiveWidth(6)} color={'#282828'} />
                </View>
              )}
              <View style={{marginRight: responsiveWidth(3)}}>
                <DIcon provider={'Entypo'} name={'dots-three-vertical'} size={responsiveWidth(5)} onPress={() => dispatch(togglePostActionBottomSheet({info: {show: 1, postId: item?._id, userId: item?.createdBy?._id, postContent: item?.postContent}}))} />
              </View>
            </View>
            <View style={styles.cardTextWrapper}>
              {item?.postContent ? (
                <MentionText content={item?.postContent} style={styles.cardText} maxLines={3} />
              ) : null}
            </View>
          </View>

          <View style={[styles.imageContainer]}>
            {item?.post_content_files?.length > 1 ? (
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
                  data={item?.post_content_files}
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
                    {activeSlide + 1}/{item?.post_content_files?.length}
                  </Text>
                </View>
                <View style={styles.dotsContainer}>
                  {item?.post_content_files?.map((_, i) => (
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
                <Pinchable style={{width: '100%', position: 'relative'}} key={item?._id?.toString()} id={item?._id?.toString()}>
                  <Image
                    placeholder={require('../../../Assets/Images/DefaultPost.jpg')}
                    source={item?.post_content_files?.[0]?.url}
                    contentFit="cover"
                    style={{
                      width: '100%',
                      height: undefined,
                      aspectRatio: item?.image?.hasAspectRatio ? Number(item?.image?.aspectRatio?.width) / Number(item?.image?.aspectRatio?.height) : 1 / 1,
                    }}
                    key={item?._id?.toString()}
                    id={item?._id?.toString()}
                    allowDownscaling
                  />
                </Pinchable>
              </GestureDetector>
            )}
          </View>

          <View style={{paddingHorizontal: responsiveWidth(5), borderColor: 'red', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: responsiveWidth(4)}}>
            <View style={{width: responsiveWidth(70), flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: responsiveWidth(4)}}>
              <View style={{flexDirection: 'row', gap: responsiveWidth(1), alignItems: 'center'}}>
                <TouchableOpacity onPress={() => sendLike()}>{doLiked ? <Fill /> : <Heart />}</TouchableOpacity>

                <Text style={styles.likeCommentText}>{likeCount === 0 ? null : likeCount}</Text>
              </View>

              <View style={{flexDirection: 'row', gap: responsiveWidth(1), alignItems: 'center'}}>
                <TouchableOpacity onPress={() => handleOpenCommentSheet(item?._id, false)}>
                  <Comment />
                </TouchableOpacity>

                <Text style={styles.likeCommentText}>{commentCount === 0 ? null : commentCount}</Text>
              </View>
              <View style={{flexDirection: 'row', gap: responsiveWidth(1), alignItems: 'center'}}>
                <TouchableOpacity style={{width: 20, height: 20}} onPress={() => handlePostActionHandler(item?._id, item?.createdBy?.profile_image?.url, item?.createdBy?.displayName, item?.postContent)}>
                  <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/share.png')} contentFit="contain" style={{flex: 1}} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={{paddingHorizontal: responsiveWidth(2), borderColor: 'red', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: responsiveWidth(1)}}>
            <View style={{width: responsiveWidth(40), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
              <View style={{flexDirection: 'row', gap: responsiveWidth(1), alignItems: 'center'}}>
                <View
                  style={{
                    height: responsiveWidth(8),
                    width: responsiveWidth(8),
                    borderRadius: responsiveWidth(4),
                    marginLeft: WIDTH_SIZES['10'],
                    borderWidth: 1,
                    borderColor: '#282828',
                    alignSelf: 'center',
                    overflow: 'hidden', // ensures image doesn't overflow the circular container
                  }}>
                  <Image
                    source={!item?.createdBy?.profile_image?.url ? require('../../../Assets/Images/DefaultProfile.jpg') : {uri: item?.createdBy?.profile_image?.url}}
                    style={{
                      height: '100%',
                      width: '100%',
                      resizeMode: 'cover',
                    }}
                  />
                </View>

                <Text onPress={() => handleOpenCommentSheet(item?._id, true)} style={[styles.addCommentsText, {marginLeft: responsiveWidth(2), fontFamily: 'Rubik-Regular', color: '#B4B4B4'}]}>
                  Add a Comments
                </Text>
              </View>
            </View>
            {/* <DIcon color={"#FFA07A"} provider={"Octicons"} name={"paper-airplane"} /> */}
          </View>
        </View>
      );
    }
  } else {
    return (
      <View style={[styles.cardContainer]} key={item?._id}>
        <View style={{paddingHorizontal: responsiveWidth(2), borderColor: 'red'}}>
          <View style={styles.cardHeaderWrapper}>
            <View style={[styles.headerLeftWrapper, {marginLeft: responsiveWidth(3)}]}>
              <View style={styles.headerLeftContentContainer}>
                <Pressable style={styles.profileImageContainer} onPress={() => handleGoToOthersProfile(item?.createdBy?.displayName)}>
                  <Image source={!item?.createdBy?.profile_image?.url ? require('../../../Assets/Images/DefaultProfile.jpg') : {uri: item?.createdBy?.profile_image?.url}} resizeMethod="resize" style={styles.profileImage} />
                </Pressable>

                <View style={{flexDirection: 'column'}}>
                  <Pressable style={styles.headerInformation} onPress={() => handleGoToOthersProfile(item?.createdBy?.displayName)}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: responsiveWidth(1)}}>
                      <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                        {item?.createdBy?.displayName}
                      </Text>
                      {item?.createdBy?.role === 'creator' ? (
                        <View style={{}}>
                          <Verify />
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                  <Moment style={styles.timiming} element={Text} fromNow>
                    {item?.createdAt}
                  </Moment>
                </View>
              </View>
            </View>
            {item?.pinned && (
              <View style={{marginLeft: responsiveWidth(30), transform: [{rotate: '25deg'}]}}>
                <DIcon provider={'Ionicons'} name={'pin'} size={responsiveWidth(6)} color={'#282828'} />
              </View>
            )}
            <DIcon provider={'Entypo'} name={'dots-three-vertical'} size={responsiveWidth(5)} onPress={() => dispatch(togglePostActionBottomSheet({info: {show: 1, postId: item?._id, userId: item?.createdBy?._id, postContent: item?.postContent}}))} />
          </View>
          <View style={styles.cardTextWrapper}>
            {item?.postContent ? (
              <MentionText content={item?.postContent} style={styles.cardText} maxLines={3} />
            ) : null}
          </View>
        </View>

        <View style={[styles.imageContainer]}>
          <View style={{width: '100%', position: 'relative'}} key={item?._id?.toString()} id={item?._id?.toString()}>
            <Image
              blurRadius={20}
              source={!item?.image_preview?.[0]?.url ? require('../../../Assets/Images/blur.jpg') : {uri: item?.image_preview?.[0]?.url}}
              resizeMode="cover"
              style={{
                width: '100%',
                height: undefined,
                aspectRatio: item?.image?.hasAspectRatio ? Number(item?.image?.aspectRatio?.width) / Number(item?.image?.aspectRatio?.height) : 1 / 1,
              }}
              key={item?._id?.toString()}
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
                      disabled={true}
                    >
                      <Text style={styles.exclusiveBtnText}>
                        {item?.unlockSettings?.unlockAmount || 0}
                      </Text>
                      <View style={styles.exclusiveCoinCircle}>
                        <Text style={styles.exclusiveCoinSymbol}>₹</Text>
                      </View>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>

        {!isSubscriberOnlyPost && (
          <>
            <View style={{paddingHorizontal: responsiveWidth(2), borderColor: 'red', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: responsiveWidth(4)}}>
              <View style={{width: responsiveWidth(70), flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start'}}>
                <View style={{flexDirection: 'row', gap: responsiveWidth(1), alignItems: 'center', width: responsiveFontSize(7)}}>
                  <TouchableOpacity onPress={() => LoginPageErrors('You must subscribe to like')}>{doLiked ? <Fill /> : <Heart />}</TouchableOpacity>

                  <Text style={styles.likeCommentText}>{likeCount === 0 ? null : likeCount}</Text>
                </View>

                <View style={{flexDirection: 'row', gap: responsiveWidth(1), alignItems: 'center'}}>
                  <TouchableOpacity onPress={() => LoginPageErrors('You must subscribe to comment')}>
                    <Comment />
                  </TouchableOpacity>

                  <Text style={styles.likeCommentText}>{commentCount === 0 ? null : commentCount}</Text>
                </View>
              </View>
            </View>

            <View style={{paddingHorizontal: responsiveWidth(4), borderColor: 'red', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: responsiveWidth(1)}}>
              <View style={{width: responsiveWidth(40), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                <View style={{flexDirection: 'row', gap: responsiveWidth(1), alignItems: 'center'}}>
                  <View
                    style={{
                      height: responsiveWidth(8),
                      width: responsiveWidth(8),
                      borderRadius: responsiveWidth(4),
                      marginLeft: WIDTH_SIZES['10'],
                      borderWidth: 1,
                      borderColor: '#282828',
                      alignSelf: 'center',
                      overflow: 'hidden', // ensures image doesn't overflow the circular container
                    }}>
                    <Image
                      source={!item?.createdBy?.profile_image?.url ? require('../../../Assets/Images/DefaultProfile.jpg') : {uri: item?.createdBy?.profile_image?.url}}
                      style={{
                        height: '100%',
                        width: '100%',
                        resizeMode: 'cover',
                      }}
                    />
                  </View>

                  <Text onPress={() => LoginPageErrors('You must subscribe to comment')} style={[styles.addCommentsText, {marginLeft: responsiveWidth(2), fontFamily: 'MabryPro-Regular'}]}>
                    Add a Comments
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
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
    backgroundColor: '#fff',
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
    gap: responsiveWidth(4),
  },
  profileImageContainer: {
    borderColor: '#282828',
    height: responsiveWidth(11.2),
    width: responsiveWidth(11.2),
    borderRadius: responsiveWidth(10),
    overflow: 'hidden',
    borderRadius: responsiveWidth(10),
    borderWidth: responsiveWidth(0.5),
  },
  profileImage: {
    width: '100%',
    resizeMode: 'cover',
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
    fontFamily: 'Rubik-Medium',
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
});
