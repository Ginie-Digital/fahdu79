import { StyleSheet, Text, View, Dimensions, FlatList, ActivityIndicator, Image as RNImage, Platform, TouchableOpacity, Pressable } from 'react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import { responsiveFontSize, responsiveWidth, responsiveHeight } from 'react-native-responsive-dimensions';
import DIcon from '../../../DesiginData/DIcons';
import ReadMore from '@fawazahmed/react-native-read-more';
import MentionText from '../MentionText';

import { useLazyGetAllCommentsQuery, useLazyIsValidFollowQuery, useLikeApiMutation, useLazyOtherPostListQuery } from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { GestureHandlerRootView, TapGestureHandler, State } from 'react-native-gesture-handler';
import CreateCommentBottomSheet from '../HomeComponents/CreateCommentBottomSheet';
import { toggleCommentBottomSheet, toggleLoadingComments, toggleSendPostTipModal } from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import { savePostComments, setCurrentCommentDetails, setTotalPages } from '../../../Redux/Slices/NormalSlices/CurrentCommentSlice';
import { appendFeedCachePosts, manipulateCurrentPagePost } from '../../../Redux/Slices/NormalSlices/Posts/ProfileFeedCacheSlice';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LoginPageErrors } from '../ErrorSnacks';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';

const { height, width } = Dimensions.get('window');

