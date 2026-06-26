import {StyleSheet, View, TouchableOpacity, Text, Pressable, BackHandler, Button, Platform, ActivityIndicator} from 'react-native';
import React, {useMemo, useCallback, useRef, useState, useEffect} from 'react';
import {responsiveWidth, responsiveFontSize} from 'react-native-responsive-dimensions';
import {BottomSheetBackdrop, BottomSheetModal, BottomSheetTextInput} from '@gorhom/bottom-sheet';
import DIcon from '../../../DesiginData/DIcons';
import {FlatList} from 'react-native-gesture-handler';
import {useDispatch, useSelector} from 'react-redux';
import {toggleCommentBottomSheet} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {useFocusEffect} from '@react-navigation/native';
import { navigate } from '../../../Navigation/RootNavigation';
import {useDoCommentMutation, useLazyGetAllCommentsQuery} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import moment from 'moment';
import Moment from 'react-moment';
import {LoginPageErrors} from '../ErrorSnacks';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {deletePostComments, pushComment, savePostComments, setCurrentCommentDetails, setTotalPages} from '../../../Redux/Slices/NormalSlices/CurrentCommentSlice';
import CommentShimmer from '../Shimmers/CommentShimmer';
import {Image} from 'expo-image';
import {FONT_SIZES, selectionTwin, WIDTH_SIZES} from '../../../DesiginData/Utility';
import {incrementCommentCount} from '../../../Redux/Slices/NormalSlices/Home/FeedCacheSlice';
import {myProfileIncrementCommentCount} from '../../../Redux/Slices/NormalSlices/Posts/MyProfileFeedCacheSlice';
import {otherProfileIncrementCommentCount} from '../../../Redux/Slices/NormalSlices/Posts/ProfileFeedCacheSlice';
import useKeyboardHook from '../../CustomHooks/useKeyboardHook';

const ItemSeparator = () => <View style={{height: responsiveWidth(6)}} />;

