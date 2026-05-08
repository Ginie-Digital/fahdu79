import {StyleSheet, Text, View, Dimensions, ImageBackground, Pressable, ActivityIndicator, Platform} from 'react-native';
import Animated, {runOnUI} from 'react-native-reanimated';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import DIcon from '../../../DesiginData/DIcons';
import {LoginPageErrors} from '../ErrorSnacks';
import {useLazyGetAllCommentsQuery, useLazyIsValidFollowQuery, useLikeApiMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {GestureHandlerRootView, TapGestureHandler, State, Gesture} from 'react-native-gesture-handler';
// import CreateCommentBottomSheet from './CreateCommentBottomSheet';
import {toggleCommentBottomSheet, toggleLoadingComments, toggleSendPostTipModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {savePostComments, setCurrentCommentDetails, setTotalPages} from '../../../Redux/Slices/NormalSlices/CurrentCommentSlice';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome5';

import {useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';
import {TouchableOpacity} from '@gorhom/bottom-sheet';
import {Image} from 'expo-image';
import MentionText from '../MentionText';

const CustomReadMore = ({ text, textStyle, seeMoreStyle, numberOfLines = 2 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const showButton = text?.length > 70; // Threshold for showing See More based on ~2 lines

  return (
    <View style={{ width: '100%', alignItems: 'flex-start' }}>
      <MentionText
        content={text}
        style={textStyle}
        numberOfLines={isExpanded ? undefined : (showButton ? numberOfLines : undefined)}
        ellipsizeMode="tail"
      />
      {showButton && (
        <Text
          style={[seeMoreStyle, { marginTop: 4, backgroundColor: 'transparent', paddingLeft: 0, paddingRight: 0 }]}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'See less' : 'See more'}
        </Text>
      )}
    </View>
  );
};

const HomeVideoPlayer = ({route}) => {
  const {videoUrl, coverUrl, userImage, displayName, description, count, postId, liked, role, id} = route?.params;

  const player = useVideoPlayer(videoUrl, player => {
    player.loop = true;
    player.play();
  });

  const [toPlay, setToPlay] = useState(true);
  const [mute, setMute] = useState(false);

  useEffect(() => {
    if (toPlay) {
      player.play();
    } else {
      player.pause();
    }
  }, [toPlay]);

  useEffect(() => {
    player.muted = mute;
  }, [mute]);

  const currentUserId = useSelector(state => state.auth.user.currentUserId);
  const [likeApi] = useLikeApiMutation();
  const [like, setLike] = useState(count?.likes);
  const [buffering, setBuffering] = useState(false);
  const [showSub, setShowSub] = useState(false);
  const [hasLiked, setHasLiked] = useState(liked);

  const dispatch = useDispatch();
  const navigation = useNavigation();
  const token = useSelector(state => state.auth.user.token);
  const [childPressed, setChildPressed] = React.useState(false);
  const currentUserInfo = useSelector(state => state.auth.user);
  const [getAllComments] = useLazyGetAllCommentsQuery();
  const doubleTapRef = useRef(null);

  useEffect(() => {
    const subscription = player.addListener('statusChange', (status) => {
      setBuffering(status === 'loading' || status === 'buffering');
    });
    return () => subscription.remove();
  }, [player]);

  const onSingleTap = event => {
    if (event.nativeEvent.state === State.ACTIVE) {
      setToPlay(!toPlay);
    }
  };

  const sendLike = useCallback(async () => {
    if (hasLiked) {
      setLike(likeCount => (likeCount > 0 ? likeCount - 1 : likeCount));
      setHasLiked(false);
    } else {
      setLike(likeCount => likeCount + 1);
      setHasLiked(true);
    }

    const {data, error} = await likeApi({token, data: {postId}});

    if (error) {
      if (error?.status === 'FETCH_ERROR') {
        LoginPageErrors('Please check your network');
        setHasLiked(!hasLiked);
        return;
      }
      LoginPageErrors(error?.data?.message);
      return;
    }
  }, [postId, hasLiked]);

  const Mute = useCallback(() => {
    return (
      <View style={{height: responsiveWidth(7), width: responsiveWidth(7), borderRadius: responsiveWidth(20), backgroundColor: '#00000060', justifyContent: 'center', alignItems: 'center'}}>
        <Image source={mute ? require('../../../Assets/Images/mute.png') : require('../../../Assets/Images/unmute.png')} style={{height: responsiveWidth(4), width: responsiveWidth(4), resizeMode: 'contain', alignSelf: 'center'}} />
      </View>
    );
  }, [mute]);

  const handleOpenCommentSheet = async (id, focus) => {
    dispatch(toggleLoadingComments({show: true}));
    dispatch(toggleCommentBottomSheet({info: {show: 1, focus}}));
    const {data, error} = await getAllComments({token, _id: id});
    if (data) {
      const metadata = data?.data?.metadata[0];
      const totalPages = Math.ceil(metadata?.total / metadata?.limit);
      dispatch(setTotalPages({totalPages}));
      dispatch(savePostComments({comments: data?.data?.comments}));
      dispatch(toggleLoadingComments({show: false}));
      dispatch(setCurrentCommentDetails({data: {id}}));
    }
  };

  const [isValidFollow] = useLazyIsValidFollowQuery();

  useEffect(() => {
    const getValidFollow = async () => {
      const {data} = await isValidFollow({token, userName: displayName});
      if (data) setShowSub(!data?.data?.subscribe);
    };
    getValidFollow();
  }, []);

  const handleGoToOthersProfile = useCallback(() => {
    if (currentUserId !== id) {
      navigation.navigate('othersProfile', {userName: displayName, userId: id});
    } else {
      navigation.navigate('profile');
    }
  }, [currentUserId, id, displayName]);

  return (
    <TapGestureHandler
      onHandlerStateChange={onSingleTap}
      waitFor={doubleTapRef}
      shouldCancelWhenOutside={false}
      enabled={!childPressed}>
      <View style={styles.container} pointerEvents="box-none">
        <View source={{uri: coverUrl}} style={styles.videoContainer}>
          <Image blurRadius={50} source={{uri: coverUrl}} style={{position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%', opacity: 0.5}} />

          <VideoView
            player={player}
            style={styles.video}
            contentFit="cover"
            nativeControls={false}
          />

          <View style={[styles.overLayContainer]} onPress={() => setToPlay(!toPlay)}>
            <View style={styles.bottomIntractionContainer}>
              <View style={styles.postDescriptionContainer}>
                <View style={styles.headerLeftWrapper}>
                  <View style={styles.headerLeftContentContainer}>
                    <Pressable style={[styles.profileImageContainer, {borderColor: 'white', borderWidth: 1}]} onPress={() => handleGoToOthersProfile()}>
                      <Image placeholder={require('../../../Assets/Images/DefaultProfile.jpg')} source={userImage} resizeMethod="resize" style={styles.profileImage} />
                    </Pressable>

                    <Pressable style={styles.headerInformation} onPress={() => handleGoToOthersProfile()}>
                      <Text style={[styles.userName, {color: '#fff', maxWidth: responsiveWidth(40)}]} numberOfLines={1} ellipsizeMode="tail">
                        {displayName}
                      </Text>

                      {showSub && id !== currentUserId && (
                        <Pressable
                          style={styles.subscribeContainer}
                          onPress={() => {
                            setToPlay(false);
                            navigation.navigate('subscribeCreator', {
                              name: displayName,
                              profileImageUrl: userImage,
                              role,
                              id,
                            });
                          }}>
                          <Text style={[styles.userName, {color: 'white', fontFamily: 'Rubik-Medium'}]}>Subscribe</Text>
                        </Pressable>
                      )}
                    </Pressable>
                  </View>
                </View>

                <View style={{marginTop: responsiveWidth(2)}}>
                  <CustomReadMore 
                    text={description} 
                    textStyle={styles.bioText} 
                    seeMoreStyle={styles.seeMoreLess} 
                  />
                </View>
              </View>

              <View style={styles.postInteraction}>
                <Pressable style={styles.interactorContainer} onPressIn={() => setChildPressed(true)} onPressOut={() => setChildPressed(false)} onPress={sendLike}>
                  <DIcon color={hasLiked ? '#ff6961' : '#fff'} provider={'AntDesign'} name={'heart'} size={responsiveWidth(7)} />
                  <Text style={styles.interactorText}>{like}</Text>
                </Pressable>

                <Pressable onPress={() => handleOpenCommentSheet(postId, false)} onPressIn={() => setChildPressed(true)} onPressOut={() => setChildPressed(false)} style={styles.interactorContainer}>
                  <DIcon color={'#fff'} provider={'Ionicons'} name={'chatbubble-sharp'} size={responsiveWidth(7.5)} />
                  <Text style={styles.interactorText}>{count?.comments}</Text>
                </Pressable>

                {id !== currentUserId && (
                  <Pressable style={styles.interactorContainer} onPressIn={() => setChildPressed(true)} onPressOut={() => setChildPressed(false)} onPress={() => dispatch(toggleSendPostTipModal({info: {show: true, postId}}))}>
                    <Image source={require('../../../Assets/Images/Coin.png')} style={{height: responsiveWidth(7), width: responsiveWidth(7), resizeMode: 'contain', alignSelf: 'center'}} />
                    <Text style={[styles.interactorText, {fontFamily: 'Rubik-Bold'}]}>Tip</Text>
                  </Pressable>
                )}

                <Pressable onPressIn={() => setChildPressed(true)} onPressOut={() => setChildPressed(false)} onPress={() => setMute(mute => !mute)} style={[styles.interactorContainer, {marginTop: responsiveWidth(2)}]}>
                  <Mute />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
        {/* <CreateCommentBottomSheet /> */}
        {!toPlay && (
          <TouchableOpacity onPressIn={() => setChildPressed(true)} onPressOut={() => setChildPressed(false)} onPress={() => setToPlay(!toPlay)} style={Platform.OS === 'android' ? styles.playPauseStyle : styles.playPauseStyleIos}>
            {buffering ? <ActivityIndicator size={'large'} color={'white'} /> : <DIcon provider={'Ionicons'} name={'play'} size={responsiveWidth(10)} color="#fff" />}
          </TouchableOpacity>
        )}

        {buffering && toPlay && (
          <TouchableOpacity onPressIn={() => setChildPressed(true)} onPressOut={() => setChildPressed(false)} onPress={() => setToPlay(!toPlay)} style={Platform.OS === 'android' ? styles.playPauseStyle : styles.playPauseStyleIos}>
            <ActivityIndicator size={'large'} color={'white'} />
          </TouchableOpacity>
        )}
      </View>
    </TapGestureHandler>
  );
};

export default HomeVideoPlayer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
  },

  videoContainer: {
    borderColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
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
    display: 'flex',
  },
  bottomIntractionContainer: {
    marginTop: 'auto',
    minHeight: responsiveWidth(30),
    flexDirection: 'row',
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

  postDescriptionContainer: {
    width: responsiveWidth(75),
    paddingLeft: responsiveWidth(4),
    paddingRight: responsiveWidth(2),
    marginTop: 'auto',
    marginBottom: responsiveWidth(4),
  },
  headerLeftWrapper: {
    height: responsiveWidth(12),
    justifyContent: 'center',
  },
  headerLeftContentContainer: {
    height: '100%',
    borderColor: 'blue',
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(2),
  },
  profileImageContainer: {
    borderColor: '#282828',
    height: responsiveWidth(7),
    width: responsiveWidth(7),
    borderRadius: responsiveWidth(10),
    overflow: 'hidden',
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    resizeMode: 'cover',
    height: '100%',
  },
  userName: {
    fontFamily: 'Rubik-Regular',
    color: '#282828',
    fontSize: responsiveFontSize(1.7),
  },
  postDescriptionText: {
    color: '#282828',
  },
  bioText: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Regular',
    color: '#fff',
    lineHeight: 22,
  },
  seeMoreStyle: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Medium',
    color: '#ff6961',
  },
  seeMoreLess: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Medium',
    color: '#ff6961',
  },
  headerInformation: {
    flexDirection: 'row',
    gap: responsiveWidth(4),
    alignItems: 'center',
  },
  subscribeContainer: {
    borderWidth: 1,
    padding: responsiveWidth(0.5),
    paddingHorizontal: responsiveWidth(1),
    borderRadius: responsiveWidth(1),
    borderColor: 'white',
  },
  playPauseStyle: {
    height: responsiveWidth(18),
    width: responsiveWidth(18),
    borderRadius: responsiveWidth(20),
    backgroundColor: '#00000060',
    position: 'absolute',
    alignSelf: 'center',
    top: responsiveWidth(-110),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  playPauseStyleIos: {
    height: responsiveWidth(18),
    width: responsiveWidth(18),
    borderRadius: responsiveWidth(20),
    backgroundColor: '#00000060',
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    transform: [{translateY: -responsiveWidth(9)}],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
});
