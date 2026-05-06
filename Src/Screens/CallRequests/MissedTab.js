import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator } from 'react-native';
import moment from 'moment';

const MissedTab = ({ data = [], refreshControl, onLoadMore, loadingMore }) => {
  const renderMissedItem = ({ item, index }) => (
    <View>
      <View style={styles.itemContainer}>
        {/* Left Side: Avatar and Info */}
        <View style={styles.leftContent}>
          <Image source={{ uri: item.profileImage || 'https://randomuser.me/api/portraits/women/44.jpg' }} style={styles.avatar} />
          <View style={styles.infoColumn}>
            <Text style={styles.userName}>{item.displayName || 'Unknown'}</Text>
            <Text style={styles.detailsText}>{item.time ? moment(item.time).format('MMM Do') : ''} • {item.duration} mins</Text>
          </View>
        </View>

        {/* Right Side: Coins */}
        <Text style={styles.coinText}>{item.amount || 0} COINS</Text>
      </View>
      {index < data.length - 1 && <View style={styles.separator} />}
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#FFA86B" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        renderItem={renderMissedItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
            <Text style={{ fontFamily: 'Rubik-Medium', color: '#1e1e1e' }}>No missed calls</Text>
          </View>
        }
      />
    </View>
  );
};

export default MissedTab;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  list: {
    paddingHorizontal: 0,
  },
  itemContainer: {
    height: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  separator: {
    height: 1.5,
    backgroundColor: '#E9E9E9',
    marginHorizontal: 0,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  infoColumn: {
    justifyContent: 'center',
  },
  userName: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 16,
    color: '#1e1e1e',
    marginBottom: 4,
  },
  detailsText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 12,
    color: '#1E1E1E',
  },
  coinText: {
    fontFamily: 'Rubik-Bold',
    fontSize: 14,
    color: '#FF8080', // Red for missed
    textTransform: 'uppercase',
  },
});