const ReelItem = React.memo(({ item, isPlaying, isActive }) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const token = useSelector(state => state.auth.user.token);
  const currentUserId = useSelector(state => state.auth.user.currentUserId);
  
  const remoteUrl = item?.post_content_files?.[0]?.url;
  const player = useVideoPlayer(remoteUrl, player => {
    player.loop = true;
    if (isPlaying && isActive) {
      player.play();
    }
  });

  const [mute, setMute] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [paused, setPaused] = useState(!isPlaying);

  useEffect(() => {
    if (isPlaying && isActive) {
      player.play();
      setPaused(false);
    } else {
      player.pause();
      setPaused(true);
    }
  }, [isPlaying, isActive, player]);

  useEffect(() => {
    player.muted = mute;
  }, [mute, player]);

  useEffect(() => {
    const subscription = player.addListener('statusChange', (status) => {
      setBuffering(status === 'loading' || status === 'buffering');
    });
    return () => subscription.remove();
  }, [player]);

  const [likeCount, setLikeCount] = useState(item?.count?.likes || 0);
  const [showSub, setShowSub] = useState(false);
  const [hasLiked, setHasLiked] = useState(item?.has_liked);
  const [childPressed, setChildPressed] = useState(false);
  const [showHeart, setShowHeart] = useState(false);

  const doubleTapRef = useRef(null);
  const lottieRef = useRef(null);
  const singleTapTimeout = useRef(null);

  const [likeApi] = useLikeApiMutation();
  const [getAllComments] = useLazyGetAllCommentsQuery();
  const [isValidFollow] = useLazyIsValidFollowQuery();

  useEffect(() => {
    if (isActive) {
        const getValidFollow = async () => {
        const { data } = await isValidFollow({ token, userName: item?.createdBy?.displayName });
        if (data) {
            setShowSub(!data?.data?.subscribe);
        }
        };
        getValidFollow();
    }
  }, [isActive, item?.createdBy?.displayName]);

  const onSingleTap = useCallback(() => {
      if (player.playing) {
        player.pause();
        setPaused(true);
      } else {
        player.play();
        setPaused(false);
      }
  }, [player]);

  const onDoubleTap = useCallback(() => {
     if (!hasLiked) {
       sendLike();
     }
     setShowHeart(true);
     lottieRef.current?.play();
     setTimeout(() => {
       setShowHeart(false);
     }, 1500);
  }, [hasLiked]);

  const sendLike = useCallback(async () => {
    if (hasLiked) {
      setLikeCount(prev => (prev > 0 ? prev - 1 : prev));
      setHasLiked(false);
    } else {
      setLikeCount(prev => prev + 1);
      setHasLiked(true);
    }
    await likeApi({ token, data: { postId: item?._id } });
  }, [item?._id, hasLiked, token, likeApi]);

  const handleOpenCommentSheet = async () => {
    dispatch(toggleLoadingComments({ show: true }));
    dispatch(toggleCommentBottomSheet({ info: { show: 1, focus: false } }));
    const { data } = await getAllComments({ token, _id: item?._id });
    if (data) {
      const metadata = data?.data?.metadata?.[0];
      const totalPages = metadata ? Math.ceil(metadata.total / metadata.limit) : 1;
      dispatch(setTotalPages({ totalPages }));
      dispatch(savePostComments({ comments: data?.data?.comments }));
      dispatch(setCurrentCommentDetails({ data: { id: item?._id } }));
    }
    dispatch(toggleLoadingComments({ show: false }));
  };
  
  const handleGoToOthersProfile = useCallback(() => {
      // already on their profile
  }, []);

  const coverUrl = item?.video?.thumbnail?.url || item?.post_content_files?.[0]?.thumbnail;

  return (
    <Pressable
      onPress={(event) => {
        const now = Date.now();
        const DOUBLE_PRESS_DELAY = 300;
        if (doubleTapRef.current && (now - doubleTapRef.current) < DOUBLE_PRESS_DELAY) {
            if (singleTapTimeout.current) {
                clearTimeout(singleTapTimeout.current);
                singleTapTimeout.current = null;
            }
            onDoubleTap();
            doubleTapRef.current = null;
        } else {
            doubleTapRef.current = now;
            if (singleTapTimeout.current) clearTimeout(singleTapTimeout.current);
            singleTapTimeout.current = setTimeout(() => {
                onSingleTap();
                doubleTapRef.current = null; 
                singleTapTimeout.current = null;
            }, DOUBLE_PRESS_DELAY);
        }
      }}
      style={{height: height, width: width}}
    >
      <View style={styles.container}>
        <View style={styles.videoContainer}>
            {coverUrl && (
                <Image 
                    blurRadius={50} 
                    source={{ uri: coverUrl }} 
                    style={StyleSheet.absoluteFill} 
                />
            )}
            
          {isActive ? (
            <VideoView
              player={player}
              style={styles.video}
              contentFit="cover"
              nativeControls={false}
            />
          ) : (
            <Image
              source={{ uri: coverUrl || remoteUrl }}
              style={styles.video}
              contentFit="cover"
            />
          )}

          <View style={styles.overLayContainer}>
            <LinearGradient
                colors={['transparent', '#00000066', '#000000B3']}
                style={styles.gradient}
            />

             {showHeart && (
                <View style={styles.lottieContainer}>
                    <LottieView
                        ref={lottieRef}
                        source={require('../../../Assets/Animation/like.json')}
                        style={{ width: responsiveWidth(50), height: responsiveWidth(50) }}
                        autoPlay
                        loop={false}
                    />
                </View>
             )}

             <View style={styles.bottomIntractionContainer}>
               <View style={styles.postDescriptionContainer}>
                 <View style={styles.headerLeftWrapper}>
                   <View style={styles.headerLeftContentContainer}>
                     <Pressable style={[styles.profileImageContainer, {borderColor: 'white', borderWidth: 1}]} onPress={handleGoToOthersProfile}>
                       <Image placeholder={require('../../../Assets/Images/DefaultProfile.jpg')} source={item?.createdBy?.profile_image?.url} resizeMethod="resize" style={styles.profileImage} />
                     </Pressable>

                     <Pressable style={styles.headerInformation} onPress={handleGoToOthersProfile}>
                       <Text style={[styles.userName, {color: '#fff', maxWidth: responsiveWidth(40)}]} numberOfLines={1} ellipsizeMode="tail">
                         {item?.createdBy?.displayName}
                       </Text>

                       {showSub && item?.createdBy?._id !== currentUserId && (
                        <Pressable
                          style={styles.subscribeContainer}
                          onPress={() => {
                            player.pause();
                            setPaused(true);
                            navigation.navigate('subscribeCreator', {
                              name: item?.createdBy?.displayName,
                              profileImageUrl: item?.createdBy?.profile_image?.url,
                              role: item?.createdBy?.role,
                              id: item?.createdBy?._id,
                            });
                          }}>
                          <Text style={[styles.userName, {color: '#fff', fontFamily: 'Rubik-Medium', fontSize: responsiveFontSize(1.6)}]}> + Subscribe</Text>
                        </Pressable>
                       )}
                     </Pressable>
                   </View>
                 </View>

                 <ReadMore animate numberOfLines={2} style={styles.bioText} seeMoreStyle={styles.seeMoreLess} seeLessStyle={styles.seeMoreLess}>
                   <MentionText content={item?.postContent} style={styles.bioText} />
                 </ReadMore>
               </View>

               <View style={styles.postInteraction}>
                 <Pressable style={styles.interactorContainer} onPress={sendLike} onPressIn={() => setChildPressed(true)} onPressOut={() => setChildPressed(false)}>
                   <DIcon color={hasLiked ? '#ff6961' : '#fff'} provider={'AntDesign'} name={'heart'} size={responsiveWidth(7)} />
                   <Text style={[styles.interactorText, {textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: {width: -1, height: 1}, textShadowRadius: 10}]}>{likeCount}</Text>
                 </Pressable>

                 <Pressable onPress={handleOpenCommentSheet} onPressIn={() => setChildPressed(true)} onPressOut={() => setChildPressed(false)} style={styles.interactorContainer}>
                   <DIcon color={'#fff'} provider={'Ionicons'} name={'chatbubble-sharp'} size={responsiveWidth(7.5)} />
                   <Text style={[styles.interactorText, {textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: {width: -1, height: 1}, textShadowRadius: 10}]}>{item?.count?.comments || 0}</Text>
                 </Pressable>

                 {item?.createdBy?._id !== currentUserId && (
                   <Pressable style={styles.interactorContainer} onPress={() => dispatch(toggleSendPostTipModal({ info: { show: true, postId: item?._id } }))} onPressIn={() => setChildPressed(true)} onPressOut={() => setChildPressed(false)}>
                     <Image source={require('../../../Assets/Images/Coin.png')} style={{height: responsiveWidth(7), width: responsiveWidth(7), resizeMode: 'contain', alignSelf: 'center'}} />
                     <Text style={[styles.interactorText, {fontFamily: 'Rubik-Bold', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: {width: -1, height: 1}, textShadowRadius: 10}]}>Tip</Text>
                   </Pressable>
                 )}

                 <Pressable onPress={() => setMute(prev => !prev)} onPressIn={() => setChildPressed(true)} onPressOut={() => setChildPressed(false)} style={[styles.interactorContainer, {marginTop: responsiveWidth(2)}]}>
                    <View style={{height: responsiveWidth(7), width: responsiveWidth(7), borderRadius: responsiveWidth(20), backgroundColor: '#00000060', justifyContent: 'center', alignItems: 'center'}}>
                        <Image source={mute ? require('../../../Assets/Images/mute.png') : require('../../../Assets/Images/unmute.png')} style={{height: responsiveWidth(4), width: responsiveWidth(4), resizeMode: 'contain', alignSelf: 'center'}} />
                    </View>
                 </Pressable>
               </View>
             </View>
          </View>

          {paused && !buffering && (
             <View style={Platform.OS === 'android' ? styles.playPauseStyle : styles.playPauseStyleIos}>
                <DIcon provider={'Ionicons'} name={'play'} size={responsiveWidth(10)} color="#fff" />
             </View>
          )}

          {buffering && (
             <View style={Platform.OS === 'android' ? styles.playPauseStyle : styles.playPauseStyleIos}>
                <ActivityIndicator size={'large'} color={'white'} />
             </View>
          )}

        </View>
      </View>
    </Pressable>
  );
});

