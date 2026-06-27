import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import React, { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useLazyOtherPostListQuery } from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { useSelector, useDispatch } from 'react-redux';
import { token as memoizedToken } from '../../../Redux/Slices/NormalSlices/AuthSlice';
import { responsiveWidth } from 'react-native-responsive-dimensions';
import DIcon from '../../../DesiginData/DIcons';
import EmptyComponent from '../PostComponents/EmptyComponent';
import { Tabs } from 'react-native-collapsible-tab-view';
import { Image } from 'expo-image';
import { useAppTheme } from '../../Hook/useAppTheme';

import { appendFeedCachePosts, manipulateCurrentPagePost } from '../../../Redux/Slices/NormalSlices/Posts/ProfileFeedCacheSlice';
import { useCurrentTabScrollY } from 'react-native-collapsible-tab-view';

const OtherGridFeedPostComponent = ({ toCallApiInfo }) => {
  const { colors, isDark } = useAppTheme();
  const userPosts = useSelector(state => state.profileFeedCache.data.content);
  const { currentPage, totalPages } = useSelector(state => state.profileFeedCache.data);
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const token = useSelector(memoizedToken);
  const [otherPostList] = useLazyOtherPostListQuery();
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const scrollY = useCurrentTabScrollY();

  const loadMore = async () => {
    if (isFetchingMore || currentPage >= totalPages) return;

    setIsFetchingMore(true);
    const nextPage = currentPage + 1;

    try {
      const { data: postData } = await otherPostList({
        token,
        userName: toCallApiInfo?.userName,
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

  const GridPostComponent = useCallback(({ item, index }) => {
    const rowIndex = Math.floor(index / 3);

    return (
      <View style={{ width: responsiveWidth(33.33) }}>
        {item?.post_content_files ? (
          item?.post_content_files?.[0]?.format === 'image' ? (
            <TouchableOpacity style={[styles.gridEachImageContainer, rowIndex >= 1 ? { marginTop: 2 } : null, index % 3 === 1 ? { paddingHorizontal: 2 } : null]} onPress={() => navigation.navigate('allPosts', { scrollIndex: index })}>
              {item?.pinned && (
                <View
                  style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: responsiveWidth(10),
                    height: responsiveWidth(10),
                    position: 'absolute',
                    top: 5,
                    zIndex: 3,
                    right: 0,
                  }}>
                  <DIcon provider={'Entypo'} name={'pin'} size={responsiveWidth(4)} color={'white'} />
                </View>
              )}
              <Image allowDownscaling placeholderContentFit="cover" placeholder={require('../../../Assets/Images/OtherPostGridDefault.jpg')} source={item?.post_content_files?.[0]?.url ? item?.post_content_files?.[0]?.url : require('../../../Assets/Images/OtherPostGridDefault.jpg')} contentFit="cover" style={{ width: '100%', height: '100%' }} />
            </TouchableOpacity>
          ) : (

            <TouchableOpacity style={[styles.gridEachImageContainer, { position: 'relative' }, rowIndex >= 1 ? { marginTop: 2 } : null, index % 3 === 1 ? { paddingHorizontal: 2 } : null]} onPress={() => navigation.navigate('otherProfileReels', { initialPostId: item?._id, userName: toCallApiInfo?.userName })}>
              {item?.pinned && (
                <View
                  style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: responsiveWidth(10),
                    height: responsiveWidth(10),
                    position: 'absolute',
                    top: 5,
                    zIndex: 3,
                    right: 0,
                  }}>
                  <DIcon provider={'Entypo'} name={'pin'} size={responsiveWidth(4)} color={'white'} />
                </View>
              )}

              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 3,
                }}>
                <DIcon provider={'AntDesign'} name={'play'} size={responsiveWidth(8)} color={'white'} />
              </View>
              <Image placeholderContentFit="cover" source={!item?.video?.thumbnail?.url ? require('../../../Assets/Images/OtherPostGridDefault.jpg') : { uri: item?.video?.thumbnail?.url }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity style={[styles.gridEachImageContainer, { position: 'relative' }, rowIndex >= 1 ? { marginTop: 2 } : null, index % 3 === 1 ? { paddingHorizontal: 2 } : null]} onPress={() => navigation.navigate('allPosts', { scrollIndex: index })}>
            {item?.pinned && (
              <View
                style={{
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: responsiveWidth(10),
                  height: responsiveWidth(10),
                  position: 'absolute',
                  top: 5,
                  zIndex: 3,
                  right: 0,
                }}>
                <DIcon provider={'Entypo'} name={'pin'} size={responsiveWidth(4)} color={'white'} />
              </View>
            )}

            <View
              style={[
                {
                  ...StyleSheet.absoluteFillObject,
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 3,
                },
              ]}>
              <DIcon provider={'SimpleLineIcons'} name={'lock'} color="#fff" size={responsiveWidth(6)} />
            </View>

            <View
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                position: 'absolute',
                top: responsiveWidth(1),
                right: responsiveWidth(1),
                zIndex: 3,
              }}>
              {item?.video?.hasVideo || item?.type === 'video' ? (
                <DIcon provider={'Ionicons'} name={'videocam'} size={responsiveWidth(4)} color={'white'} />
              ) : (
                <DIcon provider={'Ionicons'} name={'image'} size={responsiveWidth(4)} color={'white'} />
              )}
            </View>
            <Image allowDownscaling blurRadius={20} placeholderContentFit="cover" placeholder={require('../../../Assets/Images/blur.jpg')} source={item?.image_preview?.[0]?.url} contentFit="cover" style={{ width: '100%', height: '100%' }} />
          </TouchableOpacity>
        )}
      </View>
    );
  }, []);

  return (
    <Tabs.FlatList
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={() => <EmptyComponent type={'other'} />}
      data={userPosts}
      renderItem={GridPostComponent}
      keyExtractor={item => item?._id}
      numColumns={3}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={() => isFetchingMore ? <View style={{ padding: 20 }}><ActivityIndicator size="small" color="#FFA86B" /></View> : null}
      contentContainerStyle={{
        paddingBottom: 200,
        backgroundColor: colors.background,
      }}
    />
  );
};

export default OtherGridFeedPostComponent;

const styles = StyleSheet.create({
  gridView: {
    backgroundColor: 'transparent',
  },
  gridEachImageContainer: {
    width: '100%',
    aspectRatio: 4 / 5,
    overflow: 'hidden',
    position: 'relative',
  },
});
