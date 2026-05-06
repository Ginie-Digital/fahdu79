import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator } from 'react-native';
import { responsiveWidth } from 'react-native-responsive-dimensions';
import Verify from '../../../Assets/svg/vvv.svg';
import AnimatedButton from '../../Components/AnimatedButton';
import { getTimeAgo } from '../../../DesiginData/Utility';

// Import icons from CallRequests folder
const TimeIcon = require('../../../Assets/Images/CallRequests/Time.png');
const CoinIcon = require('../../../Assets/Images/CallRequests/Coin.png');

const PendingTab = ({ data = [], onAccept, onDeny, refreshControl, currentUserId, actionLoading, onLoadMore, loadingMore }) => {
  const renderPendingItem = ({ item }) => {
    const isInitiator = item.initiator === currentUserId;

    return (
      <View style={[styles.card, isInitiator && styles.noButtonsCard]}>
        {/* Top Row: User info and time-ago (only if NOT initiator) */}
        <View style={styles.topRow}>
          <View style={styles.userInfo}>
            <Image source={{ uri: item.profileUrl || 'https://randomuser.me/api/portraits/women/44.jpg' }} style={styles.avatar} />
            <View style={styles.details}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{item.displayName || 'Unknown'}</Text>
                {item.isVerified && (
                  <View style={{ marginLeft: 4 }}>
                    <Verify width={16} height={16} />
                  </View>
                )}
              </View>
              <View style={styles.scheduleRow}>
                <Image source={TimeIcon} style={styles.infoIcon} />
                <Text style={[styles.scheduleText, isInitiator && { fontFamily: 'Rubik-Medium', color: '#1E1E1E' }]}>{item.requestedDuration} mins</Text>
                <Image source={CoinIcon} style={[styles.infoIcon, { marginLeft: 12 }]} />
                <Text style={styles.coinText}>{item.requestedCoins} Coins</Text>
              </View>
            </View>
          </View>
          {!isInitiator && (
            <Text style={styles.requestTime}>{item.time ? getTimeAgo(item.time).toUpperCase() : ''}</Text>
          )}
        </View>

        {/* Action Buttons or Status */}
        {isInitiator ? (
          <View style={styles.statusRow}>
            <View style={styles.pendingIndicator}>
              <View style={styles.redDot} />
              <Text style={styles.pendingText}>Pending</Text>
            </View>
            <Text style={styles.bottomRequestTime}>{item.time ? getTimeAgo(item.time).toUpperCase() : ''}</Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <View style={styles.buttonWrapper}>
              <AnimatedButton
                title="Deny"
                onPress={() => onDeny && onDeny(item)}
                showOverlay={false}
                buttonMargin={0}
                style={styles.denyButtonStyle}
                textStyle={styles.buttonText}
                disableAnimation={true}
              />
            </View>
            <View style={styles.buttonWrapper}>
              <AnimatedButton
                title="Accept & Schedule"
                onPress={() => onAccept && onAccept(item)}
                loading={actionLoading?.id === item?._id && actionLoading?.type === 'accept'}
                showOverlay={false}
                buttonMargin={0}
                style={styles.acceptButtonStyle}
                textStyle={styles.buttonText}
                disableAnimation={true}
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        renderItem={renderPendingItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#FFA86B" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
            <Text style={{ fontFamily: 'Rubik-Medium', color: '#1e1e1e' }}>No pending requests</Text>
          </View>
        }
      />
    </View>
  );
};

export default PendingTab;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  list: {
    padding: responsiveWidth(4),
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 24,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  noButtonsCard: {
    paddingBottom: 30,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    marginRight: 12,
  },
  details: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 14,
    color: '#1e1e1e',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 14,
    height: 14,
    marginRight: 4,
    resizeMode: 'contain',
  },
  scheduleText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 12,
    color: '#1e1e1e',
  },
  coinText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 12,
    color: '#1e1e1e',
  },
  requestTime: {
    fontFamily: 'Rubik-Medium',
    fontSize: 12,
    color: '#1E1E1E61',
    textTransform: 'uppercase',
  },
  actions: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  pendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    width: 100,
    height: 36,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1E1E1E',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF5353',
    borderWidth: 1.5,
    borderColor: '#1E1E1E',
  },
  pendingText: {
    fontFamily: 'Rubik-Bold',
    fontSize: 12,
    color: '#1E1E1E',
    textTransform: 'capitalize',
    // Removed lineHeight to prevent clipping
  },
  bottomRequestTime: {
    fontFamily: 'Rubik-Medium',
    fontSize: 12,
    color: '#1E1E1E61',
    textTransform: 'uppercase',
  },
  buttonWrapper: {
    flex: 1,
  },
  denyButtonStyle: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    height: 46,
    borderRadius: 14,
  },
  acceptButtonStyle: {
    backgroundColor: '#FFA86B',
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    height: 46,
    borderRadius: 14,
  },
  buttonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 13,
    color: '#000000',
  },
});
