import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Image,
  Pressable,
  BackHandler,
  Vibration,
  Platform,
} from 'react-native';
import React, {useMemo, useCallback, useRef, useState, useEffect} from 'react';
import {
  responsiveWidth,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
} from '@gorhom/bottom-sheet';
import {FlatList} from 'react-native-gesture-handler';
import {
  homeBottomSheetList,
  homeBottomSheetListRoleUser,
} from '../../../DesiginData/Data';
import {useDispatch, useSelector} from 'react-redux';
import {
  setPostsCardType,
  toggleHideShowInformationModal,
  toggleHomeBottomSheet,
} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {token as memoizedToken} from '../../../Redux/Slices/NormalSlices/AuthSlice';
import {
  getSupportRoomId,
  useDeleteScheduledPostMutation,
  useLazyGetFSDQuery,
  useLazyGetFSQuery,
  useLazyGetScheduledPostsQuery,
  useLazyGetSupportRoomIdQuery,
  useLazyLogoutFromServerQuery,
} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import PagerView from 'react-native-pager-view';
import {autoLogout, logoutExplicit} from '../../../AutoLogout';
import AddSvg from '../../../AddSvg';
import Purchases from 'react-native-purchases';
import {navigate} from '../../../Navigation/RootNavigation';

const HomeBottomSheet = ({currentUserDetails}) => {
  const bottomSheetRef = useRef(null);

  const pagerViewRef = useRef(null);

  const [followers, setFollowers] = useState(0);

  const [subscribers, setSubscribers] = useState(0);

  const homeBottomSheetVisibility = useSelector(
    state => state.hideShow.visibility.homeBottomSheet,
  );

  const [logoutFromServer] = useLazyLogoutFromServerQuery();

  const dispatch = useDispatch();

  const snapPoints = useMemo(() => ['25%', '60%', '60%'], []);

  const handleSheetChanges = useCallback(index => {
    if (index === -1) {
      dispatch(toggleHomeBottomSheet({show: -1}));
      resetSheet();
    }
  }, []);

  const navigation = useNavigation();

  const onBackPress = () => {
    if (bottomSheetRef !== null) {
      bottomSheetRef.current?.close();

      return true;
    }
  };

  const [getSupportRoomId] = useLazyGetSupportRoomIdQuery();

  const handlePresentModalPress = useCallback(() => {
    if (bottomSheetRef.current) {
      bottomSheetRef.current?.present();
    }
  }, []);

  useEffect(() => {
    if (!bottomSheetRef.current) return;

    if (homeBottomSheetVisibility === -1) {
      bottomSheetRef.current.close();
      console.log('Closing');
      resetSheet();
      return;
    }

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    return () => backHandler.remove();
  }, [homeBottomSheetVisibility]);

  useEffect(() => {
    if (homeBottomSheetVisibility === 1) {
      handlePresentModalPress();
    }
  }, [homeBottomSheetVisibility]);

  const token = useSelector(state => state.auth.user.token);

  const loggedInUserRole = useSelector(state => state.auth.user.role);

  const handleEachOptions = useCallback(async id => {
    console.log('Home Bottom Sheet', id);

    if (id === 7) {
      // const {data, error} = await logoutFromServer({token});

      // if (Platform.OS === 'ios') {
      //   let isAnonymous = await Purchases.isAnonymous();

      //   if (!isAnonymous) {
      //     Purchases.logOut().then(e => {
      //       console.log('Loggging out payments methiod');

      //       Purchases.getCustomerInfo().then(customerInfo => {
      //         console.log(customerInfo); // This will show the new customer info with the new random user ID
      //         logoutExplicit();
      //       });
      //     });
      //   }
      // } else {
      //   logoutExplicit();
      // }

      const {data, error} = await logoutFromServer({token});

      if (error) {
        console.log('Logout API error:', error);
        autoLogout();
        return LoginPageErrors('Logout failed. Please try again.');
      }

      if (data?.statusCode === 200) {
        if (Platform.OS === 'ios') {
          try {
            const isAnonymous = await Purchases.isAnonymous();

            if (!isAnonymous) {
              console.log('Logging out from RevenueCat...');
              await Purchases.logOut();

              const customerInfo = await Purchases.getCustomerInfo();
              console.log('Customer info after logout:', customerInfo);
            } else {
              console.log('RevenueCat user is anonymous — skipping logout.');
            }
          } catch (err) {
            console.warn('RevenueCat logout failed:', err);
          }
        }

        // Always logout explicitly at the end (both Android + iOS)
        logoutExplicit();
      }
    } else if (id === 6) {
      bottomSheetRef.current.close();

      setTimeout(() => {
        navigation.navigate('About');
      }, 500);
      s;
    } else if (id === 1) {
      console.log('Settings page');

      bottomSheetRef.current.close();

      setTimeout(() => {
        navigation.navigate('settingsPage');
      }, 500);
    } else if (id === 8) {
      bottomSheetRef.current.close();

      setTimeout(() => {
        navigation.navigate('settingsPage');
      }, 500);
    } else if (id === 10) {
      bottomSheetRef.current.close();
      setTimeout(() => {
        navigation.navigate('verificationStepOne');
      }, 500);
    } else if (id === 5) {
      bottomSheetRef.current.close();
      setTimeout(() => {
        navigation.navigate('referral');
      }, 500);
    } else if (id === 3) {
      bottomSheetRef.current.close();
      setTimeout(() => {
        navigation.navigate('mrDashboard');
      }, 500);
    } else if (id === 2) {
      // pagerViewRef.current.setPage(1);
      bottomSheetRef.current.close();
      setTimeout(() => {
        navigate('scheduled');
      }, 500);
    } else if (id === 9) {
      bottomSheetRef.current.close();
      setTimeout(() => {
        navigation.navigate('chooseWallet');
      }, 500);
    } else if (id === 11) {
      bottomSheetRef.current.close();

      setTimeout(() => {
        navigation.navigate('userInfoForm');
      }, 500);
    }
  }, []);

  //Get Total Followers and subscribers

  const [getFSD] = useLazyGetFSDQuery();
  const [getFS] = useLazyGetFSQuery();

  useEffect(() => {
    const getFollowers = async () => {
      const subs = await getFS({token, listType: 'followers', active: true});

      setFollowers(subs?.data?.data?.metadata[0]?.total);
    };

    const getSubscribers = async () => {
      const subs = await getFS({token, listType: 'subscribers', active: true});

      setSubscribers(subs?.data?.data?.metadata[0]?.total);
    };

    const getFollowed = async () => {
      const subs = await getFSD({token, listType: 'followed', active: true});

      setFollowers(subs?.data?.data?.metadata[0]?.total);
    };

    const getSubscribed = async () => {
      const subs = await getFSD({token, listType: 'subscribed', active: true});

      setSubscribers(subs?.data?.data?.metadata[0]?.total);
    };

    if (loggedInUserRole === 'user') {
      getFollowed();
      getSubscribed();
    } else {
      getFollowers();
      getSubscribers();
    }
  }, [token, loggedInUserRole]);

  const renderBackdrop = useCallback(
    props => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={1}
      />
    ),
    [],
  );

  function resetSheet() {
    if (pagerViewRef.current) {
      pagerViewRef.current.setPage(0);
    }
  }

  const handleGoToSubFol = a => {
    bottomSheetRef.current.close();

    if (a === 'sub') {
      setTimeout(() => {
        navigation.navigate('fsPage', {
          title: loggedInUserRole === 'user' ? 'Subscribed' : 'Subscribers',
          token,
          role: loggedInUserRole,
          count: subscribers ? subscribers : 0,
        });
      }, 500);
    }

    if (a === 'fol') {
      setTimeout(() => {
        navigation.navigate('fsPage', {
          title: loggedInUserRole === 'user' ? 'Followed' : 'Followers',
          token,
          role: loggedInUserRole,
          count: followers ? followers : 0,
        });
      }, 500);
    }

    if (a === 'profile') {
      setTimeout(() => {
        navigation.navigate('profile');
      }, 500);
    }
  };

  if (homeBottomSheetVisibility === 1) {
    return (
      <BottomSheetModal
        name="HOmeBottom"
        backdropComponent={renderBackdrop}
        ref={bottomSheetRef}
        index={homeBottomSheetVisibility}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={true}
        backgroundStyle={{backgroundColor: '#fffef9'}}>
        <PagerView ref={pagerViewRef} style={{height: '100%', width: '100%'}}>
          <View style={styles.contentContainer} key="1">
            <View>
              <FlatList
                data={
                  loggedInUserRole === 'creator'
                    ? homeBottomSheetList
                    : homeBottomSheetListRoleUser
                }
                renderItem={({item, index}) => (
                  <Pressable
                    onPress={() => handleEachOptions(item.id)}
                    style={({pressed}) => [
                      styles.eachSortModalList,
                      pressed && {backgroundColor: '#FFF3EB'},
                    ]}>
                    <AddSvg name={item.iconName} />
                    <Text style={styles.eachSortByModalListText}>
                      {item.name}
                    </Text>
                  </Pressable>
                )}
                style={{marginTop: responsiveWidth(3)}}
                ItemSeparatorComponent={() => (
                  <View
                    style={{
                      borderWidth: responsiveWidth(0.3),
                      borderColor: '#EEEEEE',
                    }}></View>
                )}
              />
            </View>
          </View>
        </PagerView>
      </BottomSheetModal>
    );
  }
};

