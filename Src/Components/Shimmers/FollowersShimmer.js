import React, {useEffect, useRef} from 'react';
import {Animated, View, StyleSheet, FlatList} from 'react-native';
import { responsiveWidth } from 'react-native-responsive-dimensions';

const FollowersShimmer = () => {
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

  const renderShimmerItem = () => (
    <View style={styles.itemContainer}>
      {/* Profile Picture Placeholder */}
      <Animated.View style={[styles.profilePic, {opacity: shimmerOpacity}]} />

      {/* Text Container */}
      <View style={styles.textContainer}>
        {/* Name Placeholder */}
        <Animated.View style={[styles.name, {opacity: shimmerOpacity}]} />
        {/* Username Placeholder */}
        <Animated.View style={[styles.username, {opacity: shimmerOpacity}]} />
      </View>
    </View>
  );

  return (
    <FlatList
      data={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} 
      renderItem={renderShimmerItem}
      keyExtractor={(item, index) => index.toString()}
      contentContainerStyle={styles.listContainer}
      ItemSeparatorComponent={() => <View style={{ height: 1.5, backgroundColor: '#E9E9E9', width: '100%' }} />}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingTop: 10,
    backgroundColor: '#fff',
    flex: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: responsiveWidth(4.3),
    paddingHorizontal: responsiveWidth(6.7),
  },
  profilePic: {
    width: responsiveWidth(13.3),
    height: responsiveWidth(13.3),
    borderRadius: responsiveWidth(105),
    backgroundColor: '#e0e0e0',
    marginRight: responsiveWidth(1.5),
  },
  textContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: responsiveWidth(0.8),
  },
  name: {
    width: responsiveWidth(30),
    height: responsiveWidth(4),
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  username: {
    width: responsiveWidth(20),
    height: responsiveWidth(3),
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
});

export default FollowersShimmer;
