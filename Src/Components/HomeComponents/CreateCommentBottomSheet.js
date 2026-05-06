import {StyleSheet, View, TouchableOpacity, Text, Pressable, BackHandler, Button, Platform, Keyboard, ActivityIndicator} from 'react-native';
import React, {useMemo, useCallback, useRef, useState, useEffect} from 'react';
import {responsiveWidth, responsiveFontSize} from 'react-native-responsive-dimensions';
import {BottomSheetBackdrop, BottomSheetModal, BottomSheetTextInput} from '@gorhom/bottom-sheet';
import DIcon from '../../../DesiginData/DIcons';
import {FlatList, TextInput} from 'react-native-gesture-handler';
import {useDispatch, useSelector} from 'react-redux';
import {toggleCommentBottomSheet} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useDoCommentMutation, useLazyGetAllCommentsQuery} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import Moment from 'react-moment';
import {LoginPageErrors} from '../ErrorSnacks';
import {SafeAreaView} from 'react-native-safe-area-context';
import {deletePostComments, pushComment, savePostComments, setCurrentCommentDetails, setTotalPages} from '../../../Redux/Slices/NormalSlices/CurrentCommentSlice';
import CommentShimmer from '../Shimmers/CommentShimmer';
import {Image} from 'expo-image';
import {FONT_SIZES, selectionTwin, WIDTH_SIZES} from '../../../DesiginData/Utility';
import {incrementCommentCount} from '../../../Redux/Slices/NormalSlices/Home/FeedCacheSlice';
import {myProfileIncrementCommentCount} from '../../../Redux/Slices/NormalSlices/Posts/MyProfileFeedCacheSlice';
import {otherProfileIncrementCommentCount} from '../../../Redux/Slices/NormalSlices/Posts/ProfileFeedCacheSlice';

