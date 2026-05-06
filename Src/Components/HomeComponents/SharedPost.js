import {StyleSheet, Text, View, TouchableOpacity, Dimensions, Pressable} from 'react-native';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {responsiveWidth, responsiveFontSize, responsiveHeight} from 'react-native-responsive-dimensions';
import DIcon from '../../../DesiginData/DIcons';
import Moment from 'react-moment';

import {Gesture} from 'react-native-gesture-handler';
import {GestureDetector} from 'react-native-gesture-handler';
import Animated, {runOnJS, useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';
import {useNavigation, useNavigationState} from '@react-navigation/native';
import {
  useGetPostDetailsMutation,
  useLazyGetAllCommentsQuery,
  useLikeApiMutation
} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useDispatch, useSelector} from 'react-redux';
import {
  toggleCommentBottomSheet,
  toggleLoadingComments,
  togglePostActionBottomSheet,
  toggleSendPostTipModal,
  toggleWhoTippedSheet
} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import Pinchable from 'react-native-pinchable';
import {LoginPageErrors} from '../ErrorSnacks';
import {savePostComments, setCurrentCommentDetails} from '../../../Redux/Slices/NormalSlices/CurrentCommentSlice';
import {navigate} from '../../../Navigation/RootNavigation';
import {memo} from 'react';
import LinearGradient from 'react-native-linear-gradient';
import {autoLogout} from '../../../AutoLogout';
import Heart from '../../../Assets/svg/heart.svg';
import Fill from '../../../Assets/svg/fillh.svg';
import Comment from '../../../Assets/svg/comm.svg';
import Play from '../../../Assets/svg/play.svg';
import Verify from '../../../Assets/svg/vvv.svg';
import Paisa from '../../../Assets/svg/paisa.svg';
import Share from '../../../Assets/svg/sharepost.svg';
import share from 'react-native-share';
import {Image} from 'expo-image';
import MentionText from '../MentionText';
import {WIDTH_SIZES} from '../../../DesiginData/Utility';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const handlePostActionHandler = async (postId, image, displayName, description) => {
  try {
    const postLink = `https://app.fahdu.com/post/${postId}`;
    let x = await share.open({
      url: postLink,
    });
    if (x.success) {
      // chatRoomSuccess('Shared successfully!');
    }
  } catch (e) {
    console.log(e?.message);
  }
};

let timer;

