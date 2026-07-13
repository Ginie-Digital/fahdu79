import React, {useEffect, useRef} from 'react';
import {Animated, View, StyleSheet, FlatList} from 'react-native';
import { useAppTheme } from '../../Hook/useAppTheme';

const NotificationScreenShimmer = () => {
  const { colors } = useAppTheme();
  const shimmerOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerOpacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [shimmerOpacity]);

  // Render Shimmer Item
  const renderShimmerItem = () => (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <Animated.View style={[styles.profilePic, {opacity: shimmerOpacity, backgroundColor: colors.border}]} />
        <Animated.View style={[styles.header, {opacity: shimmerOpacity, backgroundColor: colors.border}]} />
      </View>
    </View>
  );

  return (
    <FlatList
      data={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} // Placeholder data for 3 posts
      renderItem={renderShimmerItem}
      keyExtractor={(item, index) => index.toString()}
      contentContainerStyle={[styles.listContainer, { backgroundColor: colors.background }]}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 0, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOpacity: 0.1,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 4,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // marginBottom: 12,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20, // Circle shape
    backgroundColor: '#e0e0e0',
    marginRight: 12,
  },
  header: {
    height: 40,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    flex: 1, // Take remaining space
  },
  title: {
    height: 30,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 12,
    width: '100%', // Title is smaller than the full width
  },
  post: {
    height: 250,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
  },
  footer: {
    height: 25,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    width: '90%',
  },
});

export default NotificationScreenShimmer;
