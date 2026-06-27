
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { Image } from 'expo-image';
import { useLazyNewCreatorsQuery, useLazyTrendingCreatorsQuery } from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { WIDTH_SIZES } from '../../DesiginData/Utility';
import { navigate } from '../../Navigation/RootNavigation';
import { useIsFocused } from '@react-navigation/native';
import { useAppTheme } from '../Hook/useAppTheme';

const { width } = Dimensions.get('window');

const DiscoverFeed = ({ niche, tab }) => {
  const [selectedCreatorId, setSelectedCreatorId] = useState(null);
  const [page, setPage] = useState(1);
  const [allCreators, setAllCreators] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  const isFocused = useIsFocused();
  const { colors, isDark } = useAppTheme();

  // Get token from Redux
  const token = useSelector(state => state.auth.user.token);

  //Get online/all filter
  const filter = useSelector(state => state.hideShow.visibility.discoverFilter.type);

  // Lazy query hooks
  const [fetchTrendingCreators, { data: trendingData, isLoading: trendingLoading, isFetching: trendingFetching }] = useLazyTrendingCreatorsQuery();
  const [fetchNewCreators, { data: newData, isLoading: newLoading, isFetching: newFetching }] = useLazyNewCreatorsQuery();

  //Go to other profile
  const handleGoToOthersProfile = (displayName, userId) => {
    setSelectedCreatorId(userId);
    // Navigate after 500 milliseconds
    setTimeout(() => {
      navigate('othersProfile', {
        userName: displayName,
        userId: userId,
        role: 'creator',
      });
    }, 300);
  };

  // Reset pagination when tab or category changes
  useEffect(() => {
    setPage(1);
    setAllCreators([]);
    setHasMore(true);
  }, [tab, niche, filter]);

  // Fetch data when tab, category, or page changes
  useEffect(() => {
    fetchData();
  }, [tab, niche, page, filter]);

  const fetchData = () => {
    // Convert category value or use 'all' for empty string
    const nicheValue = niche.value || 'all';

    const params = {
      token,
      niche: nicheValue,
      filter,
      page: page,
    };

    if (tab === 'New') {
      fetchNewCreators(params);
    } else {
      fetchTrendingCreators(params);
    }
  };

  // Update creators list when new data arrives
  // KEY FIX: Only process data that matches the current tab
  useEffect(() => {
    const currentData = tab === 'New' ? newData : trendingData;

    // Don't process if there's no data
    if (!currentData?.data?.users) {
      return;
    }

    const newUsers = currentData.data.users;
    const metadata = currentData.data.metadata?.[0];

    if (page === 1) {
      // First page - replace all data
      setAllCreators(newUsers);
    } else {
      // Subsequent pages - append data, filter duplicates
      setAllCreators(prev => {
        const existingIds = new Set(prev.map(creator => creator._id));
        const uniqueNewUsers = newUsers.filter(user => !existingIds.has(user._id));
        return [...prev, ...uniqueNewUsers];
      });
    }

    // Check if there's more data
    if (metadata) {
      const totalPages = Math.ceil(metadata.total / metadata.limit);
      setHasMore(page < totalPages);
    } else {
      // If no more data returned, stop pagination
      setHasMore(newUsers.length > 0);
    }
  }, [newData, trendingData, page, tab]);

  useEffect(() => {
    if (!isFocused) {
      setSelectedCreatorId(null);
    }
  }, [isFocused]);

  const loading = (tab === 'New' ? newLoading : trendingLoading) && page === 1;
  const loadingMore = (tab === 'New' ? newFetching : trendingFetching) && page > 1;

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && allCreators.length > 0) {
      setPage(prev => prev + 1);
    }
  };

  const renderItem = ({ item, index }) => {
    const isSelected = selectedCreatorId === item._id;

    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor: isDark ? colors.card : '#FFF',
              borderColor: isDark ? colors.border : '#fff3eb',
              borderRadius: isDark ? 14 : 16,
              shadowColor: isDark ? '#000' : '#fff3eb',
              shadowOpacity: isDark ? 0.2 : 0.1,
            },
            isSelected && {
              borderColor: isDark ? '#FF7819' : '#ffa86b',
              backgroundColor: isDark ? 'rgba(255, 168, 107, 0.15)' : '#ffeee1',
            },
          ]}
          onPress={() => handleGoToOthersProfile(item.displayName, item?._id)}
        >
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.profile_image?.url }}
              style={[
                styles.profile,
                {
                  width: isDark ? 80 : 70,
                  height: isDark ? 80 : 70,
                  borderRadius: isDark ? 40 : 35,
                },
              ]}
              contentFit="cover"
            />
            {/* Online Indicator on image */}
            <View
              style={[
                styles.onlineDot,
                {
                  top: isDark ? 76 : 67,
                  right: isDark ? 18 : 22,
                  width: isDark ? 8 : 12,
                  height: isDark ? 8 : 12,
                  borderRadius: isDark ? 4 : 6,
                  borderWidth: isDark ? 1.5 : WIDTH_SIZES['1.5'],
                  borderColor: isDark ? colors.background : '#1e1e1e',
                  backgroundColor: item.is_online ? '#03DA32' : '#FF2727',
                },
              ]}
            />
          </View>
          <Text
            style={[
              styles.name,
              {
                color: isDark ? colors.text : '#1e1e1e',
                fontSize: isDark ? 14 : 13,
                ...(isDark ? { lineHeight: 16 } : {}),
              },
            ]}
            numberOfLines={1}
          >
            {item.displayName}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#FF6A33" />
      </View>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#FF6A33" style={{ marginTop: 100 }} />;
  }

  if (allCreators.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No creators found</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={allCreators}
      numColumns={3}
      contentContainerStyle={styles.gridContent}
      keyExtractor={(item, index) => `${item._id}-${index}`}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      ListFooterComponent={renderFooter}
      removeClippedSubviews={false}
    />
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    width: '100%',
  },
  gridContent: {
    paddingBottom: 100,
    paddingTop: 10,
    paddingHorizontal: 2,
  },
  cardWrapper: {
    width: '33.33%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  card: {
    width: '100%',
    backgroundColor: '#1C1C1C',
    borderRadius: 14,
    paddingBottom: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: '#212121',
  },
  cardSelected: {
    borderColor: '#FF7819',
    borderWidth: 2,
    backgroundColor: 'rgba(255, 168, 107, 0.15)',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    paddingTop: 12,
  },
  profile: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 76,
    right: 18,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  name: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 4,
    fontFamily: 'Rubik-Medium',
  },
});

export default DiscoverFeed;

