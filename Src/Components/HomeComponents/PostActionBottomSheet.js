import {StyleSheet, View, TouchableOpacity, Text, Pressable, BackHandler, Share, Vibration, TextInput} from 'react-native';
import React, {useMemo, useCallback, useRef, useState, useEffect, memo} from 'react';
import {responsiveWidth, responsiveFontSize} from 'react-native-responsive-dimensions';
import BottomSheet, {BottomSheetBackdrop, BottomSheetFlatList, BottomSheetTextInput, BottomSheetModal} from '@gorhom/bottom-sheet';
import {token as memoizedToken} from '../../../Redux/Slices/NormalSlices/AuthSlice';
import {useDispatch, useSelector} from 'react-redux';
import {togglePostActionBottomSheet} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import DIcon from '../../../DesiginData/DIcons';
import {useFocusEffect, useNavigation, useNavigationState} from '@react-navigation/native';
import {ChatWindowError, LoginPageErrors, chatRoomSuccess} from '../ErrorSnacks';
import PagerView from 'react-native-pager-view';
import {useBlockUserMutation, useDeleteMyPostMutation, usePinUnPinPostMutation, usePostEditMutation, useReportPostMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import share from 'react-native-share';
import LinearGradient from 'react-native-linear-gradient';
import {blockPost, resetFeed} from '../../../Redux/Slices/NormalSlices/Home/FeedCacheSlice';
import {padios, WIDTH_SIZES} from '../../../DesiginData/Utility';
import {deleteMyProfilePost, editMyPostCaption, pinMyProfilePost} from '../../../Redux/Slices/NormalSlices/Posts/MyProfileFeedCacheSlice';
import {Image} from 'expo-image';

const PostActionBottomSheet = () => {
  const attachmentInputRef = React.useRef();

  const screenName = useNavigationState(state => state.routes[state.index].name);
  const navigation = useNavigation();

  console.log(screenName, '::::');

  const bottomSheetModalRef = useRef(null);

  const pagerRef = useRef(null);

  const {postId, show: postActionSheetBottomSheetVisibility, userId, userName, profileImage, postContent} = useSelector(state => state.hideShow.visibility.postActionBottomSheet);

  const {role: currentUserRole, currentUserId} = useSelector(state => state.auth.user);

  const dispatch = useDispatch();

  const snapPoints = useMemo(() => ['30%', '31%', '35'], []);

  const [reportPost] = useReportPostMutation();

  const [deleteMyPost] = useDeleteMyPostMutation();

  const [pinUnPinPost] = usePinUnPinPostMutation();

  const [postEdit] = usePostEditMutation();

  const [reportIndex, setReportIndex] = useState(undefined);

  const [reportText, setReportText] = useState('');

  const [customReportText, setCustomReportText] = useState('');

  const [caption, setCaption] = useState('');

  const [count, setCount] = useState(0);

  const [blockUser] = useBlockUserMutation();

  const [buttonClick, setButtonClick] = useState({
    click: false,
    id: 0,
  });

  const handleSaveEditPost = useCallback(async () => {
    const {data, error} = await postEdit({token, data: {postId: postId, postContent: attachmentInputRef.current.value.trim()}});

    console.log(data, error);

    if (error) {
      if (error?.status === 'FETCH_ERROR') {
        LoginPageErrors('Please check your network');
        return;
      }
      LoginPageErrors(error?.data?.message);
    }

    if (data?.data) {
      setCaption('');
      chatRoomSuccess(data?.message);
      dispatch(editMyPostCaption({postId, caption: attachmentInputRef.current.value.trim()}));
      bottomSheetModalRef.current?.close();
    }
  }, [postId, attachmentInputRef.current]);

  const [myProfileAction, setMyProfileAction] = useState([
    {
      id: 5,
      provider: 'Feather',
      iconName: 'edit-3',
      name: 'Edit post',
      color: '#282828',
      imgSrc: require('../../../Assets/Images/PostAction/edit.png'),
    },
    {
      id: 4,
      provider: 'Entypo',
      iconName: 'pin',
      name: 'Pin/Unpin Post',
      color: '#282828',
      imgSrc: require('../../../Assets/Images/PostAction/pin.png'),
    },

    {
      id: 3,
      provider: 'Ionicons',
      iconName: 'trash-bin',
      name: 'Delete',
      color: '#FF6961',
      imgSrc: require('../../../Assets/Images/PostAction/delete.png'),
    },
  ]);

  const [otherProfileAction, setOtherProfileAction] = useState([
    {
      id: 1,
      provider: 'Octicons',
      iconName: 'report',
      name: 'Report',
      color: 'red',
      imgSrc: require('../../../Assets/Images/PostAction/report.png'),
    },
  ]);

  const token = useSelector(state => state.auth.user.token);

  const handleSheetChanges = useCallback(index => {
    console.log(index);
    if (index === -1) {
      dispatch(togglePostActionBottomSheet({info: {show: -1, postId: undefined}}));
    }
  }, []);

  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);

  const onBackPress = () => {
    if (bottomSheetModalRef.current) {
      bottomSheetModalRef.current?.close();
      return true;
    }
  };

  useEffect(() => {
    console.log('[BS_DEBUG][PostAction] Visibility effect, visibility =', postActionSheetBottomSheetVisibility);
    if (postActionSheetBottomSheetVisibility === 1) {
      console.log('[BS_DEBUG][PostAction] Presenting modal');
      bottomSheetModalRef.current?.present();

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => {
        subscription.remove();
      };
    } else if (postActionSheetBottomSheetVisibility === -1) {
      console.log('[BS_DEBUG][PostAction] Closing modal');
      setReportIndex(undefined);
      setReportText('');
      setCustomReportText('');
      bottomSheetModalRef.current?.close();
    }
  }, [postActionSheetBottomSheetVisibility]);

  const renderBackdrop = useCallback(props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={1} />, []);

  const handleSubmitReport = useCallback(async () => {
    const {data, error} = await reportPost({
      token,
      data: {
        postId,
        // reason: reportText === '' ? customReportText : reportText,
      },
    });

    if (error) {
      if (error?.data?.status_code === 400) {
        LoginPageErrors('Only one comment allowed');
        return;
      } else {
        LoginPageErrors(error?.data?.message);
      }
    }

    if (data) {
      chatRoomSuccess('Post blocked!');
      dispatch(blockPost({postId}));
      pagerRef.current?.setPage(3);
    }
  }, [token, postId]);

  const handlePostActionHandler = async index => {
    if (index === 2) {
      // pagerRef.current?.setPage(1);

      console.log('helloo');
    }

    if (index === 1) {
      handleSubmitReport();
      bottomSheetModalRef.current?.close();
    }

    if (index === 3) {
      const {data, error} = await deleteMyPost({token, postId: postId});

      if (error) {
        if (error?.status === 'FETCH_ERROR') {
          LoginPageErrors('Please check your network');
          return;
        }
        LoginPageErrors(error?.data?.message);
        console.log('fuck me offf');
      }

      if (data?.data) {
        LoginPageErrors('Post Deleted!');
        dispatch(deleteMyProfilePost({postId}));
        bottomSheetModalRef.current?.close();
      }
    }

    if (index === 4) {
      const {data, error} = await pinUnPinPost({token, data: {postId: postId}});

      console.log(data, error);

      if (error) {
        if (error?.status === 'FETCH_ERROR') {
          LoginPageErrors('Please check your network');
          return;
        }
        LoginPageErrors(error?.data?.message);
      }

      if (data?.data) {
        chatRoomSuccess(data?.message);
        dispatch(pinMyProfilePost({postId}));
        bottomSheetModalRef.current?.close();
      }
    }

    if (index === 5) {
      console.log('Navigate to EditPostScreen');
      bottomSheetModalRef.current?.close();
      setTimeout(() => {
        navigation.navigate('editPostScreen', {postId, postContent});
      }, 650);
    }

    if (index === 7) {
      let {data, error} = await blockUser({token, data: {id: userId}});

      console.log(error, data);

      if (data) {
        dispatch(blockPost({postId}));
        chatRoomSuccess('We have blocked the user for you!');
        if (bottomSheetModalRef.current) {
          bottomSheetModalRef.current.close();
        }
      }
    }

    if (index === 18) {
      handleSaveEditPost();
    }
  };

  const handleSelectReport = (index, text) => {
    setReportIndex(index);
    setReportText(text);
  };

  // useEffect removed - logic moved to combined visibility effect

  console.log('[BS_DEBUG][PostAction] Rendering BottomSheetModal JSX (persistent)');

  return (
    <BottomSheetModal
      keyboardBlurBehavior="restore"
      keyboardBehavior="interactive"
      name="fuckYou"
      backdropComponent={renderBackdrop}
      ref={bottomSheetModalRef}
      index={postActionSheetBottomSheetVisibility === 1 ? 0 : -1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      enableDynamicSizing={false}
      handleIndicatorStyle={{
        backgroundColor: '#D9D9D9',
      }}
      backgroundStyle={{backgroundColor: '#fff'}}>
      <PagerView scrollEnabled={false} ref={pagerRef} style={{height: '100%'}} initialPage={0}>
        <View style={styles.contentContainer} key="1">
          <BottomSheetFlatList
            data={currentUserId !== userId ? otherProfileAction : myProfileAction}
            renderItem={({item, index}) => {
              return (
                <Pressable
                  onPress={() => handlePostActionHandler(item.id)}
                  onPressIn={() => setButtonClick({click: true, id: index})}
                  onPressOut={() => setButtonClick({click: false, id: 0})}
                  style={[{paddingVertical: 8}, buttonClick.id === index && buttonClick.click && styles.touchFeedBack]}>
                  <View style={[styles.eachSortModalList, {marginVertical: responsiveWidth(3)}]}>
                    {/* <DIcon name={item.iconName} provider={item.provider} size={responsiveWidth(6)} color={item.color} /> */}

                    <View style={styles.verifyContainer}>
                      <Image cachePolicy="memory-disk" source={item.imgSrc} contentFit="contain" style={{flex: 1}} />
                    </View>

                    <Text style={[styles.eachSortByModalListText, item.id === 1 && {color: '#FF2020'}]}>{item.name}</Text>
                  </View>
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => <View style={{borderBottomWidth: WIDTH_SIZES['1.5'], borderBottomColor: '#EAEAEA'}} />}
            style={{marginTop: responsiveWidth(3)}}
          />
        </View>

        <View key="3" style={styles.contentContainer}>
          <Text style={{textAlign: 'center', fontFamily: 'Rubik-Medium', alignSelf: 'center', width: '50%'}}>Edit post description</Text>
          <View style={{width: '25%'}} />

          <View style={styles.textInputContainer}>
            <TextInput returnKeyType="done" ref={attachmentInputRef} style={styles.textInputStyle} maxLength={500} placeholder="Write, what's in your mind!" multiline onChangeText={t => (attachmentInputRef.current.value = t)} />
            <Text style={styles.charCount}>{`${count}/500`}</Text>
          </View>

          <Text style={{textAlign: 'center', marginTop: responsiveWidth(4), fontFamily: 'Rubik-Bold', color: '#ffa07a'}} onPress={() => handleSaveEditPost()}>
            SAVE EDIT
          </Text>
        </View>

        <View key="4" style={styles.contentContainer}>
          {currentUserRole !== 'creator' && (
            <>
              <View style={styles.profilePictureContainer}>
                <Image source={profileImage ? {uri: profileImage} : require('../../../Assets/Images/DefaultProfile.jpg')} style={styles.profilePicture} resizeMethod="resize" resizeMode="contain" />
              </View>

              <Text style={[styles.title, {marginTop: responsiveWidth(4), fontSize: responsiveFontSize(2.2)}]}>{userName}</Text>

              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: responsiveWidth(16)}}>
                <Pressable onPress={() => handlePostActionHandler(7)}>
                  <Text style={[styles.loginButton, {backgroundColor: '#FC766A'}]}>BLOCK</Text>
                </Pressable>

                <Pressable onPress={() => bottomSheetModalRef.current?.close()}>
                  <Text style={styles.loginButton}>CANCEL</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </PagerView>
    </BottomSheetModal>
  );
};

export default PostActionBottomSheet;

const styles = StyleSheet.create({
  contentContainer: {
    backgroundColor: '#fff',
    height: responsiveWidth(90),
    // paddingHorizontal: responsiveWidth(8),
    // paddingLeft: responsiveWidth(9.5),
  },

  createPostListContainer: {
    paddingVertical: responsiveWidth(6),
    padding: responsiveWidth(2),
    flexDirection: 'column',
    gap: responsiveWidth(5),
  },

  eachlist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(4),
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
    height: responsiveWidth(9),
    width: responsiveWidth(9),
    borderRadius: responsiveWidth(10),
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: responsiveWidth(10),
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    resizeMode: 'cover',
    height: '100%',
  },
  userName: {
    fontFamily: 'Lexend-Bold',
    color: '#282828',
    fontSize: responsiveFontSize(1.9),
  },
  status: {
    fontSize: responsiveFontSize(1.6),
    letterSpacing: 0.5,
    color: '#282828',
    fontFamily: 'Rubik-Regular',
  },
  cardHeaderWrapper: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#282828',
    paddingVertical: responsiveWidth(3),
    paddingHorizontal: responsiveWidth(4),
    borderRadius: responsiveWidth(2),
  },
  likeCommentText: {
    fontFamily: 'Rubik-Medium',
    marginLeft: responsiveWidth(1),
    color: '#282828',
  },
  eachSortByModalListText: {
    fontSize: 16,
    color: '#282828',
    fontFamily: 'Rubik-Medium',
  },
  eachSortModalList: {
    flexDirection: 'row',
    gap: responsiveWidth(6),
    alignItems: 'center',
    marginVertical: responsiveWidth(2),
    marginHorizontal: 24,
  },

  textInputContainer: {
    borderWidth: 2,
    marginTop: responsiveWidth(4),
    padding: responsiveWidth(2),
    backgroundColor: '#fff',
    borderRadius: responsiveWidth(2),
  },
  textInputStyle: {
    backgroundColor: '#fff',
    width: '100%',
    paddingLeft: responsiveWidth(2),
    fontFamily: 'Rubik-Regular',
    borderColor: 'red',
    height: responsiveWidth(20),
    textAlignVertical: 'top',
  },

  charCount: {
    fontFamily: 'Lexend',
    fontSize: responsiveFontSize(1.5),
    textAlign: 'right',
  },
  profilePictureContainer: {
    borderWidth: 1,
    height: responsiveWidth(24),
    width: responsiveWidth(24),
    borderRadius: responsiveWidth(20),
    resizeMode: 'contain',
    overflow: 'hidden',
    alignSelf: 'center',
    marginTop: responsiveWidth(8),
  },
  title: {
    fontFamily: 'Rubik-Medium',
    color: '#282828',
    fontSize: responsiveFontSize(2),
    textAlign: 'center',
  },
  loginButton: {
    paddingHorizontal: responsiveWidth(2),
    backgroundColor: '#ffa07a',
    borderRadius: responsiveWidth(2),
    color: '#282828',
    textAlign: 'center',
    fontFamily: 'Rubik-Bold',
    elevation: 1,
    fontWeight: '600',
    width: responsiveWidth(32),
    height: responsiveWidth(10),
    textAlignVertical: 'center',
    alignSelf: 'center',
    borderTopColor: '#282828',
    borderLeftColor: '#282828',
    elevation: 1,
    fontSize: responsiveFontSize(2.4),
    padding: padios(responsiveWidth(2.6)),
    overflow: 'hidden',
    marginTop: responsiveWidth(1),
  },
  profilePicture: {
    width: '100%',
    height: '100%',
  },
  verifyContainer: {
    width: 24,
    height: 24,
  },

  touchFeedBack: {
    backgroundColor: '#FFA86B33',
    borderWidth: 2,
    borderColor: '#FFA86B',
  },
});
