import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, FlatList } from 'react-native';

const PostShimmer = () => {
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
      ])
    ).start();
  }, [shimmerOpacity]);

  // Render Shimmer Item
  const renderShimmerItem = () => (
    <View style={styles.card}>
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <Animated.View style={[styles.profilePic, { opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.header, { opacity: shimmerOpacity }]} />
      </View>

      {/* Title Section */}
      <Animated.View style={[styles.title, { opacity: shimmerOpacity }]} />

      {/* Post Content */}
      <Animated.View style={[styles.post, { opacity: shimmerOpacity }]} />

      {/* Footer */}
      <Animated.View style={[styles.footer, { opacity: shimmerOpacity }]} />
    </View>
  );

  return (
    <FlatList
      data={[1, 2, 3]} // Placeholder data for 3 posts
      renderItem={renderShimmerItem}
      keyExtractor={(item, index) => index.toString()}
      contentContainerStyle={styles.listContainer}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
    backgroundColor: '#0D0D0D',
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 0,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    marginRight: 12,
  },
  header: {
    height: 40,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    flex: 1,
  },
  title: {
    height: 30,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    marginBottom: 12,
    width: '100%',
  },
  post: {
    height: 250,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
  },
  footer: {
    height: 25,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    width: '90%',
  },
});

export default PostShimmer;