const SharedPost = ({route}) => {
  const screenName = useNavigationState(state => state.routes[state.index].name);
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const [item, setItem] = useState({});
  const [loading, setLoading] = useState(true);
  const [doLiked, setDoLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCounts] = useState(0);

  const heartSize = useSharedValue(0);
  const heartDisplay = useSharedValue('none');

  const token = useSelector(state => state.auth.user.token);
  const currentUserId = useSelector(state => state.auth.user.currentUserId);

  const [likeApi] = useLikeApiMutation();
  const [getAllComments] = useLazyGetAllCommentsQuery();
  const [getPostDetails] = useGetPostDetailsMutation();

  const handleGoToOthersProfile = (displayName, userId) => {
    if (currentUserId !== userId) {
      navigate('othersProfile', {
        userName: displayName,
        userId: userId,
        role: 'creator',
      });
    } else {
      navigate('profile');
    }
  };

  const handleGetPostDetails = async () => {
    setLoading(true);
    const {data, error} = await getPostDetails({token, data: {postId: route?.params?.postId}});

    if (data) {
      const postData = data?.data;
      setItem(postData);
      setDoLiked(postData?.has_liked);
      setLikeCount(postData?.count?.likes);
      setCommentCounts(postData?.count?.comments);
      setLoading(false);
    }

    if (error) {
      console.log(error, 'ERRROR');
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGetPostDetails();
  }, [route?.params?.postId]);

  const handleOpenCommentSheet = async (id, focus) => {
    dispatch(toggleLoadingComments({show: true}));
    dispatch(toggleCommentBottomSheet({info: {show: 1, focus}}));
    const {data, error} = await getAllComments({token, _id: id});

    if (error) {
      LoginPageErrors(error.message);
    }

    if (data) {
      dispatch(savePostComments({comments: data?.data?.comments}));
      dispatch(toggleLoadingComments({show: false}));
      dispatch(setCurrentCommentDetails({data: {id}}));
    }
  };

  function sendLike() {
    if (doLiked) {
      setDoLiked(false);
      setLikeCount(prev => prev - 1);
    } else {
      setDoLiked(true);
      setLikeCount(prev => prev + 1);
    }

    clearTimeout(timer);
    timer = setTimeout(executeServer, 1000);
  }

  function executeServer() {
    likeApi({token, data: {postId: item?._id}}).then(e => {
      // Logic for background sync if needed
    });
  }

  const toggleIndex = () => {};

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .onStart(() => {
          heartSize.value = 100;
          heartDisplay.value = 'flex';
          runOnJS(toggleIndex)(true);
        }),
    [],
  );

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

  const handleCoinClicks = useCallback(() => {
    if (screenName === 'myProfileNormalPost') {
      dispatch(toggleWhoTippedSheet({info: {show: 1, postId: item?._id}}));
    } else {
      dispatch(toggleSendPostTipModal({info: {show: true, postId: item?._id}}));
    }
  }, [screenName, item?._id]);

  if (loading) {
    return (
      <View style={[styles.cardContainer, {justifyContent: 'center', alignItems: 'center', flex: 1}]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const isLocked = !item?.post_content_files || item?.post_content_files.length === 0;

  return (
    <View style={{backgroundColor: '#fff', flex: 1}}>
      <View style={[styles.cardContainer]} key={item?._id}>
        {/* Header Section */}
        <View style={{paddingHorizontal: responsiveWidth(2)}}>
          <View style={styles.cardHeaderWrapper}>
            <View style={styles.headerLeftWrapper}>
              <View style={styles.headerLeftContentContainer}>
                <Pressable style={styles.profileImageContainer} onPress={() => handleGoToOthersProfile(item?.createdBy?.displayName, item?.createdBy?._id)}>
                  <Image allowDownscaling placeholder={require('../../../Assets/Images/DefaultProfile.jpg')} source={{uri: item?.createdBy?.profile_image?.url}} resizeMethod="resize" style={styles.profileImage} />
                </Pressable>

                <View>
                  <View style={{flexDirection: 'column'}}>
                    <Pressable style={styles.headerInformation} onPress={() => handleGoToOthersProfile(item?.createdBy?.displayName, item?.createdBy?._id)}>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: responsiveWidth(1)}}>
                        <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                          {item?.createdBy?.displayName}
                        </Text>
                        {item?.createdBy?.role === 'creator' && <Verify />}
                      </View>
                    </Pressable>
                    <Moment style={styles.timiming} element={Text} fromNow>
                      {item?.createdAt}
                    </Moment>
                  </View>
                </View>
              </View>
            </View>
            <DIcon provider={'Entypo'} name={'dots-three-vertical'} size={responsiveWidth(5)} onPress={() => dispatch(togglePostActionBottomSheet({info: {show: 1, postId: item?._id, userId: item?.createdBy?._id}}))} />
          </View>
          <View style={styles.cardTextWrapper}>
            {item?.postContent ? (
              <MentionText content={item?.postContent} style={styles.cardText} />
            ) : null}
          </View>
        </View>

        {/* Media Content Section */}
        <View style={[styles.imageContainer]}>
          {isLocked ? (
            /* Locked State */
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
                id={item?._id?.toString()}
              />

              <View style={styles.subPlaceHolder}>
                <DIcon provider={'SimpleLineIcons'} name={'lock'} color="#fff" style={{alignSelf: 'center', marginBottom: responsiveWidth(2)}} size={responsiveWidth(8)} />
                <Text style={[styles.subscribeMessage, {fontSize: responsiveFontSize(2)}]}>{`Unlock Exclusive Content`}</Text>

                <TouchableOpacity
                  style={styles.subscribeBox}
                  onPress={() =>
                    navigate('subscribeCreator', {
                      name: item?.createdBy?.displayName,
                      profileImageUrl: item?.createdBy?.profile_image?.url,
                      role: item?.createdBy?.role,
                      id: item?.createdBy?._id,
                    })
                  }>
                  <Text style={[styles.subscribeMessage]}>
                    SUBSCRIBE
                    <Text style={[styles.subscribeMessage, {color: '#ffa07a'}]}> NOW</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Unlocked State (Video or Image) */
            <GestureDetector gesture={tap}>
              <View style={{width: '100%', position: 'relative'}} key={item?._id?.toString()} id={item?._id?.toString()}>
                {item?.post_content_files?.[0]?.format === 'video' ? (
                  /* Video Thumbnail with Play Button */
                  <View style={{width: '100%', aspectRatio: 2 / 3}}>
                    <Image source={{uri: item?.video?.thumbnail?.url}} style={styles.videoImage} />
                    <LinearGradient colors={['#00000065', 'transparent', 'transparent', 'transparent', 'transparent', 'transparent', '#00000060', '#00000070']} style={styles.overLayContainer}>
                      <TouchableOpacity
                        style={{position: 'absolute', top: '45%', alignSelf: 'center'}}
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
                        <Play />
                      </TouchableOpacity>
                    </LinearGradient>
                  </View>
                ) : (
                  /* Single Image */
                  <Image
                    source={item?.post_content_files?.[0]?.url}
                    placeholder={require('../../../Assets/Images/DefaultPost.jpg')}
                    contentFit="cover"
                    style={{
                      width: '100%',
                      height: undefined,
                      aspectRatio: item?.image?.hasAspectRatio ? Number(item?.image?.aspectRatio?.width) / Number(item?.image?.aspectRatio?.height) : 1 / 1,
                    }}
                    allowDownscaling
                  />
                )}
                <Animated.Image source={require('../../../Assets/Images/heart.png')} style={animatedStyles} />
              </View>
            </GestureDetector>
          )}
        </View>

        {/* Engagement Section (Only if NOT locked) */}
        {!isLocked && (
          <>
            <View style={{paddingHorizontal: responsiveWidth(5), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: responsiveWidth(4)}}>
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
                    <Share />
                  </TouchableOpacity>
                </View>
              </View>

              {item?.createdBy?.role !== 'admin' && (
                <TouchableOpacity onPress={() => handleCoinClicks()}>
                  <Paisa />
                </TouchableOpacity>
              )}
            </View>

            {/* Comment Preview Input */}
            <View style={{paddingHorizontal: responsiveWidth(2), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: responsiveWidth(1)}}>
              <View style={{width: responsiveWidth(40), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                <View style={{flexDirection: 'row', gap: responsiveWidth(1), alignItems: 'center'}}>
                  <View style={styles.previewCommentProfileContainer}>
                    <Image
                      source={!item?.createdBy?.profile_image?.url ? require('../../../Assets/Images/DefaultProfile.jpg') : {uri: item?.createdBy?.profile_image?.url}}
                      style={styles.previewCommentProfileImage}
                    />
                  </View>
                  <Text onPress={() => handleOpenCommentSheet(item?._id, true)} style={styles.addCommentsText}>
                    Add a Comment
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

export default memo(SharedPost);

const styles = StyleSheet.create({
  cardContainer: {
    borderBottomColor: '#E9E9E9',
    overflow: 'hidden',
    marginBottom: responsiveHeight(1),
    backgroundColor: 'white',
    width: '100%',
  },
  cardHeaderWrapper: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: 'blue',
  },
  headerLeftWrapper: {
    height: responsiveWidth(12),
    justifyContent: 'center',
    flexBasis: '50%',
  },
  headerLeftContentContainer: {
    height: '100%',
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
    left: responsiveWidth(2.5),
    borderWidth: responsiveWidth(0.5),
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontFamily: 'Rubik-SemiBold',
    color: '#1e1e1e',
    fontSize: responsiveFontSize(1.97),
    lineHeight: 19,
  },
  cardTextWrapper: {
    flex: 1,
    marginLeft: responsiveWidth(2),
    paddingHorizontal: responsiveWidth(1),
    paddingVertical: responsiveWidth(1.5),
    height: 'auto',
  },
  cardText: {
    color: '#1e1e1e',
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.72),
    marginVertical: 8,
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
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  subscribeBox: {
    borderWidth: 2,
    borderColor: 'white',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: responsiveWidth(4),
    padding: responsiveWidth(2),
    borderRadius: responsiveWidth(2),
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
  previewCommentProfileContainer: {
    height: responsiveWidth(8),
    width: responsiveWidth(8),
    borderRadius: responsiveWidth(4),
    marginLeft: WIDTH_SIZES['10'],
    borderWidth: 1,
    borderColor: '#282828',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  previewCommentProfileImage: {
    height: '100%',
    width: '100%',
    resizeMode: 'cover',
  },
  addCommentsText: {
    color: '#B4B4B4',
    marginLeft: responsiveWidth(2),
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.5),
  },
});