const CreateCommentBottomSheet = ({fromPage}) => {
  console.log(fromPage, ':L::::::FRom page');

  const bottomSheetRef = useRef(null);

  const inputRef = useRef(null);

  const {show: commentBottomSheetVisibility, focus: shouldBeFocus} = useSelector(state => state.hideShow.visibility.commentBottomSheet);

  const loggedInUser = useSelector(state => state.auth.user);

  const {data: postData, comments, totalPages} = useSelector(state => state.currentComment.content);

  const showCommentsShimmer = useSelector(state => state.hideShow.visibility.loadingComments);

  const [text, setText] = useState('');

  const [doComment] = useDoCommentMutation();

  const dispatch = useDispatch();

  const snapPoints = useMemo(() => [responsiveWidth(100), Keyboard.isVisible() ? responsiveWidth(100) : responsiveWidth(150)], []);

  const [getAllComments] = useLazyGetAllCommentsQuery();

  const [commentLoader, setCommentLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(2);
  const [showLoadMoreButton, setShowLoadMoreButton] = useState(true);

  const [doCommentLoader, setDoCommentLoader] = useState(false);

  function LoadMoreButton({loading, onPress}) {
    return (
      <View
        style={{
          position: 'absolute',
          bottom: 10,
          alignSelf: 'center',
          zIndex: 10,
        }}>
        <TouchableOpacity
          onPress={onPress}
          disabled={loading}
          style={{
            backgroundColor: '#fff',
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 30,
            flexDirection: 'row',
            alignItems: 'center',
            opacity: loading ? 0.6 : 1,
            borderWidth: WIDTH_SIZES['1.5'],
            borderColor: '#1e1e1e',
          }}>
          {loading ? (
            <ActivityIndicator color="#1e1e1e" />
          ) : (
            <View style={{flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 3}}>
              <Text style={{color: '#1e1e1e', fontFamily: 'Rubik-SemiBold', fontSize: FONT_SIZES['10']}}>Load More</Text>
              <DIcon provider={'Entypo'} name={'chevron-small-down'} />
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  const handleSheetChanges = useCallback(index => {
    if (index === -1) {
      setCommentLoader(false);
      setCurrentPage(2);
      setShowLoadMoreButton(true);
      dispatch(setTotalPages({totalPages: 0}));
      dispatch(toggleCommentBottomSheet({info: {show: -1, focus: false}}));
    }
  }, []);

  const navigation = useNavigation();

  const onBackPress = () => {
    console.log('breadd');
    if (bottomSheetRef.current) {
      setCommentLoader(false);
      setCurrentPage(2);
      setShowLoadMoreButton(true);
      dispatch(setTotalPages({totalPages: 0}));
      bottomSheetRef.current?.close();
      return true;
    }
  };

  console.log(postData);

  useEffect(() => {
    if (inputRef.current) {
      if (shouldBeFocus) {
        inputRef.current.focus();
      } else {
        inputRef.current.blur();
      }
    }
  }, [shouldBeFocus]);

  const handlePresentModalPress = useCallback(() => {
    if (bottomSheetRef.current) {
      bottomSheetRef.current?.present();
    }
  }, []);

  const handleLoadMoreComment = async (id, focus) => {
    setCommentLoader(true);

    console.log(id, 'POSTID');

    const {data, error} = await getAllComments({token, _id: id, page: currentPage});

    console.log('Comments errors', error);

    if (error) {
      console.log(error);
      LoginPageErrors(error.message);
    }

    if (data) {
      dispatch(savePostComments({comments: [...comments, ...data?.data?.comments]}));
      dispatch(setCurrentCommentDetails({data: {id}}));
      setCurrentPage(currentPage + 1);
      setCommentLoader(false);
    }
  };

  const handleCommentLoadMore = () => {
    console.log('clicked', currentPage, totalPages);

    if (currentPage <= totalPages) {
      setShowLoadMoreButton(true);
      handleLoadMoreComment(postData?.id, false);
    } else {
      setCommentLoader(false);
      setShowLoadMoreButton(false);
    }
  };

  useEffect(() => {
    console.log('[BS_DEBUG][Comment] Visibility effect, visibility =', commentBottomSheetVisibility);
    if (commentBottomSheetVisibility === 1) {
      console.log('[BS_DEBUG][Comment] Presenting modal');
      bottomSheetRef.current?.present();
      
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => {
        subscription.remove();
      };
    } else if (commentBottomSheetVisibility === -1) {
      console.log('[BS_DEBUG][Comment] Closing modal');
      bottomSheetRef.current?.close();
    }
  }, [commentBottomSheetVisibility]);

  const handleDoComment = async () => {
    setDoCommentLoader(true);

    const {data, error} = await doComment({
      token,
      data: {
        postId: postData?.id,
        text,
      },
    });

    console.log('DOOOOOOOOOOOOOOOOOO Comment', data?.statusCode);

    if (data?.statusCode === 200) {
      console.log('commenting');

      dispatch(pushComment({comment: data?.data[0]}));

      console.log('commednting2');

      if (fromPage === 'myProfilePost') {
        dispatch(myProfileIncrementCommentCount({postId: postData?.id}));
      } else if (fromPage === 'otherProfile') {
        dispatch(otherProfileIncrementCommentCount({postId: postData?.id}));
      } else {
        dispatch(incrementCommentCount({postId: postData?.id}));
      }

      setText('');
    }

    if (error) {
      console.log(error);
      if (error?.data?.status_code === 400) {
        LoginPageErrors(error?.data?.message);
        return;
      }
    }

    setDoCommentLoader(false);
  };

  const token = useSelector(state => state.auth.user.token);

  const currentUserInfo = useSelector(state => state.auth.user);

  const gotomyprofile = useCallback(() => {
    bottomSheetRef.current.close();

    setTimeout(() => {
      navigation.navigate('profile');
    }, 500);
  }, []);

  const NoComments = () => {
    return (
      <View style={{alignSelf: 'center'}}>
        <Text style={{fontFamily: 'Rubik-Medium', fontSize: 18, color: '#6d6d6d'}}>Be the first to comment!</Text>
      </View>
    );
  };

  const EachComments = useCallback(
    ({item}) => {
      const goToProfile = () => {
        bottomSheetRef.current.close();

        if (item?._id === currentUserInfo?.currentUserId) {
          setTimeout(() => {
            navigation.navigate('profile');
          }, 500);
        } else {
          setTimeout(() => {
            navigation.navigate('othersProfile', {
              userName: item?.displayName,
              userId: item?._id,
            });
          }, 500);
        }
      };

      return (
        <View style={styles.eachCommentContainer}>
          <View style={[styles.headerLeftContentContainer, {alignItems: 'flex-start'}]}>
            <TouchableOpacity style={[styles.profileImageContainer]} onPress={goToProfile}>
              <Image placeholder={require('../../../Assets/Images/DefaultProfile.jpg')} source={item?.profile_image?.url ? {uri: item?.profile_image?.url} : require('../../../Assets/Images/DefaultProfile.jpg')} resizeMethod="resize" style={[styles.profileImage]} />
            </TouchableOpacity>

            <View style={{flexDirection: 'column', justifyContent: 'center', width: '100%', paddingRight: 24}}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: responsiveWidth(2),
                  paddingRight: 34,
                }}>
                <Text
                  style={{
                    fontFamily: 'Rubik-SemiBold',
                    color: '#1e1e1e',
                    fontSize: responsiveFontSize(1.5),
                  }}>
                  {item?.displayName}
                </Text>

                <Moment style={styles.timiming} element={Text} fromNow>
                  {item?.createdAt}
                </Moment>
              </View>

              <Text
                style={{
                  color: '#1e1e1e',
                  fontFamily: 'Rubik-Regular',
                  fontSize: responsiveFontSize(1.75),
                  width: responsiveWidth(80),
                }}
                numberOfLines={10}>
                {item?.text}
              </Text>
            </View>
          </View>
        </View>
      );
    },
    [currentUserInfo],
  );

  //Get Total Followers and subscribers

  const renderBackdrop = useCallback(props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={1} />, []);

  console.log('[BS_DEBUG][Comment] Rendering BottomSheetModal JSX (persistent)');

  return (
    <SafeAreaView>
      <BottomSheetModal
        keyboardBlurBehavior="restore"
        name="duck"
        backdropComponent={renderBackdrop}
        ref={bottomSheetRef}
        index={commentBottomSheetVisibility === 1 ? 0 : -1}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={true}
        enableDynamicSizing={false}
        backgroundStyle={{backgroundColor: '#fff'}}
        android_keyboardInputMode="adjustResize"
        keyboardBehavior="interactive"
        containerStyle={{borderTopLeftRadius: 20}}
        style={{borderRadius: 20, overflow: 'hidden'}}
        handleIndicatorStyle={{display: 'none'}}>
        <View style={styles.contentContainer}>
          <Text
            style={{
              textAlign: 'center',
              fontFamily: 'Rubik-Medium',
              color: '#1e1e1e',
              fontSize: responsiveFontSize(2),
              marginBottom: 20,
              marginTop: 5,
            }}>
            Comments
          </Text>

          {showCommentsShimmer ? (
            <CommentShimmer />
          ) : (
            <>
              <FlatList
                contentContainerStyle={{paddingBottom: showLoadMoreButton ? 100 : 35}}
                ItemSeparatorComponent={() => <View style={{height: responsiveWidth(3), marginVertical: 8}} />}
                style={{
                  height: '90%',
                  paddingTop: responsiveWidth(4),
                  borderTopWidth: 1.5,
                  borderColor: '#e9e9e9',
                  paddingLeft: responsiveWidth(2),
                  borderWidth: 1,
                  paddingBottom: 50,
                }}
                data={comments}
                renderItem={({item, index}) => <EachComments item={item} loggedInUser={loggedInUser} />}
                ListEmptyComponent={() => <NoComments />}
              />

              {currentPage <= totalPages && <LoadMoreButton loading={commentLoader} onPress={handleCommentLoadMore} />}
            </>
          )}
        </View>

        <View style={{height: 1.5, backgroundColor: '#E9E9E9'}} />

        <View style={styles.bottomCommentBoxContainer}>
          <View style={styles.headerLeftContentContainer}>
            <TouchableOpacity style={[styles.profileImageContainer, {height: 25, width: 25, borderWidth: 1.5}]} onPress={() => gotomyprofile()}>
              <Image source={{uri: loggedInUser?.currentUserProfilePicture}} resizeMethod="resize" style={[styles.profileImage]} />
            </TouchableOpacity>

            <View style={styles.headerInformation}>
              {Platform.OS === 'ios' ? (
                <BottomSheetTextInput
                  ref={inputRef}
                  value={text}
                  placeholderTextColor={'#4D4D4D'}
                  onChangeText={t => setText(t)}
                  style={[{width: responsiveWidth(68), fontFamily: 'Rubik-Regular'}, Platform.OS === 'ios' ? {height: responsiveWidth(8), fontSize: responsiveFontSize(1.5)} : {}]}
                  placeholder="Add a Comment..."
                  selectionHandleColor={'#ffa86b'}
                  cursorColor={'#1e1e1e'}
                />
              ) : (
                <TextInput autoCapitalize="sentences" ref={inputRef} value={text} onChangeText={t => setText(t)} style={styles.textInput} placeholder="Add a Comment..." selectionHandleColor={'#ffa86b'} selectionColor={selectionTwin()} cursorColor={'#1e1e1e'} />
              )}

              {doCommentLoader ? <ActivityIndicator size="small" color={'#1e1e1e'} style={{marginLeft: 6}} /> : <DIcon provider={'Octicons'} name={'paper-airplane'} style={{marginLeft: 6}} onPress={handleDoComment} />}
            </View>
          </View>
        </View>
      </BottomSheetModal>
    </SafeAreaView>
  );
};

export default CreateCommentBottomSheet;

const styles = StyleSheet.create({
  contentContainer: {
    backgroundColor: '#fff',
    height: '100%',
    flex: 2,
  },
  headerLeftWrapper: {
    height: responsiveWidth(12),
    justifyContent: 'center',
    // borderWidth : 1,
    flexBasis: '50%',
  },

  headerLeftContentContainer: {
    // borderColor: 'blue',
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(4),
    // borderWidth: 1,

    paddingHorizontal: responsiveWidth(2),
  },
  profileImageContainer: {
    borderColor: '#1e1e1e',
    height: responsiveWidth(10),
    width: responsiveWidth(10),
    borderRadius: responsiveWidth(10),
    overflow: 'hidden',
    borderWidth: 1.8,
    borderRadius: responsiveWidth(10),
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    resizeMode: 'cover',
    height: '100%',
  },
  userName: {
    fontFamily: 'Rubik-SemiBold',
    color: '#1e1e1e',
    fontSize: responsiveFontSize(1.5),
  },
  status: {
    fontSize: responsiveFontSize(1.6),
    letterSpacing: 0.5,
    color: '#1e1e1e',
    fontFamily: 'Rubik-Regular',
  },
  cardHeaderWrapper: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    paddingVertical: responsiveWidth(3),
    paddingHorizontal: responsiveWidth(4),
    borderRadius: responsiveWidth(2),
  },
  likeCommentText: {
    fontFamily: 'Rubik-Medium',
    marginLeft: responsiveWidth(1),
    color: '#1e1e1e',
  },
  eachSortByModalListText: {
    fontSize: responsiveFontSize(2),
    color: '#1e1e1e',

    fontFamily: 'Rubik-Bold',
  },
  eachSortModalList: {
    flexDirection: 'row',
    gap: responsiveWidth(5),
    alignItems: 'center',
    marginVertical: responsiveWidth(3),
  },
  bottomCommentBoxContainer: {
    padding: 24,
    height: responsiveWidth(14),
    flexDirection: 'column',
    justifyContent: 'center',
    gap: responsiveWidth(4),
    marginBottom: responsiveWidth(4),
    width: '100%',
    // backgroundColor : 'red'
  },
  emojiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignSelf: 'center',
    width: responsiveWidth(95),
  },
  headerInformation: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  timiming: {
    fontSize: responsiveFontSize(1.75),
    color: '#7e7e7e',
    fontFamily: 'Rubik-Regular',
  },

  textInput: {
    height: '100%',
    width: responsiveWidth(70),
    fontFamily: 'Rubik-Regular',
    backgroundColor: '#fff',
    fontSize: 14,
    color: '#1e1e1e',
  },
});
