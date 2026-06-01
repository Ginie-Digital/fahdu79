import React, {useEffect, useRef} from 'react';
import {Animated, View, StyleSheet, FlatList} from 'react-native';
import {responsiveWidth} from 'react-native-responsive-dimensions';

const TransactionShimmer = () => {
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

      {/* Details Container */}
      <View style={styles.detailsContainer}>
        {/* Name Placeholder */}
        <Animated.View style={[styles.name, {opacity: shimmerOpacity}]} />
        {/* Date Placeholder */}
        <Animated.View style={[styles.date, {opacity: shimmerOpacity}]} />
      </View>

      {/* Amount Placeholder */}
      <Animated.View style={[styles.amount, {opacity: shimmerOpacity}]} />
    </View>
  );

  return (
    <FlatList
      data={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
      renderItem={renderShimmerItem}
      keyExtractor={(item, index) => index.toString()}
      contentContainerStyle={styles.listContainer}
      ItemSeparatorComponent={() => <View style={{height: 1.5, backgroundColor: '#E9E9E9', width: '100%'}} />}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    backgroundColor: '#fff',
    flex: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  profilePic: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#e0e0e0',
    marginRight: 12,
  },
  detailsContainer: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  name: {
    width: responsiveWidth(40),
    height: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  date: {
    width: responsiveWidth(25),
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  amount: {
    width: responsiveWidth(15),
    height: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
});

export default TransactionShimmer;