export default HomeBottomSheet;

const styles = StyleSheet.create({
  contentContainer: {
    // backgroundColor: "red",
    height: '100%',
    // paddingHorizontal: responsiveWidth(4),
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
    // borderWidth: 1,
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
    fontFamily: 'MabryPro-Regular',
  },
  cardHeaderWrapper: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    // borderWidth: 1,
    borderColor: '#282828',
    paddingVertical: responsiveWidth(3),
    paddingHorizontal: responsiveWidth(4),
    borderRadius: responsiveWidth(2),
  },
  likeCommentText: {
    fontFamily: 'MabryPro-Medium',
    marginLeft: responsiveWidth(1),
    color: '#282828',
  },
  eachSortByModalListText: {
    fontSize: responsiveFontSize(2.17),
    color: '#282828',

    fontFamily: 'MabryPro-Bold',
  },
  eachSortModalList: {
    flexDirection: 'row',
    gap: responsiveWidth(5),
    alignItems: 'center',
    paddingVertical: responsiveWidth(4),
    paddingLeft: responsiveWidth(7),
    // backgroundColor : 'red'
  },

  contentWrapper: {
    // borderWidth: 2,
    padding: responsiveWidth(2),
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderRadius: responsiveWidth(2),
  },

  contentImageWrapper: {
    height: responsiveWidth(20),
    width: responsiveWidth(20),
    // borderWidth: 1,
    borderRadius: responsiveWidth(2),
    resizeMode: 'cover',
    overflow: 'hidden',
  },

  sCDetailWrapper: {
    // borderWidth: 1,

    padding: 1,
  },
  timiming: {
    fontSize: responsiveFontSize(1.6),
    paddingLeft: responsiveWidth(2),
    paddingTop: responsiveWidth(0.8),
    color: '#282828',
    paddingVertical: responsiveWidth(2),
    fontFamily: 'MabryPro-Medium',
    marginTop: responsiveWidth(2),
  },
});
