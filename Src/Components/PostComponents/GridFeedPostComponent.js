import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import React, { useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { responsiveFontSize, responsiveWidth } from 'react-native-responsive-dimensions';
import EmptyComponent from './EmptyComponent';
import DIcon from '../../../DesiginData/DIcons';
import { Tabs, useHeaderMeasurements } from 'react-native-collapsible-tab-view';
import { Image } from 'expo-image';
import { navigate } from '../../../Navigation/RootNavigation';

import { appendFeedCacheMyPosts, manipulateCurrentPageMyPost } from '../../../Redux/Slices/NormalSlices/Posts/MyProfileFeedCacheSlice';
import { useCurrentTabScrollY } from 'react-native-collapsible-tab-view';
import { useLazyMyPostListQuery } from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { token as memoizedToken } from '../../../Redux/Slices/NormalSlices/AuthSlice';
import { ActivityIndicator } from 'react-native';

const GridFeedPostComponent = ({ navigation }) => {
  const userPosts = useSelector(state => state.myProfileFeedCache.data.content);
  const { currentPage, totalPages } = useSelector(state => state.myProfileFeedCache.data);
  const dispatch = useDispatch();
  const token = useSelector(memoizedToken);
  const [myPostList] = useLazyMyPostListQuery();
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [dummy, setDummy] = useState(false);

  const scrollY = useCurrentTabScrollY();

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDummy(prev => !prev);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadMore = async () => {
    if (isFetchingMore || currentPage >= totalPages) return;

    setIsFetchingMore(true);
    const nextPage = currentPage + 1;

    try {
      const { data: postData } = await myPostList({
        token,
        page: nextPage
      });

      if (postData?.data?.posts?.length > 0) {
        dispatch(appendFeedCacheMyPosts({ data: postData.data.posts }));
        dispatch(manipulateCurrentPageMyPost({ currentPage: nextPage }));
      }
    } catch (error) {
      console.error('Error fetching more posts:', error);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const { height: headerHeight } = useHeaderMeasurements();

  const GridPostComponent = useCallback(({ item, index }) => {
    const rowIndex = Math.floor(index / 3);

    return item?.post_content_files?.[0]?.format === 'image' ? (
      <View style={{ width: responsiveWidth(33.33) }}>
        <TouchableOpacity style={[styles.gridEachImageContainer, rowIndex >= 1 ? { marginTop: 2 } : null, index % 3 === 1 ? { paddingHorizontal: 2 } : null]} onPress={() => navigate('allmyposts', { scrollIndex: index })}>
          <Image allowDownscaling placeholderContentFit="cover" placeholder={require('../../../Assets/Images/GridPostPlaceholder.jpg')} source={item?.post_content_files?.[0]?.url} contentFit="cover" style={{ width: '100%', height: '100%' }} />

          {item?.pinned && (
            <View style={{ justifyContent: 'center', alignItems: 'center', width: responsiveWidth(10), height: responsiveWidth(10), position: 'absolute', top: '-4%', zIndex: 3, alignSelf: 'flex-end' }}>
              <DIcon provider={'Entypo'} name={'pin'} size={responsiveWidth(4)} color={'white'} />
            </View>
          )}
          {item?.for_subscribers && (
            <View style={styles.subsonly}>
              <Text style={{ fontFamily: 'MabryPro-Medium', color: '#fff', fontSize: responsiveFontSize(1.5) }}>PREMIUM</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    ) : (
      <View style={{ width: responsiveWidth(33.33) }}>
        <TouchableOpacity style={[styles.gridEachImageContainer, { position: 'relative' }, rowIndex >= 1 ? { marginTop: 2 } : null, index % 3 === 1 ? { paddingHorizontal: 2 } : null]} onPress={() => navigate('allmyposts', { scrollIndex: index })}>
          {item?.pinned && (
            <View style={{ justifyContent: 'center', alignItems: 'center', width: responsiveWidth(10), height: responsiveWidth(10), position: 'absolute', top: '-4%', zIndex: 3, alignSelf: 'flex-end' }}>
              <DIcon provider={'Entypo'} name={'pin'} size={responsiveWidth(4)} color={'white'} />
            </View>
          )}

          <View style={{ justifyContent: 'center', alignItems: 'center', width: responsiveWidth(10), height: responsiveWidth(10), position: 'absolute', top: '35%', zIndex: 3, alignSelf: 'center' }}>
            <DIcon provider={'AntDesign'} name={'play'} size={responsiveWidth(8)} color={'white'} />
          </View>
          <Image allowDownscaling placeholderContentFit="cover" placeholder={require('../../../Assets/Images/GridPostPlaceholder.jpg')} source={item?.video?.thumbnail?.url} contentFit="cover" style={{ width: '100%', height: '100%' }} />

          {item?.for_subscribers && (
            <View style={styles.subsonly}>
              <Text style={{ fontFamily: 'MabryPro-Medium', color: '#fff', fontSize: responsiveFontSize(1.5) }}>PREMIUM</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Tabs.FlatList
        data={userPosts}
        numColumns={3}
        keyExtractor={item => item?._id}
        renderItem={GridPostComponent}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => isFetchingMore ? <View style={{ padding: 20 }}><ActivityIndicator size="small" color="#000" /></View> : null}
        // ✅ IMPORTANT
        contentContainerStyle={{
          paddingBottom: 150,
          backgroundColor: '#fff',
        }}
        ListEmptyComponent={() => <EmptyComponent />}
      />
    </View>
  );
};

export default GridFeedPostComponent;

const styles = StyleSheet.create({
  gridView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  gridEachImageContainer: {
    width: '100%',
    aspectRatio: 4 / 5,
    overflow: 'hidden',
    position: 'relative',
  },
  subsonly: {
    position: 'absolute',
    // borderWidth : 1,
    alignSelf: 'center',
    backgroundColor: '#00000080',
    bottom: 0,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marginHorizontal: {
    marginHorizontal: 8,
  },
});
