import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Animated,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { responsiveHeight as rh, responsiveWidth as rw, responsiveFontSize } from 'react-native-responsive-dimensions';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { useUpdateAvailabilityMutation } from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { useSelector } from 'react-redux';
import { LoginPageErrors, CommonSuccess } from '../../Components/ErrorSnacks';
import { CommonActions } from '@react-navigation/native';

// Import Back SVG - adjust path as per your project structure


dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// Constants - matching Figma design
const ITEM_HEIGHT = 36; // 35.99px from Figma
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = 180; // 180px from Figma

// Haptic feedback options
const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

const triggerHaptic = () => {
  ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
};

// Time picker arrays
const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

// Animated Button Component
const AnimatedScheduleButton = ({ onPress, disabled, children, loading }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };
  
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.scheduleButton, (disabled || loading) && styles.scheduleButtonDisabled]}
        onPress={() => {
          triggerHaptic();
          onPress();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          children
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Simple Time Picker Component - No animations for performance
const SimpleScrollPicker = ({ data, selectedIndex, onIndexChange, scrollRef, onScrollStart, onScrollEnd }) => {
  const [localIndex, setLocalIndex] = useState(selectedIndex);
  const [isLayoutComplete, setIsLayoutComplete] = useState(false);
  
  const handleLayout = () => {
    setIsLayoutComplete(true);
  };

  useEffect(() => {
    setLocalIndex(selectedIndex);
  }, [selectedIndex]);
  
  useEffect(() => {
    if (isLayoutComplete && scrollRef.current) {
      scrollRef.current.scrollTo({ 
        y: selectedIndex * ITEM_HEIGHT, 
        animated: false 
      });
    }
  }, [isLayoutComplete, selectedIndex]);
  
  const handleScrollEnd = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
    setLocalIndex(clampedIndex);
    
    if (clampedIndex !== selectedIndex) {
      triggerHaptic();
      onIndexChange(clampedIndex);
    }
  };
  
  const handleItemPress = (index) => {
    scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
    setLocalIndex(index);
    onIndexChange(index);
  };
  
  return (
    <View 
      style={styles.smoothPickerWrapper}
      onTouchStart={onScrollStart}
      onTouchEnd={onScrollEnd}
      onTouchCancel={onScrollEnd}
    >
      <ScrollView
        ref={scrollRef}
        onLayout={handleLayout}
        style={styles.smoothPickerScroll}
        contentContainerStyle={{
          paddingVertical: 72, // Centering padding (2 items height on top/bottom)
        }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        bounces={false}
        nestedScrollEnabled={true}
        scrollEventThrottle={32}
        onMomentumScrollEnd={handleScrollEnd}
      >
        {data.map((item, index) => {
          const isSelected = index === localIndex;
          return (
            <TouchableOpacity
              key={item}
              activeOpacity={0.7}
              onPress={() => handleItemPress(index)}
              style={styles.timeItem}
            >
              <Text style={[
                styles.timeTextSmooth,
                !isSelected && styles.timeTextUnselected
              ]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      
      {/* Visual Overlays */}
      <LinearGradient
        colors={['#FFFFFF', 'rgba(255,255,255,0)']}
        style={styles.topFade}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(255,255,255,0)', '#FFFFFF']}
        style={styles.bottomFade}
        pointerEvents="none"
      />
      
      {/* Selection Center Lines */}
      <View style={styles.selectionIndicator} pointerEvents="none" />
    </View>
  );
};




const ScheduleCallScreen = ({ route, navigation }) => {
  // Assuming these props come from route params
  const {
    userProfileImage = 'https://randomuser.me/api/portraits/women/44.jpg',
    userName = 'Kanchan',
    callDuration = 20,
    callCost = 600,
    requestCreatedAt = new Date().toISOString(),
    roomId,
  } = route?.params || {};

  const token = useSelector(state => state.auth.user.token);
  const [updateAvailability, { isLoading }] = useUpdateAvailabilityMutation();

  // Initialize time picker to current time
  const now = dayjs();
  const currentHour12 = now.hour() % 12 || 12; // Convert 24h to 12h (1-12)
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedHourIndex, setSelectedHourIndex] = useState(currentHour12 - 1); // hours array is 0-indexed ["01"..."12"]
  const [selectedMinuteIndex, setSelectedMinuteIndex] = useState(now.minute());
  const [selectedPeriod, setSelectedPeriod] = useState(now.hour() >= 12 ? 'PM' : 'AM');
  const [outerScrollEnabled, setOuterScrollEnabled] = useState(true);
  const [expiryTimeStr, setExpiryTimeStr] = useState('');



  useEffect(() => {
    const calculateTime = () => {
      const start = dayjs(requestCreatedAt);
      const end = start.add(48, 'hour');
      const now = dayjs();
      
      const diffMs = end.diff(now);
      if (diffMs <= 0) {
        setExpiryTimeStr('EXPIRED');
        return;
      }
      
      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const displayHours = Math.floor(totalMinutes / 60);
      const displayMinutes = totalMinutes % 60;
      
      setExpiryTimeStr(`${displayHours}h ${displayMinutes}m`);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [requestCreatedAt]);
  
  // Refs for scroll views
  const hourScrollRef = useRef(null);
  const minuteScrollRef = useRef(null);
  
  // Callbacks to lock outer scroll when time picker is touched
  const handleTimePickerTouchStart = () => setOuterScrollEnabled(false);
  const handleTimePickerTouchEnd = () => setOuterScrollEnabled(true);

  // Time Selection Validation
  const isTimeInPast = useMemo(() => {
    if (!selectedDate) return false;
    
    // Only validate if TODAY
    if (selectedDate.label !== 'TODAY') return false;

    const hour = parseInt(hours[selectedHourIndex]);
    const minute = parseInt(minutes[selectedMinuteIndex]);
    
    const scheduledDateTime = dayjs(selectedDate.fullDate)
      .hour(
        selectedPeriod === 'PM' && hour !== 12
          ? hour + 12
          : selectedPeriod === 'AM' && hour === 12
          ? 0
          : hour
      )
      .minute(minute);

    return scheduledDateTime.isBefore(dayjs());
  }, [selectedDate, selectedHourIndex, selectedMinuteIndex, selectedPeriod]);

  // Calculate available date slots based on 48-hour window
  const availableDateSlots = useMemo(() => {
    const requestTime = dayjs(requestCreatedAt);
    const now = dayjs();
    const startTime = requestTime.isAfter(now) ? requestTime : now;
    const endTime = requestTime.add(48, 'hour');

    const slots = [];
    let currentDate = startTime.startOf('day');
    const endDate = endTime.endOf('day');

    while (currentDate.isSameOrBefore(endDate, 'day') && slots.length < 6) {
      const dateObj = {
        date: currentDate.date(),
        month: currentDate.format('MMM'),
        day: currentDate.format('ddd'),
        fullDate: currentDate.format('YYYY-MM-DD'),
        label: currentDate.isSame(dayjs(), 'day')
          ? 'TODAY'
          : currentDate.isSame(dayjs().add(1, 'day'), 'day')
          ? 'TOMORROW'
          : currentDate.format('dddd').toUpperCase(),
      };

      if (
        currentDate.isSameOrAfter(startTime, 'day') &&
        currentDate.isSameOrBefore(endTime, 'day')
      ) {
        slots.push(dateObj);
      }

      currentDate = currentDate.add(1, 'day');
    }

    return slots;
  }, [requestCreatedAt]);

  // Auto-select first date on mount
  useEffect(() => {
    if (availableDateSlots.length > 0 && !selectedDate) {
      setSelectedDate(availableDateSlots[0]);
    }
  }, [availableDateSlots]);

  const handleScheduleCall = () => {
    if (!selectedDate || isTimeInPast) return;

    const hour = parseInt(hours[selectedHourIndex]);
    const minute = parseInt(minutes[selectedMinuteIndex]);
    
    const scheduledDateTime = dayjs(selectedDate.fullDate)
      .hour(
        selectedPeriod === 'PM' && hour !== 12
          ? hour + 12
          : selectedPeriod === 'AM' && hour === 12
          ? 0
          : hour
      )
      .minute(minute);

    console.log('Scheduled for:', scheduledDateTime.format('YYYY-MM-DD HH:mm'));

    const payload = {
      roomId: roomId,
      availability: scheduledDateTime.toISOString(),
    };

    updateAvailability({ token, data: payload })
      .unwrap()
      .then(res => {
        console.log('Update Availability Success:', res);
        CommonSuccess(res?.data?.message || res?.message || 'Call scheduled successfully');
        // Remove ScheduleCallScreen from stack and go to CallRequests
        navigation.dispatch(state => {
          const routes = state.routes.filter(r => r.name !== 'ScheduleCallScreen');
          const crIndex = routes.findIndex(r => r.name === 'CallRequests');
          if (crIndex >= 0) {
            routes[crIndex] = { ...routes[crIndex], params: { ...routes[crIndex].params, activeTab: 'scheduled', refresh: true } };
            return CommonActions.reset({ index: crIndex, routes });
          } else {
            routes.push({ name: 'CallRequests', params: { activeTab: 'scheduled', refresh: true } });
            return CommonActions.reset({ index: routes.length - 1, routes });
          }
        });
      })
      .catch(err => {
        console.log('Update Availability Error:', err);
        LoginPageErrors(err?.data?.message || err?.message || 'Failed to schedule call');
      });
  };

  const renderDateBox = (slot, index) => {
    const isSelected = selectedDate?.fullDate === slot.fullDate;
    const isBottomRow = index >= 3;
    // 🔧 If there are only 1 or 2 slots, both should be large (side-by-side)
    const isLarge = isBottomRow || availableDateSlots.length <= 2;
    const isLastAvailableDay = index === availableDateSlots.length - 1;
    const badgeText = isLastAvailableDay ? `Till: 11:00 PM` : 'Available';
    
    return (
      <TouchableOpacity
        key={slot.fullDate}
        style={[
          styles.dateBox, 
          isSelected && styles.dateBoxSelected,
          isLarge && styles.dateBoxLarge
        ]}
        onPress={() => {
          triggerHaptic();
          setSelectedDate(slot);
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.dateLabel, isSelected && styles.dateLabelSelected]} numberOfLines={1} adjustsFontSizeToFit>
          {slot.label}
        </Text>
        <Text style={[styles.dateMonth, isSelected && styles.dateMonthSelected]} numberOfLines={1} adjustsFontSizeToFit>
          {slot.month} {slot.date}
        </Text>
        <View style={[styles.availableBadge, isSelected && styles.availableBadgeSelected]}>
          <Text style={[styles.availableText, isSelected && styles.availableTextSelected]} numberOfLines={1}>
            {badgeText}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const getScheduledDateTimeString = () => {
    if (!selectedDate) return 'Select a date to schedule';
    if (isTimeInPast) return 'Please select a future time';
    
    const dateStr = dayjs(selectedDate.fullDate).format('MMM DD').toUpperCase();
    return `Scheduled for ${dateStr}, ${hours[selectedHourIndex]}:${minutes[selectedMinuteIndex]} ${selectedPeriod}`;
  };

  return (
    <SafeAreaView style={styles.container}>


      {/* Header */}


      <ScrollView 
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={outerScrollEnabled}
      >
        {/* User Info Card */}
        <View style={styles.userCard}>
          <Image
            source={{ uri: userProfileImage }}
            style={styles.userImage}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.callDetails}>
              Audio call • {callDuration} min • {callCost} coins
            </Text>
          </View>
        </View>

        {/* Select Date Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Select Date</Text>
              <Text style={styles.sectionSubtitle}>Select one of the available windows</Text>
            </View>
            <View style={styles.expiresContainer}>
              <Text style={styles.expiresLabel}>Expires</Text>
              <Text style={[
                styles.expiresTime,
                expiryTimeStr === 'EXPIRED' && { color: '#FF5353' }
              ]} numberOfLines={1} adjustsFontSizeToFit>
                {expiryTimeStr || '--h --m'}
              </Text>
            </View>
          </View>

          {/* Date Grid */}
          <View style={styles.dateGrid}>
            {availableDateSlots.slice(0, 3).map((slot, index) => renderDateBox(slot, index))}
          </View>
          
          {availableDateSlots.length > 3 && (
            <View style={styles.dateGridBottom}>
              {availableDateSlots.slice(3, 5).map((slot, index) => renderDateBox(slot, index + 3))}
            </View>
          )}
        </View>

        {/* Set Start Time Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Set Start Time</Text>
          
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerWrapper}>
              {/* Hours Picker */}
              <SimpleScrollPicker
                data={hours}
                selectedIndex={selectedHourIndex}
                onIndexChange={setSelectedHourIndex}
                scrollRef={hourScrollRef}
                onScrollStart={handleTimePickerTouchStart}
                onScrollEnd={handleTimePickerTouchEnd}
              />

              <Text style={styles.timeSeparator}>:</Text>

              {/* Minutes Picker */}
              <SimpleScrollPicker
                data={minutes}
                selectedIndex={selectedMinuteIndex}
                onIndexChange={setSelectedMinuteIndex}
                scrollRef={minuteScrollRef}
                onScrollStart={handleTimePickerTouchStart}
                onScrollEnd={handleTimePickerTouchEnd}
              />

              {/* AM/PM Toggle */}
              <View style={styles.periodContainer}>
                <TouchableOpacity
                  style={[
                    styles.periodButton,
                    selectedPeriod === 'AM' && styles.periodButtonSelected,
                  ]}
                  onPress={() => {
                    triggerHaptic();
                    setSelectedPeriod('AM');
                  }}
                >
                  <Text
                    style={[
                      styles.periodText,
                      selectedPeriod === 'AM' && styles.periodTextSelected,
                    ]}
                  >
                    AM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.periodButton,
                    selectedPeriod === 'PM' && styles.periodButtonSelected,
                  ]}
                  onPress={() => {
                    triggerHaptic();
                    setSelectedPeriod('PM');
                  }}
                >
                  <Text
                    style={[
                      styles.periodText,
                      selectedPeriod === 'PM' && styles.periodTextSelected,
                    ]}
                  >
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Scheduled Info Badge */}
        <View style={[styles.scheduledInfo, isTimeInPast && styles.scheduledInfoError]}>
          <Text style={[styles.scheduledText, isTimeInPast && styles.scheduledTextError]}>
            {getScheduledDateTimeString()}
          </Text>
        </View>

        {/* Schedule Call Button */}
        <AnimatedScheduleButton 
          onPress={handleScheduleCall}
          disabled={!selectedDate || isTimeInPast || expiryTimeStr === 'EXPIRED'}
          loading={isLoading}
        >
          <Text style={styles.scheduleButtonText}>Schedule & Call</Text>
        </AnimatedScheduleButton>
        
        <View style={{ height: rh(3) }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff9f5',
  },

  userCard: {
    // width: 344, // Removed fixed width
    // height: 102, // Removed fixed height to allow content to dictate or stay flexible
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch', // Fill available width
    marginHorizontal: 20, // Add side margins
    marginTop: rh(1),
    marginBottom: rh(3),
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#1E1E1E',
    gap: 20,
  },
  userImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#000000',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontFamily: 'Rubik-Bold',
    color: '#1E1E1E',
    marginBottom: 2,
  },
  callDetails: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    color: '#1E1E1E',
  },
  section: {
    paddingHorizontal: rw(5),
    marginBottom: rh(3),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: rh(2),
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Rubik-SemiBold',
    color: '#101828',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
    color: '#1E1E1E',
    marginTop: 4,
  },
  expiresContainer: {
    backgroundColor: '#FFF3EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 49,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 6,
    // width: 102, // Removed fixed width to prevent text wrapping
    minWidth: 102, // Use minWidth instead
    height: 50,
  },
  expiresLabel: {
    fontSize: 10,
    fontFamily: 'Rubik-Medium',
    color: '#1E1E1E',
    lineHeight: 10,
  },
  expiresTime: {
    fontSize: 14,
    fontFamily: 'Rubik-Bold',
    color: '#1E1E1E',
    lineHeight: 14,
  },
  dateGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: rh(2),
  },
  dateGridBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: rh(2),
  },
  dateBox: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 16,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    height: 122,
  },
  dateBoxLarge: {
    flex: 0,
    width: '48%',
    marginHorizontal: 0,
  },
  dateBoxSelected: {
    backgroundColor: '#ffa86b',
    borderColor: '#1E1E1E',
  },
  dateLabel: {
    fontSize: 10,
    fontFamily: 'Rubik-SemiBold',
    color: '#1E1E1E',
    marginBottom: 6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  dateLabelSelected: {
    color: '#1E1E1E',
  },
  dateMonth: {
    fontSize: 18,
    fontFamily: 'Rubik-Bold',
    color: '#1E1E1E',
    marginBottom: 10,
    textAlign: 'center',
  },
  dateMonthSelected: {
    color: '#1E1E1E',
  },
  availableBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  availableBadgeSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#1E1E1E',
  },
  availableText: {
    fontSize: 9,
    fontFamily: 'Rubik-SemiBold',
    color: '#1E1E1E',
    textAlign: 'center',
  },
  availableTextSelected: {
    color: '#1E1E1E',
  },
  timePickerContainer: {
    marginTop: rh(2),
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#1E1E1E',
    padding: 32.5,
  },
  timePickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smoothPickerWrapper: {
    position: 'relative',
    height: 180,
    width: 70,
    overflow: 'hidden',
  },
  smoothPickerScroll: {
    height: 180,
  },
  timeItem: {
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
  },
  timeTextSmooth: {
    fontSize: 28,
    fontFamily: 'Rubik-Bold',
    color: '#1E1E1E',
    lineHeight: 30,
  },
  timeTextUnselected: {
    fontSize: 20,
    fontFamily: 'Rubik-Regular',
    color: 'rgba(30, 30, 30, 0.29)',
  },
  timeSeparator: {
    fontSize: 32,
    fontFamily: 'Rubik-SemiBold',
    color: '#101828',
    marginHorizontal: 8,
    lineHeight: 48,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 72, // 2 items
    zIndex: 1,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72, // 2 items
    zIndex: 1,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 72, // 2 items from top
    left: 0,
    right: 0,
    height: 36,
    borderTopWidth: 0.53,
    borderBottomWidth: 0.53,
    borderColor: '#E5E7EB',
    zIndex: 0,
  },
  periodContainer: {
    marginLeft: 24,
    gap: 8,
  },
  periodButton: {
    width: 47,
    height: 31,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 17801400, // large border radius for pill shape
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  periodButtonSelected: {
    backgroundColor: '#FFA86B',
    borderColor: '#1E1E1E',
  },
  periodText: {
    fontSize: 12,
    fontFamily: 'Rubik-SemiBold',
    color: '#1E1E1E',
    textAlign: 'center',
    lineHeight: 18,
  },
  periodTextSelected: {
    color: '#1E1E1E',
  },
  scheduledInfo: {
    marginHorizontal: 24,
    marginBottom: 20,
    paddingVertical: 20,
    paddingHorizontal: 50,
    backgroundColor: 'rgba(255, 168, 107, 0.21)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFA86B',
    alignItems: 'center',
  },
  scheduledText: {
    fontSize: 12,
    fontFamily: 'Rubik-SemiBold',
    color: '#1E1E1E',
    textAlign: 'center',
    lineHeight: 14, // Adjusted slightly for safety
  },
  scheduledInfoError: {
    backgroundColor: 'rgba(255, 83, 83, 0.1)',
    borderColor: '#FF5353',
  },
  scheduledTextError: {
    color: '#FF5353',
  },
  scheduleButton: {
    marginHorizontal: rw(5),
    backgroundColor: '#ffa86b',
    paddingVertical: rh(2),
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E1E1E',
    alignItems: 'center',
  },
  scheduleButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  scheduleButtonText: {
    fontSize: 16,
    fontFamily: 'Rubik-SemiBold',
    color: '#1E1E1E',
  },

});

export default ScheduleCallScreen;