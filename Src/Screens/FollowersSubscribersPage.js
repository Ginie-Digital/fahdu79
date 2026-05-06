import { StyleSheet, Text, View, TouchableOpacity, FlatList, Pressable, Platform, ActivityIndicator } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { responsiveFontSize, responsiveWidth } from 'react-native-responsive-dimensions';
import { useLazyGetFSDQuery, useLazyGetFSQuery, useLazyIsValidFollowQuery, useLazyGetFollowingQuery, useLazyGetCashfreeSubscriptionQuery } from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import LinearGradient from 'react-native-linear-gradient';
import DIcon from '../../DesiginData/DIcons';
import { Image } from 'expo-image';
import { navigate } from '../../Navigation/RootNavigation';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FONT_SIZES, WIDTH_SIZES } from '../../DesiginData/Utility';
import FollowersShimmer from '../Components/Shimmers/FollowersShimmer';
import UnSubscribeModal from '../Components/MyProfile/UnSubscribeModal';

const EachList = ({ item, index, followersLength, handleGoToOthersProfile, isSubscribedList, onUnsubscribe, isFetching }) => {
  console.log(':::::', item?.userDetails?.displayName);

  if (item?.userDetails?.displayName !== undefined) {
    return (
      <View style={styles.listItemContainer}>
        <Pressable style={styles.listItem} onPress={() => handleGoToOthersProfile(item?.userDetails?.displayName, item?.userDetails?._id, item?.userDetails?.role)}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: item?.userDetails?.profile_image?.url }} style={styles.profileImage} placeholderContentFit="contain" placeholder={require('../../Assets/Images/DefaultProfile.jpg')} contentFit="cover" />
          </View>

          <View style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: responsiveWidth(0.8) }}>
              <Text style={styles.name}>{item?.userDetails?.fullName}</Text>
              {item?.userDetails?.role === 'creator' && (
                <View style={styles.verifyContainer}>
                  <Image cachePolicy="memory-disk" source={require('../../Assets/Images/verify.png')} contentFit="contain" style={{ flex: 1 }} />
                </View>
              )}
            </View>
            <Text style={styles.username}>@{item?.userDetails?.displayName}</Text>
          </View>
        </Pressable>

        {isSubscribedList && Platform.OS !== 'ios' && (
          <TouchableOpacity 
            style={[styles.unsubscribeButton, isFetching && { opacity: 0.7 }]} 
            onPress={() => !isFetching && onUnsubscribe(item)}
            disabled={isFetching}
          >
            {isFetching ? (
              <ActivityIndicator size="small" color="#1E1E1E" />
            ) : (
              <Text style={styles.unsubscribeButtonText}>Unsubscribe</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  }
};

const FollowersSubscribersPage = ({ route, navigation }) => {
  const [getFS] = useLazyGetFSQuery();

  const [getFSD] = useLazyGetFSDQuery();

  const [getFollowing] = useLazyGetFollowingQuery();
  const [isValidFollow] = useLazyIsValidFollowQuery();
  const [getCashfreeSub] = useLazyGetCashfreeSubscriptionQuery();

  const [isActive, setIsActive] = useState(true);
  const [loadingId, setLoadingId] = useState(null);

  const [followers, setFollowers] = useState([]);

  const [subscriberss, setSubscribers] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);

  const [totalCount, setTotalCount] = useState(0);

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [hasMore, setHasMore] = useState(true);

  const [isLoading, setIsLoading] = useState(true);

  const [unsubscribeModalVisible, setUnsubscribeModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [refreshList, setRefreshList] = useState(false);

  const handleUnsubscribePress = async (item) => {
    const creatorId = item?.userDetails?._id || item?.creatorId;
    if (!creatorId) return;

    if (Platform.OS === 'android') {
      setLoadingId(creatorId);
      try {
        await getCashfreeSub({ token: route?.params?.token, creatorId }).unwrap();
        setSelectedItem(item);
        setUnsubscribeModalVisible(true);
      } catch (error) {
        console.error('Error prefetching subscription details:', error);
        // Still open modal to show error fallback if needed, or handle differently
        setSelectedItem(item);
        setUnsubscribeModalVisible(true);
      } finally {
        setLoadingId(null);
      }
    } else {
      setSelectedItem(item);
      setUnsubscribeModalVisible(true);
    }
  };

  const handleGoToOthersProfile = useCallback(async (userName, userId, role) => {
    const doFollowing = await isValidFollow({ token: route?.params?.token, userName }, false);
    if (doFollowing) {
      navigation.navigate('othersProfile', { userName, userId, isFollowing: doFollowing?.data?.data?.follow, role });
    }
  }, []);

  const loadMoreData = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const nextPage = currentPage + 1;

    try {
      if (route?.params?.title === 'Following') {
        const result = await getFollowing({ token: route?.params?.token, page: nextPage, limit: 10 });
        const newData = result?.data?.data?.followed || [];

        if (newData.length === 0) {
          setHasMore(false);
        } else {
          setFollowers(prev => [...prev, ...newData]);
          setCurrentPage(nextPage);
        }
      } else if (route?.params?.role === 'user') {
        if (route?.params?.title === 'Followed') {
          const result = await getFSD({ token: route?.params?.token, listType: 'followed', page: nextPage });
          const newData = result?.data?.data?.followed || [];

          if (newData.length === 0) {
            setHasMore(false);
          } else {
            setFollowers(prev => [...prev, ...newData]);
            setCurrentPage(nextPage);
          }
        } else {
          const result = await getFSD({ token: route?.params?.token, listType: 'subscribed', active: isActive, page: nextPage });
          const newData = result?.data?.data?.subscribed || [];

          if (newData.length === 0) {
            setHasMore(false);
          } else {
            setSubscribers(prev => [...prev, ...newData]);
            setCurrentPage(nextPage);
          }
        }
      } else {
        if (route?.params?.title === 'Followers') {
          const result = await getFS({ token: route?.params?.token, listType: 'followers', active: true, page: nextPage });
          const newData = result?.data?.data?.followers || [];

          if (newData.length === 0) {
            setHasMore(false);
          } else {
            setFollowers(prev => [...prev, ...newData]);
            setCurrentPage(nextPage);
          }
        } else {
          const result = await getFS({ token: route?.params?.token, listType: 'subscribers', active: isActive, page: nextPage });
          const newData = result?.data?.data?.subscribers || [];

          if (newData.length === 0) {
            setHasMore(false);
          } else {
            setSubscribers(prev => [...prev, ...newData]);
            setCurrentPage(nextPage);
          }
        }
      }
    } catch (error) {
      console.log('Error loading more data:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Reset pagination when filters change
      setCurrentPage(1);
      setHasMore(true);
      setFollowers([]);
      setSubscribers([]);
      setIsLoading(true);

      const fetchFollowing = async () => {
        const result = await getFollowing({ token: route?.params?.token, page: 1, limit: 10, t: Date.now() });
        setFollowers(result?.data?.data?.followed || []);
        const total = result?.data?.data?.metadata?.[0]?.total || 0;
        setTotalCount(total);
        setHasMore((result?.data?.data?.followed?.length || 0) < total);
        setIsLoading(false);
      };

      const followers = async () => {
        const foll = await getFS({ token: route?.params?.token, listType: 'followers', active: true, t: Date.now() });
        setFollowers(foll?.data?.data?.followers);
        const total = foll?.data?.data?.metadata?.[0]?.total || 0;
        setTotalCount(total);
        setHasMore((foll?.data?.data?.followers?.length || 0) < total);
        setIsLoading(false);
      };

      const subscribers = async () => {
        const subs = await getFS({ token: route?.params?.token, listType: 'subscribers', active: isActive, t: Date.now() });
        setSubscribers(subs?.data?.data?.subscribers);
        const total = subs?.data?.data?.metadata?.[0]?.total || 0;
        setTotalCount(total);
        setHasMore((subs?.data?.data?.subscribers?.length || 0) < total);
        setIsLoading(false);
      };

      const followed = async () => {
        const foll = await getFSD({ token: route?.params?.token, listType: 'followed', t: Date.now() });
        setFollowers(foll?.data?.data?.followed);
        const total = foll?.data?.data?.metadata?.[0]?.total || 0;
        setTotalCount(total);
        setHasMore((foll?.data?.data?.followed?.length || 0) < total);
        setIsLoading(false);
      };

      const subscribed = async () => {
        const subs = await getFSD({ token: route?.params?.token, listType: 'subscribed', active: isActive, t: Date.now() });
        setSubscribers(subs?.data?.data?.subscribed);
        const total = subs?.data?.data?.metadata?.[0]?.total || 0;
        setTotalCount(total);
        setHasMore((subs?.data?.data?.subscribed?.length || 0) < total);
        setIsLoading(false);
      };

      if (route?.params?.title === 'Following') {
        fetchFollowing();
      } else if (route?.params?.role === 'user') {
        if (route?.params?.title === 'Followed') {
          followed();
        } else {
          subscribed();
        }
      } else {
        if (route?.params?.title === 'Followers') {
          followers();
        } else if (route?.params?.title === 'Subscribed') {
          subscribed();
        } else {
          subscribers();
        }
      }
    }, [route?.params?.title, isActive, route?.params?.token, route?.params?.role, refreshList])
  );



  if (isLoading) {
    return (
      <View style={styles.container}>
        {route?.params?.title === 'Subscribers' || route?.params?.title === 'Subscribed' ? (
          <View style={{ borderWidth: responsiveWidth(0.5), borderRadius: responsiveWidth(3.73), width: responsiveWidth(92), alignSelf: 'center', overflow: 'hidden', backgroundColor: '#fff', marginBottom: 10 }}>
            <View style={styles.FollowersSubScribersToggle}>
              <TouchableOpacity onPress={() => setIsActive(!isActive)} style={[styles.Followers, isActive === true ? { backgroundColor: '#FFA86B', borderWidth: responsiveWidth(0.3), borderRadius: responsiveWidth(2.5) } : null]}>
                <Text style={{ fontFamily: 'Rubik-SemiBold', fontSize: FONT_SIZES[14], color: '#282828' }} key={'1Followers'}>
                  Active
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setIsActive(!isActive)} style={[styles.SubScribers, isActive === false ? { backgroundColor: '#FFA86B', borderWidth: responsiveWidth(0.3), borderRadius: responsiveWidth(2.5) } : null]}>
                <Text key={'2SubScribers'} style={{ fontFamily: 'Rubik-SemiBold', fontSize: FONT_SIZES[14], color: '#282828' }}>
                  In active
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
        <FollowersShimmer />
      </View>
    );
  }

  if (route?.params?.count === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Pressable style={styles.signupPressable} onPress={() => navigate('discover')}>
          <Text style={styles.signupText}>Not found.{'\n'}</Text>
        </Pressable>
      </View>
    );
  } else {
    return (
      <View style={styles.container}>
        {route?.params?.title === 'Subscribers' || route?.params?.title === 'Subscribed' ? (
          <View style={{ borderWidth: responsiveWidth(0.5), borderRadius: responsiveWidth(3.73), width: responsiveWidth(92), alignSelf: 'center', overflow: 'hidden', backgroundColor: '#fff' }}>
            <View style={styles.FollowersSubScribersToggle}>
              <TouchableOpacity onPress={() => setIsActive(!isActive)} style={[styles.Followers, isActive === true ? { backgroundColor: '#FFA86B', borderWidth: responsiveWidth(0.3), borderRadius: responsiveWidth(2.5) } : null]}>
                <Text style={{ fontFamily: 'Rubik-SemiBold', fontSize: FONT_SIZES[14], color: '#282828' }} key={'1Followers'}>
                  Active
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setIsActive(!isActive)} style={[styles.SubScribers, isActive === false ? { backgroundColor: '#FFA86B', borderWidth: responsiveWidth(0.3), borderRadius: responsiveWidth(2.5) } : null]}>
                <Text key={'2SubScribers'} style={{ fontFamily: 'Rubik-SemiBold', fontSize: FONT_SIZES[14], color: '#282828' }}>
                  In active
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {route?.params?.title === 'Following' ? (
          <FlatList
            ItemSeparatorComponent={() => <View style={{ height: 1.5, backgroundColor: '#E9E9E9', width: '100%' }} />}
            data={followers}
            renderItem={({ item, index }) => <EachList item={item} index={index} followersLength={followers?.length} handleGoToOthersProfile={handleGoToOthersProfile} />}
            onEndReached={loadMoreData}
            onEndReachedThreshold={0.5}
            ListFooterComponent={() => isLoadingMore ? <View style={{ padding: 10, alignItems: 'center' }}><Text style={{ fontFamily: 'Rubik-Regular', color: '#888' }}>Loading...</Text></View> : null}
          />
        ) : route?.params?.title === 'Followers' || route?.params?.title === 'Followed' ? (
          <FlatList
            ItemSeparatorComponent={() => <View style={{ height: 1.5, backgroundColor: '#E9E9E9', width: '100%' }} />}
            data={followers}
            renderItem={({ item, index }) => <EachList item={item} index={index} followersLength={followers?.length} handleGoToOthersProfile={handleGoToOthersProfile} />}
            onEndReached={loadMoreData}
            onEndReachedThreshold={0.5}
            ListFooterComponent={() => isLoadingMore ? <View style={{ padding: 10, alignItems: 'center' }}><Text style={{ fontFamily: 'Rubik-Regular', color: '#888' }}>Loading...</Text></View> : null}
          />
        ) : (
          <FlatList
            ItemSeparatorComponent={() => <View style={{ height: 0.5, backgroundColor: '#E9E9E9', width: '100%' }} />}
            data={subscriberss}
            renderItem={({ item, index }) => (
              <EachList 
                handleGoToOthersProfile={handleGoToOthersProfile} 
                item={item} 
                index={index} 
                followersLength={subscriberss?.length} 
                isSubscribedList={route?.params?.title === 'Subscribed'}
                onUnsubscribe={handleUnsubscribePress}
                isFetching={loadingId === (item?.userDetails?._id || item?.creatorId)}
              />
            )}
            onEndReached={loadMoreData}
            onEndReachedThreshold={0.5}
            ListFooterComponent={() => isLoadingMore ? <View style={{ padding: 10, alignItems: 'center' }}><Text style={{ fontFamily: 'Rubik-Regular', color: '#888' }}>Loading...</Text></View> : null}
          />
        )}

        <UnSubscribeModal 
          visible={unsubscribeModalVisible}
          onClose={() => setUnsubscribeModalVisible(false)}
          item={selectedItem}
          onUpdateList={() => {
            setSubscribers(prev => prev.filter(s => {
              const sId = s.userDetails?._id || s.creatorId;
              const targetId = selectedItem?.userDetails?._id || selectedItem?.creatorId;
              return sId !== targetId;
            }));
          }}
          onSuccess={() => {
            setUnsubscribeModalVisible(false);
          }}
        />
      </View>
    );
  }
};

export default FollowersSubscribersPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopColor: '#282828',
  },

  eachListContainer: {
    flexDirection: 'row',
    gap: responsiveWidth(4),
    paddingLeft: responsiveWidth(4),
    paddingVertical: responsiveWidth(3),
  },

  imageContainer: {
    borderColor: 'purple',
    borderRadius: responsiveWidth(15),
    position: 'relative',
    borderColor: '#282828',
    resizeMode: 'cover',
    height: responsiveWidth(12),
    width: responsiveWidth(12),
    justifyContent: 'center',
    overflow: 'hidden',
  },

  profileImage: {
    flex: 1,
    borderRadius: responsiveWidth(12),
    borderWidth: 1,
    borderColor: '#282828',
    width: '100%',
    resizeMode: 'cover',
  },

  name: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.8),
    color: '#282828',
  },

  userName: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.7),
    color: '#282828',
  },

  detailContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },

  choiceContainer: {
    paddingLeft: responsiveWidth(4),
    flexDirection: 'row',
    marginTop: responsiveWidth(2),
  },

  button: {
    backgroundColor: '#fff',
    padding: responsiveWidth(2),
    borderRadius: responsiveWidth(2),
    fontFamily: 'Rubik-Regular',
    color: '#282828',
    borderWidth: 1,
  },

  buttonSelected: {
    backgroundColor: '#ffa07a',
    padding: responsiveWidth(2),
    borderRadius: responsiveWidth(2),
    fontFamily: 'Rubik-Regular',
    color: '#282828',
    borderWidth: 1,
  },

  loginButton: {
    padding: Platform.OS === 'ios' ? responsiveWidth(4) : null,
    backgroundColor: 'rgba(255, 168, 107, 1)',
    borderRadius: responsiveWidth(4),
    color: '#282828',
    textAlign: 'center',
    fontFamily: 'Rubik-Medium',
    fontWeight: '600',
    width: responsiveWidth(85),
    height: responsiveWidth(14),
    textAlignVertical: 'center',
    alignSelf: 'center',
    borderWidth: responsiveWidth(0.5),
    borderTopColor: '#282828',
    borderLeftColor: '#282828',
    fontSize: responsiveFontSize(2.4),
    overflow: 'hidden',
  },
  signupText: {
    textAlign: 'center',
    fontFamily: 'Rubik-Medium',
    color: 'black',
    fontSize: responsiveFontSize(2.2),
  },
  signupLink: {
    color: '#FF7F50',
    fontSize: responsiveFontSize(1.8),
  },
  signupPressable: {
    width: '68%',
  },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: responsiveWidth(3),
    flex: 1,
  },

  name: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(2),
    color: 'black',
  },
  username: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.5),
    color: '#1e1e1e',
    textAlign: 'left',
  },
  verifyContainer: {
    width: responsiveWidth(4),
    height: responsiveWidth(4),
  },
  imageContainer: {
    width: responsiveWidth(13.3),
    height: responsiveWidth(13.3),
    borderRadius: responsiveWidth(105),
    marginRight: responsiveWidth(1.5),
    borderWidth: 1.5,
    overflow: 'hidden', // Clip the image if it exceeds the container
    alignItems: 'center', // Center the image horizontally
    justifyContent: 'center', // Center the image vertically
  },
  profileImage: {
    width: '100%', // Fill the container width
    height: '100%', // Fill the container height
    resizeMode: 'cover', // Ensure the image covers the container while maintaining aspect ratio
  },

  FollowersSubScribersToggle: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: responsiveWidth(2.8),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: responsiveWidth(2),
    backgroundColor: '#f3f3f3',
    height: 54,
    padding: responsiveWidth(1),
    width: '100%',
  },
  Followers: {
    flexBasis: '48.2%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  SubScribers: {
    flexBasis: '48.2%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: responsiveWidth(5),
  },
  unsubscribeButton: {
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: responsiveWidth(2),
    paddingVertical: responsiveWidth(1.5),
    paddingHorizontal: responsiveWidth(3),
    backgroundColor: '#FFA86B',
  },
  unsubscribeButtonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(1.6),
    color: '#1E1E1E',
  },
});