const OtherProfileReels = ({ route }) => {
  const { initialPostId } = route?.params || {};
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const allPosts = useSelector(state => state.profileFeedCache.data.content);
  
  const videoPosts = React.useMemo(() => {
    return allPosts.filter(post => {
      const isVideo = post?.post_content_files?.[0]?.format === 'video' || post?.type === 'video';
      return isVideo;
    });
  }, [allPosts]);

  const infiniteData = React.useMemo(() => {
    if (videoPosts.length === 0) return [];
    return [...videoPosts, ...videoPosts, ...videoPosts];
  }, [videoPosts]);

  const { currentPage, totalPages } = useSelector(state => state.profileFeedCache.data);
  const [otherPostList] = useLazyOtherPostListQuery();
  const token = useSelector(state => state.auth.user.token);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const { userName } = route?.params || {};

  const flatListRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const calculateInitialScrollIndex = useCallback(() => {
    if (videoPosts.length === 0) return 0;
    const originalIndex = initialPostId 
      ? videoPosts.findIndex(p => p._id === initialPostId) 
      : 0;
    const safeIndex = originalIndex !== -1 ? originalIndex : 0;
    return safeIndex + videoPosts.length;
  }, [initialPostId, videoPosts]);

  const [scrollIndex, setScrollIndex] = useState(calculateInitialScrollIndex());

  useEffect(() => {
    setScrollIndex(calculateInitialScrollIndex());
  }, [videoPosts.length, initialPostId]);

  const loadMore = async () => {
    if (isFetchingMore || currentPage >= totalPages) return;

    setIsFetchingMore(true);
    const nextPage = currentPage + 1;

    try {
      const { data: postData } = await otherPostList({
        token,
        userName,
        page: nextPage
      });

      if (postData?.data?.posts?.length > 0) {
        dispatch(appendFeedCachePosts({ data: postData.data.posts }));
        dispatch(manipulateCurrentPagePost({ currentPage: nextPage }));
      }
    } catch (error) {
      console.error('Error fetching more posts:', error);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }, []);

  const onMomentumScrollEnd = useCallback((event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / height);
    const setLength = videoPosts.length;

    if (setLength === 0) return;

    if (index < setLength) {
        const newIndex = index + setLength;
        flatListRef.current?.scrollToIndex({ index: newIndex, animated: false });
        setActiveIndex(newIndex);
    }
    else if (index >= 2 * setLength) {
        const newIndex = index - setLength;
        flatListRef.current?.scrollToIndex({ index: newIndex, animated: false });
        setActiveIndex(newIndex);
    }

    const relativeIndex = index % setLength;
    if (relativeIndex >= setLength - 2) {
        loadMore();
    }

  }, [videoPosts.length, loadMore]);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50
  };

  const getItemLayout = useCallback((data, index) => ({
    length: height,
    offset: height * index,
    index,
  }), []);

  const renderItem = useCallback(({ item, index }) => {
    return (
      <ReelItem 
        item={item} 
        isPlaying={index === activeIndex} 
        isActive={index === activeIndex}
      />
    );
  }, [activeIndex]);

  if (videoPosts.length === 0) {
     return (
        <View style={{flex:1, backgroundColor:'#000', justifyContent:'center', alignItems:'center'}}>
            <Text style={{color:'white'}}>No videos found</Text>
        </View>
     );
  }

  const onScrollToIndexFailed = (info) => {
    const wait = new Promise(resolve => setTimeout(resolve, 500));
    wait.then(() => {
      flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
        <GestureHandlerRootView style={{ flex: 1 }}>
            <TouchableOpacity 
                style={{position: 'absolute', top: responsiveHeight(5), left: 15, zIndex: 10}}
                onPress={() => navigation.goBack()}
            >
                <DIcon provider="Ionicons" name="arrow-back" size={30} color="white" />
            </TouchableOpacity>

            <FlatList
                ref={flatListRef}
                data={infiniteData}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${item._id}_${index}`}
                pagingEnabled
                vertical
                showsVerticalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                getItemLayout={getItemLayout}
                initialScrollIndex={scrollIndex}
                onScrollToIndexFailed={onScrollToIndexFailed}
                onMomentumScrollEnd={onMomentumScrollEnd}
                windowSize={3}
                removeClippedSubviews={true}
                ListFooterComponent={() => isFetchingMore ? <View style={{ padding: 20, height: height, justifyContent: 'center' }}><ActivityIndicator size="large" color="#fff" /></View> : null}
            />
            
            <CreateCommentBottomSheet />
        </GestureHandlerRootView>
    </View>
  );
};

export default OtherProfileReels;

const styles = StyleSheet.create({
  container: {
    height: height,
    width: width,
    backgroundColor: 'black',
    justifyContent: 'center',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overLayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    justifyContent: 'flex-end',
  },
  bottomIntractionContainer: {
    marginTop: 'auto',
    minHeight: responsiveWidth(30),
    flexDirection: 'row',
  },
  postDescriptionContainer: {
    width: responsiveWidth(75),
    paddingLeft: responsiveWidth(4),
    paddingRight: responsiveWidth(2),
    marginTop: responsiveWidth(30),
  },
  postInteraction: {
    height: responsiveWidth(75),
    marginTop: 'auto',
    width: responsiveWidth(22),
    marginLeft: 'auto',
    flexDirection: 'column',
    gap: responsiveWidth(6),
  },
  interactorContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: responsiveWidth(1),
  },
  interactorText: {
    fontFamily: 'Rubik-Bold',
    color: '#fff',
    fontSize: responsiveFontSize(2.1),
  },
  headerLeftWrapper: {
    marginBottom: responsiveWidth(2),
  },
  headerLeftContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(2),
  },
  profileImageContainer: {
    height: responsiveWidth(9),
    width: responsiveWidth(9),
    borderRadius: responsiveWidth(10),
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  headerInformation: {
    flex: 1,
  },
  userName: {
    fontFamily: 'Rubik-Bold',
    color: '#fff',
    fontSize: responsiveFontSize(1.9),
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  bioText: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Regular',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  seeMoreLess: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Medium',
    color: '#ff6961',
  },
  subscribeContainer: {
    marginTop: 2,
    paddingVertical: responsiveWidth(1),
    paddingHorizontal: responsiveWidth(3),
    borderRadius: responsiveWidth(5),
    backgroundColor: '#ffa86b',
    alignSelf: 'flex-start',
    marginLeft: responsiveWidth(1),
  },
  playPauseStyle: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -responsiveWidth(9),
    height: responsiveWidth(18),
    width: responsiveWidth(18),
    borderRadius: responsiveWidth(9),
    backgroundColor: '#00000060',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  playPauseStyleIos: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -responsiveWidth(9),
    height: responsiveWidth(18),
    width: responsiveWidth(18),
    borderRadius: responsiveWidth(9),
    backgroundColor: '#00000060',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '25%',
  },
  lottieContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    pointerEvents: 'none',
  },
});