const CreateCommentBottomSheet = () => {

  const bottomSheetRef = useRef(null);

  const inputRef = useRef(null);

  const insets = useSafeAreaInsets();
  const {isKeyboardVisible, keyboardHeight} = useKeyboardHook();



  const {show: commentBottomSheetVisibility, focus: shouldBeFocus, fromPage} = useSelector(state => state.hideShow.visibility.commentBottomSheet);

  const loggedInUser = useSelector(state => state.auth.user);

  const {data: postData, comments, totalPages} = useSelector(state => state.currentComment.content);

  const showCommentsShimmer = useSelector(state => state.hideShow.visibility.loadingComments);
  const token = useSelector(state => state.auth.user.token);

  const textRef = useRef('');
  const [text, setText] = useState('');

  const [doComment] = useDoCommentMutation();

  const dispatch = useDispatch();

  const snapPoints = useMemo(() => ['90%'], []);

  const [getAllComments] = useLazyGetAllCommentsQuery();

  const [commentLoader, setCommentLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(2);
  const [showLoadMoreButton, setShowLoadMoreButton] = useState(true);

  const [doCommentLoader, setDoCommentLoader] = useState(false);

  const handleTextChange = useCallback((t) => {
    textRef.current = t;
    setText(t);
  }, []);

  const handleSheetChanges = useCallback(index => {
    if (index === -1) {
      setCommentLoader(false);
      setCurrentPage(2);
      setShowLoadMoreButton(true);
      dispatch(setTotalPages({totalPages: 0}));
      dispatch(toggleCommentBottomSheet({info: {show: -1, focus: false}}));
      textRef.current = '';
      setText('');
    }
  }, []);


  const onBackPress = () => {
    console.log('breadd');
    if (bottomSheetRef.current) {
      setCommentLoader(false);
      setCurrentPage(2);
      setShowLoadMoreButton(true);
      dispatch(setTotalPages({totalPages: 0}));
      textRef.current = '';
      setText('');
      bottomSheetRef.current?.close();
      return true;
    }
  };



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
      setCommentLoader(false);
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
      requestAnimationFrame(() => {
        bottomSheetRef.current?.present();
      });
      
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => {
        subscription.remove();
      };
    } else if (commentBottomSheetVisibility === -1) {
      console.log('[BS_DEBUG][Comment] Closing modal');
      bottomSheetRef.current?.close();
    }
  }, [commentBottomSheetVisibility]);

  const handleDoComment = useCallback(async () => {
    const currentText = textRef.current;
    if (!currentText?.trim()) return;

    setDoCommentLoader(true);

    const {data, error} = await doComment({
      token,
      data: {
        postId: postData?.id,
        text: currentText,
      },
    });

    if (data?.statusCode === 200) {
      dispatch(pushComment({comment: data?.data[0]}));

      if (fromPage === 'myProfilePost') {
        dispatch(myProfileIncrementCommentCount({postId: postData?.id}));
      } else if (fromPage === 'otherProfile') {
        dispatch(otherProfileIncrementCommentCount({postId: postData?.id}));
      } else {
        dispatch(incrementCommentCount({postId: postData?.id}));
      }

      textRef.current = '';
      setText('');
    }

    if (error) {
      console.log('Comment error:', error);
      if (error?.data?.status_code === 400) {
        LoginPageErrors(error?.data?.message);
        setDoCommentLoader(false);
        return;
      }
    }

    setDoCommentLoader(false);
  }, [token, postData?.id, fromPage]);


  const currentUserInfo = useSelector(state => state.auth.user);

  const gotomyprofile = useCallback(() => {
    bottomSheetRef.current.close();

    setTimeout(() => {
      navigate('profile');
    }, 500);
  }, []);

  const NoComments = useMemo(() => (
    <View style={{alignItems: 'center', marginTop: responsiveWidth(25), paddingHorizontal: 40}}>
      <View style={{backgroundColor: '#1A1A1A', padding: 24, borderRadius: 100, marginBottom: 24, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2}}>
        <DIcon provider={'Feather'} name={'zap'} size={40} color="#FFA86B" />
      </View>
      <Text style={{fontFamily: 'Rubik-Bold', fontSize: 22, color: '#FFFFFF', textAlign: 'center'}}>The spotlight is yours</Text>
      <Text style={{fontFamily: 'Rubik-Regular', fontSize: 14, color: '#9E9E9E', marginTop: 10, textAlign: 'center', lineHeight: 22}}>Don't just watch from the sidelines. Be the first to share your thoughts and stand out to your favorite creator.</Text>
      <TouchableOpacity onPress={() => inputRef.current?.focus()} style={{marginTop: 24, backgroundColor: '#FFA86B', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25}}>
        <Text style={{fontFamily: 'Rubik-Medium', fontSize: 14, color: '#fff'}}>Start the conversation</Text>
      </TouchableOpacity>
    </View>
  ), []);

  const EachComments = useCallback(
    ({item}) => {
      const goToProfile = () => {
        bottomSheetRef.current.close();

        if (item?._id === currentUserInfo?.currentUserId) {
          setTimeout(() => {
            navigate('profile');
          }, 500);
        } else {
          setTimeout(() => {
            navigate('othersProfile', {
              userName: item?.displayName,
              userId: item?._id,
            });
          }, 500);
        }
      };

      return (
        <View style={{paddingHorizontal: 20, paddingVertical: 2}}>
          <View style={{flexDirection: 'row', alignItems: 'flex-start'}}>
            <TouchableOpacity style={[styles.profileImageContainer]} onPress={goToProfile}>
              <Image placeholder={require('../../../Assets/Images/DefaultProfile.jpg')} source={item?.profile_image?.url ? {uri: item?.profile_image?.url} : require('../../../Assets/Images/DefaultProfile.jpg')} resizeMethod="resize" style={[styles.profileImage]} />
            </TouchableOpacity>

            <View style={{flexDirection: 'column', flex: 1, marginLeft: 14, paddingRight: 10}}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                  <Text
                    style={{
                      fontFamily: 'Rubik-Bold',
                      color: '#FFFFFF',
                      fontSize: 14,
                    }}>
                    {item?.displayName}
                  </Text>
                  <Text style={{color: '#555555', fontSize: 14, marginBottom: 2}}>•</Text>
                  <Text style={styles.timiming}>
                    {(() => {
                      if (!item?.createdAt) return '';
                      const now = moment();
                      const created = moment(item.createdAt);
                      const diffInMinutes = now.diff(created, 'minutes');
                      const diffInHours = now.diff(created, 'hours');
                      const diffInDays = now.diff(created, 'days');

                      if (diffInMinutes < 1) return 'now';
                      if (diffInMinutes < 60) return `${diffInMinutes}m`;
                      if (diffInHours < 24) return `${diffInHours}h`;
                      if (diffInDays < 7) return `${diffInDays}d`;
                      return created.format('MMM D');
                    })()}
                  </Text>
                </View>

              <Text
                style={{
                  color: '#E0E0E0',
                  fontFamily: 'Rubik-Regular',
                  fontSize: 14,
                  lineHeight: 20,
                  marginTop: 2,
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



  return (
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
        backgroundStyle={{backgroundColor: '#0D0D0D'}}
        android_keyboardInputMode="adjustResize"
        keyboardBehavior="interactive"
        topInset={insets.top}
        containerStyle={{borderTopLeftRadius: 24, borderTopRightRadius: 24}}
        style={{borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden'}}
        handleIndicatorStyle={{backgroundColor: '#555555', width: 40}}>
        <View style={styles.contentContainer}>
          <View style={{paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1A1A1A'}}>
            <Text
              style={{
                fontFamily: 'Rubik-Bold',
                color: '#FFFFFF',
                fontSize: 18,
              }}>
              Comments
            </Text>
          </View>

          {showCommentsShimmer ? (
            <CommentShimmer />
          ) : (
            <>
              <FlatList
                contentContainerStyle={{paddingBottom: 120}}
                ItemSeparatorComponent={ItemSeparator}
                style={{
                  flex: 1,
                  paddingTop: responsiveWidth(2),
                  borderTopWidth: 1.5,
                  borderColor: '#2A2A2A',
                  paddingLeft: responsiveWidth(2),
                }}
                data={comments}
                renderItem={({item, index}) => <EachComments item={item} loggedInUser={loggedInUser} />}
                ListEmptyComponent={NoComments}
                onEndReached={() => {
                  if (currentPage <= totalPages && !commentLoader) {
                    handleCommentLoadMore();
                  }
                }}
                onEndReachedThreshold={0.3}
              />

              {commentLoader && (
                <View style={{position: 'absolute', bottom: 80, alignSelf: 'center'}}>
                  <ActivityIndicator size="small" color="#FFA86B" />
                </View>
              )}
            </>
          )}
        </View>

        <View style={[styles.bottomCommentBoxContainer, {
          borderTopWidth: 1,
          borderTopColor: '#1A1A1A',
          paddingHorizontal: 20,
          paddingBottom: isKeyboardVisible
            ? (Platform.OS === 'ios' ? 40 : keyboardHeight + 35)
            : (Platform.OS === 'ios' ? 40 : 20),
          alignItems: 'center'
        }]}>
          <TouchableOpacity style={[styles.profileImageContainer, {height: 36, width: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#2A2A2A', marginBottom: 2}]} onPress={() => gotomyprofile()}>
            <Image source={{uri: loggedInUser?.currentUserProfilePicture}} resizeMethod="resize" style={[styles.profileImage, {borderRadius: 18}]} />
          </TouchableOpacity>

          <View style={[styles.headerInformation, {flex: 1, marginLeft: 14, alignItems: 'center'}]}>
            <BottomSheetTextInput
              autoCapitalize="sentences"
              ref={inputRef}
              value={text}
              placeholderTextColor={'#8E8E8E'}
              onChangeText={handleTextChange}
              style={styles.textInputCapsule}
              placeholder="Add a Comment..."
              selectionHandleColor={'#ffa86b'}
              selectionColor={selectionTwin()}
              cursorColor={'#FFA86B'}
            />

            <TouchableOpacity onPress={handleDoComment} disabled={!text.trim() || doCommentLoader} style={{paddingLeft: 10, height: 44, justifyContent: 'center', alignItems: 'center'}}>
              {doCommentLoader ? (
                <ActivityIndicator size="small" color={'#FFA86B'} />
              ) : (
                <DIcon provider={'Feather'} name={'send'} size={24} color={text.trim().length > 0 ? '#FFA86B' : '#555555'} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetModal>
  );
};

export default CreateCommentBottomSheet;

const styles = StyleSheet.create({
  contentContainer: {
    backgroundColor: '#0D0D0D',
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
    borderColor: '#2A2A2A',
    height: 36,
    width: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    resizeMode: 'cover',
    height: '100%',
  },
  userName: {
    fontFamily: 'Rubik-SemiBold',
    color: '#FFFFFF',
    fontSize: responsiveFontSize(1.5),
  },
  status: {
    fontSize: responsiveFontSize(1.6),
    letterSpacing: 0.5,
    color: '#9E9E9E',
    fontFamily: 'Rubik-Regular',
  },
  cardHeaderWrapper: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: responsiveWidth(3),
    paddingHorizontal: responsiveWidth(4),
    borderRadius: responsiveWidth(2),
  },
  likeCommentText: {
    fontFamily: 'Rubik-Medium',
    marginLeft: responsiveWidth(1),
    color: '#FFFFFF',
  },
  eachSortByModalListText: {
    fontSize: responsiveFontSize(2),
    color: '#FFFFFF',

    fontFamily: 'Rubik-Bold',
  },
  eachSortModalList: {
    flexDirection: 'row',
    gap: responsiveWidth(5),
    alignItems: 'center',
    marginVertical: responsiveWidth(3),
  },
  bottomCommentBoxContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
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
    fontSize: 12,
    color: '#8E8E8E',
    fontFamily: 'Rubik-Regular',
  },

  textInputCapsule: {
    flex: 1,
    height: 42,
    fontFamily: 'Rubik-Regular',
    backgroundColor: '#1A1A1A',
    fontSize: 14,
    color: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  textInput: {
    height: '100%',
    width: responsiveWidth(70),
    fontFamily: 'Rubik-Regular',
    backgroundColor: '#0D0D0D',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
