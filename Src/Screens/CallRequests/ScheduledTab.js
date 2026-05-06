import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator } from 'react-native';
import { responsiveWidth } from 'react-native-responsive-dimensions';
import Verify from '../../../Assets/svg/vvv.svg';
import AnimatedButton from '../../Components/AnimatedButton';
import moment from 'moment';

// Import icons from CallRequests folder
const CalendarIcon = require('../../../Assets/Images/CallRequests/Calendar.png');
const TimeIcon = require('../../../Assets/Images/CallRequests/Time.png');

const ScheduledTab = ({ data = [], onStartCall, refreshControl, currentUserId, actionLoading, onLoadMore, loadingMore }) => {
  const renderScheduledItem = ({ item }) => {
    const isInitiator = item.initiator === currentUserId;
    const scheduledTime = moment(item.scheduledAt);
    const activeTime = moment(scheduledTime).subtract(10, 'minutes');
    const isWithinWindow = moment().isAfter(activeTime);

    return (
      <View style={[styles.card, isInitiator && styles.initiatorCard]}>
        {/* Top Row: User info and Starting Soon badge */}
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
              {isInitiator ? (
                <Text style={styles.initiatorSubText}>Creator will call you....</Text>
              ) : (
                <Text style={styles.attemptText}>ATTEMPT {item.attempts || 0}/3</Text>
              )}
            </View>
          </View>
          {!isInitiator && isWithinWindow && (
            <View style={styles.startingSoonBadge}>
              <Text style={styles.startingSoonText}>STARTING SOON</Text>
            </View>
          )}
        </View>

        {/* ... (timingRow, divider, earningsRow same) ... */}
        <View style={styles.timingRow}>
          <Image source={CalendarIcon} style={styles.calendarIcon} />
          <Text style={styles.timingText}>{item.scheduledAt ? moment(item.scheduledAt).format('MMM Do, h:mm A') : 'TBD'}</Text>
          <Image source={TimeIcon} style={styles.timeIcon} />
          <Text style={styles.durationText}>{item.duration || item.requestedDuration || 0} mins</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.earningsRow}>
          <Text style={styles.earningsLabel}>{isInitiator ? 'To Pay' : 'Potential Earnings'}</Text>
          <Text style={styles.coinsValue}>{item.holdAmount || item.requestedCoins || 0} Coins</Text>
        </View>

        {/* Start Call Button - only for non-initiator */}
        {!isInitiator && (
          <View style={styles.buttonWrapper}>
            <AnimatedButton
              title="Start Call"
              onPress={() => onStartCall && onStartCall(item)}
              loading={actionLoading?.id === item?._id && actionLoading?.type === 'start'}
              showOverlay={false}
              buttonMargin={0}
              style={styles.startButtonStyle}
              disabled={!isWithinWindow}
              disabledStyle={{ backgroundColor: '#ffdcc4' }}
              textStyle={!isWithinWindow ? { color: '#999999' } : {}}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        renderItem={renderScheduledItem}
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
            <Text style={{ fontFamily: 'Rubik-Medium', color: '#1e1e1e' }}>No scheduled calls</Text>
          </View>
        }
      />
    </View>
  );
};

export default ScheduledTab;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  list: {
    padding: responsiveWidth(4),
  },
  card: {
    height: 245,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    padding: 24,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  initiatorCard: {
    height: 196,
    borderWidth: 2,
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
  attemptText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 12,
    color: '#1e1e1e',
  },
  initiatorSubText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 12,
    lineHeight: 12,
    color: '#1E1E1E',
  },
  startingSoonBadge: {
    backgroundColor: '#FFF3EB',
    paddingHorizontal: 7.6,
    paddingTop: 4,
    paddingBottom: 5,
    borderRadius: 10,
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startingSoonText: {
    fontFamily: 'Rubik-Bold',
    fontSize: 10,
    color: '#FFA86B',
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
    resizeMode: 'contain',
  },
  timingText: {
    fontFamily: 'Rubik-Medium',
    fontSize: 14,
    color: '#1e1e1e',
    marginRight: 16,
  },
  timeIcon: {
    width: 14,
    height: 14,
    marginRight: 4,
    resizeMode: 'contain',
  },
  durationText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 12,
    color: '#1e1e1e',
  },
  divider: {
    height: 1,
    backgroundColor: '#1E1E1E30',
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsLabel: {
    fontFamily: 'Rubik-Medium',
    fontSize: 12,
    color: '#1e1e1e',
  },
  coinsValue: {
    fontFamily: 'Rubik-Bold',
    fontSize: 16,
    color: '#1e1e1e',
  },
  buttonWrapper: {
    width: '100%',
  },
  startButtonStyle: {
    backgroundColor: '#FFA86B',
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    height: 46,
    borderRadius: 14,
  },
});
