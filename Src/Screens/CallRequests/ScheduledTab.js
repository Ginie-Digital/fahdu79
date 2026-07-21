import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator } from 'react-native';
import { responsiveWidth } from 'react-native-responsive-dimensions';
import Verify from '../../../Assets/svg/vvv.svg';
import AnimatedButton from '../../Components/AnimatedButton';
import moment from 'moment';
import { useAppTheme } from '../../Hook/useAppTheme';

// Import icons from CallRequests folder
const CalendarIcon = require('../../../Assets/Images/CallRequests/Calendar.png');
const TimeIcon = require('../../../Assets/Images/CallRequests/Time.png');

const ScheduledTab = ({ data = [], onStartCall, refreshControl, currentUserId, actionLoading, onLoadMore, loadingMore }) => {
  const { colors, isDark } = useAppTheme();
  const styles = getStyles(colors, isDark);
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
              disabledStyle={styles.disabledStartButton}
              textStyle={!isWithinWindow ? { color: '#555555' } : styles.startButtonText}
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
            <Text style={{ fontFamily: 'Rubik-Medium', color: colors.text }}>No scheduled calls</Text>
          </View>
        }
      />
    </View>
  );
};

export default ScheduledTab;

const getStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: responsiveWidth(4),
  },
  card: {
    height: 245,
    backgroundColor: isDark ? '#191919' : '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: isDark ? '#292929' : '#1E1E1E',
    padding: 24,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  initiatorCard: {
    height: 196,
    borderWidth: 1.5,
    borderColor: isDark ? '#292929' : '#1E1E1E',
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
    borderColor: isDark ? '#292929' : '#1E1E1E',
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
    color: colors.text,
  },
  attemptText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 12,
    color: colors.text,
  },
  initiatorSubText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 12,
    lineHeight: 12,
    color: colors.text,
  },
  startingSoonBadge: {
    backgroundColor: isDark ? '#FFA86B15' : '#FFF3EB',
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
    color: colors.accent,
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
    tintColor: colors.text,
  },
  timingText: {
    fontFamily: 'Rubik-Medium',
    fontSize: 14,
    color: colors.text,
    marginRight: 16,
  },
  timeIcon: {
    width: 14,
    height: 14,
    marginRight: 4,
    resizeMode: 'contain',
    tintColor: colors.text,
  },
  durationText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 12,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#1E1E1E30',
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsLabel: {
    fontFamily: 'Rubik-Medium',
    fontSize: 12,
    color: colors.text,
  },
  coinsValue: {
    fontFamily: 'Rubik-Bold',
    fontSize: 16,
    color: colors.text,
  },
  buttonWrapper: {
    width: '100%',
  },
  startButtonStyle: {
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: isDark ? colors.accentBorder : '#1E1E1E',
    height: 46,
    borderRadius: 14,
  },
  disabledStartButton: {
    backgroundColor: isDark ? '#1E1E1E' : '#ffdcc4',
    borderWidth: 1.5,
    borderColor: isDark ? '#292929' : '#1E1E1E',
    opacity: 0.6,
  },
  startButtonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 14,
    color: isDark ? '#1E1E1E' : '#000000',
  },
});
