import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';

const UserProfileTrendingShimmer = () => {
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

  return (
    <Animated.View style={[styles.card, { opacity: shimmerOpacity }]}>
      {/* Skeleton container for details at the bottom */}
      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <View style={styles.namePlaceholder} />
          <View style={styles.dotPlaceholder} />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 163,
    height: 163,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 16,
    position: 'relative',
  },
  infoContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  namePlaceholder: {
    height: 14,
    width: 70,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  dotPlaceholder: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
});

export default UserProfileTrendingShimmer;